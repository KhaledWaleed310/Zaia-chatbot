"""Webhook endpoint for Facebook Messenger events."""
from fastapi import APIRouter, Request, HTTPException, Response
from fastapi.responses import PlainTextResponse
from datetime import datetime
import uuid
import logging
import asyncio

from ..core.database import get_mongodb
from ..core.config import settings
from ..services.messenger import messenger_service
from ..services.retrieval import triple_retrieval
from ..services.llm import generate_response
from ..services.limits import check_message_limit
from ..services.analytics import detect_unanswered_question, analyze_sentiment

# Enhanced RAG services
try:
    from ..services.enhanced_retrieval import enhanced_triple_retrieval
    from ..services.enhanced_llm import generate_enhanced_response
    ENHANCED_RAG_AVAILABLE = True
except ImportError:
    ENHANCED_RAG_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["Webhook"])


@router.get("/messenger")
async def verify_webhook(
    request: Request,
):
    """
    Webhook verification endpoint for Facebook.
    Facebook sends a GET request with hub.mode, hub.verify_token, and hub.challenge.
    """
    params = request.query_params

    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if not all([mode, token, challenge]):
        raise HTTPException(status_code=400, detail="Missing verification parameters")

    result = messenger_service.verify_webhook_challenge(mode, token, challenge)

    if result:
        logger.info("Messenger webhook verified successfully")
        return PlainTextResponse(content=challenge)

    logger.warning(f"Messenger webhook verification failed")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/messenger")
async def receive_webhook(request: Request):
    """
    Receive and process incoming Messenger events.
    """
    # Get raw body for signature verification
    body = await request.body()

    # Verify signature
    signature = request.headers.get("X-Hub-Signature-256")
    if signature and not messenger_service.validate_webhook_signature(body, signature):
        logger.warning("Invalid webhook signature")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        data = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook JSON: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Parse events
    events = messenger_service.parse_webhook_event(data)

    # Process events asynchronously
    for event in events:
        if event["event_type"] == "message" and not event["data"].get("is_echo"):
            # Don't block the webhook response - process in background
            asyncio.create_task(process_incoming_message(event))

    # Always return 200 quickly to acknowledge receipt
    return Response(status_code=200, content="EVENT_RECEIVED")


async def process_incoming_message(event: dict):
    """
    Process an incoming message and send a response.
    """
    try:
        page_id = event["page_id"]
        sender_id = event["sender_id"]
        message_text = event["data"].get("text", "")

        if not message_text:
            # Skip non-text messages for now
            logger.info(f"Skipping non-text message from {sender_id}")
            return

        db = get_mongodb()

        # Find the bot connected to this page
        connection = await db.messenger_connections.find_one({
            "page_id": page_id,
            "enabled": True,
            "status": "connected",
        })

        if not connection:
            logger.warning(f"No active connection found for page {page_id}")
            return

        bot_id = connection["bot_id"]
        tenant_id = connection["tenant_id"]

        # Get bot configuration
        bot = await db.chatbots.find_one({"_id": bot_id})
        if not bot:
            logger.error(f"Bot {bot_id} not found for page {page_id}")
            return

        # Get page access token
        page_token = messenger_service.decrypt_access_token(connection["page_access_token"])

        # Send typing indicator
        await messenger_service.send_typing_indicator(page_token, sender_id)

        # Check message limit
        try:
            await check_message_limit(tenant_id)
        except HTTPException:
            await messenger_service.send_message(
                page_token,
                sender_id,
                "Sorry, we've reached our message limit. Please try again later."
            )
            return

        # Get or create session for this sender
        session_id = f"messenger_{page_id}_{sender_id}"

        # Get conversation history
        conversation = await db.conversations.find_one({
            "session_id": session_id,
            "bot_id": bot_id,
        })

        history = []
        if conversation and "messages" in conversation:
            # Get last 10 messages for context
            for msg in conversation.get("messages", [])[-10:]:
                if msg.get("role") in ["user", "assistant"]:
                    history.append({
                        "role": msg["role"],
                        "content": msg.get("content", "")
                    })

        # Retrieve relevant context
        try:
            if ENHANCED_RAG_AVAILABLE:
                context_chunks = await enhanced_triple_retrieval(
                    query=message_text,
                    bot_id=bot_id,
                    tenant_id=tenant_id,
                    top_k=5
                )
            else:
                context_chunks = await triple_retrieval(
                    query=message_text,
                    bot_id=bot_id,
                    tenant_id=tenant_id,
                    top_k=5
                )
        except Exception as e:
            logger.error(f"Retrieval error: {e}")
            context_chunks = []

        # Prepare context for LLM
        context_text = "\n\n".join([
            chunk.get("content", chunk.get("text", ""))
            for chunk in context_chunks
            if chunk
        ])

        # Generate response
        try:
            if ENHANCED_RAG_AVAILABLE:
                response_text = await generate_enhanced_response(
                    query=message_text,
                    context=context_text,
                    history=history,
                    system_prompt=bot.get("system_prompt"),
                    bot_name=bot.get("name", "Assistant"),
                )
            else:
                response_text = await generate_response(
                    query=message_text,
                    context=context_text,
                    history=history,
                    system_prompt=bot.get("system_prompt"),
                    bot_name=bot.get("name", "Assistant"),
                )
        except Exception as e:
            logger.error(f"LLM error: {e}")
            response_text = "I'm sorry, I'm having trouble processing your request right now. Please try again later."

        # Send response to Messenger
        try:
            await messenger_service.send_message(page_token, sender_id, response_text)
        except Exception as e:
            logger.error(f"Failed to send Messenger response: {e}")
            return

        # Save conversation
        now = datetime.utcnow()

        user_message = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": message_text,
            "timestamp": now,
            "source": "messenger",
        }

        assistant_message = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": response_text,
            "timestamp": now,
            "source": "messenger",
        }

        if conversation:
            await db.conversations.update_one(
                {"_id": conversation["_id"]},
                {
                    "$push": {"messages": {"$each": [user_message, assistant_message]}},
                    "$set": {"updated_at": now}
                }
            )
        else:
            await db.conversations.insert_one({
                "_id": str(uuid.uuid4()),
                "session_id": session_id,
                "bot_id": bot_id,
                "tenant_id": tenant_id,
                "source": "messenger",
                "messenger_sender_id": sender_id,
                "messenger_page_id": page_id,
                "messages": [user_message, assistant_message],
                "created_at": now,
                "updated_at": now,
            })

        # Update message count
        await db.messenger_connections.update_one(
            {"_id": connection["_id"]},
            {
                "$inc": {"message_count": 1},
                "$set": {"last_message_at": now}
            }
        )

        # Track analytics
        try:
            sentiment = analyze_sentiment(message_text)
            is_unanswered = detect_unanswered_question(response_text, context_chunks)

            await db.analytics.insert_one({
                "_id": str(uuid.uuid4()),
                "bot_id": bot_id,
                "tenant_id": tenant_id,
                "session_id": session_id,
                "source": "messenger",
                "query": message_text,
                "response_length": len(response_text),
                "context_used": len(context_chunks) > 0,
                "sentiment": sentiment,
                "is_unanswered": is_unanswered,
                "created_at": now,
            })
        except Exception as e:
            logger.warning(f"Analytics tracking failed: {e}")

        logger.info(f"Processed Messenger message from {sender_id} to bot {bot_id}")

    except Exception as e:
        logger.exception(f"Error processing Messenger message: {e}")


@router.post("/facebook-data-deletion")
async def facebook_data_deletion_callback(request: Request):
    """
    Facebook Data Deletion Callback.

    This endpoint handles user data deletion requests from Facebook.
    Required for Facebook/Messenger app verification.

    Facebook sends a POST request with a signed_request containing user_id.
    We must delete all data associated with that user and return a confirmation URL.
    """
    import hashlib
    import hmac
    import base64
    import json

    try:
        form_data = await request.form()
        signed_request = form_data.get("signed_request")

        if not signed_request:
            raise HTTPException(status_code=400, detail="Missing signed_request")

        # Parse the signed request
        parts = signed_request.split(".")
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid signed_request format")

        encoded_sig, payload = parts

        # Decode the payload
        # Add padding if needed
        payload += "=" * (4 - len(payload) % 4)
        decoded_payload = base64.urlsafe_b64decode(payload)
        data = json.loads(decoded_payload)

        user_id = data.get("user_id")

        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id in request")

        logger.info(f"Facebook data deletion request for user: {user_id}")

        db = get_mongodb()

        # Delete all conversations from this Facebook user
        result = await db.conversations.delete_many({
            "messenger_sender_id": user_id
        })
        logger.info(f"Deleted {result.deleted_count} conversations for FB user {user_id}")

        # Delete any user profiles linked to this Facebook user
        await db.user_profiles.delete_many({
            "facebook_id": user_id
        })

        # Generate a confirmation code
        confirmation_code = str(uuid.uuid4())[:8].upper()

        # Store deletion record for compliance
        await db.data_deletion_requests.insert_one({
            "_id": str(uuid.uuid4()),
            "platform": "facebook",
            "platform_user_id": user_id,
            "confirmation_code": confirmation_code,
            "status": "completed",
            "conversations_deleted": result.deleted_count,
            "requested_at": datetime.utcnow(),
            "completed_at": datetime.utcnow(),
        })

        # Return the required response format for Facebook
        # url: A URL where the user can check the status of their deletion request
        # confirmation_code: A unique code to identify the deletion request
        return {
            "url": f"https://aidenlink.cloud/data-deletion-status?code={confirmation_code}",
            "confirmation_code": confirmation_code
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error processing Facebook data deletion: {e}")
        raise HTTPException(status_code=500, detail="Failed to process deletion request")
