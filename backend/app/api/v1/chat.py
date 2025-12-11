from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import StreamingResponse
from typing import Optional
from bson import ObjectId
from datetime import datetime
import json
import asyncio
import structlog

from ...models import MessageCreate, Message, MessageRole, Conversation, SourceReference, ChatbotConfig
from ...dependencies import get_mongo_db
from ...retrieval.retriever import TripleRetriever
from ...llm.generator import ResponseGenerator

logger = structlog.get_logger()
router = APIRouter(prefix="/chat")

# Initialize services
retriever = TripleRetriever()
generator = ResponseGenerator()


async def validate_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db=Depends(get_mongo_db)
) -> tuple:
    """Validate the API key and return tenant_id and chatbot."""
    if not x_api_key.startswith("ek_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format"
        )

    # Find chatbot by embed key
    bot = await db.chatbots.find_one({"embed_key": x_api_key})
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    if not bot.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chatbot is disabled"
        )

    return bot["tenant_id"], bot


@router.post("/{bot_id}/message")
async def send_message(
    bot_id: str,
    message_data: MessageCreate,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db=Depends(get_mongo_db)
):
    """Send a message to the chatbot and get a response."""
    # Validate API key and get chatbot
    tenant_id, bot = await validate_api_key(x_api_key, db)

    # Verify bot_id matches
    if str(bot["_id"]) != bot_id:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get or create session
    session_id = message_data.session_id or f"sess_{ObjectId()}"

    # Get conversation history
    conversation = await db.conversations.find_one({
        "bot_id": bot_id,
        "session_id": session_id,
        "tenant_id": tenant_id
    })

    conversation_history = []
    if conversation:
        for msg in conversation.get("messages", [])[-10:]:  # Last 10 messages
            conversation_history.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # Get chatbot config
    config = ChatbotConfig(**bot.get("config", {}))
    kb_ids = bot.get("kb_ids", [])

    if not kb_ids:
        # No knowledge bases configured
        response_text = "I'm sorry, but I don't have any knowledge base configured yet. Please contact the administrator."
        sources = []
    else:
        # Retrieve relevant context
        try:
            retrieval_results = await retriever.retrieve(
                tenant_id=tenant_id,
                query=message_data.message,
                kb_ids=kb_ids,
                top_k=5
            )
        except Exception as e:
            logger.error("Retrieval error", error=str(e))
            retrieval_results = []

        # Generate response
        try:
            response = await generator.generate(
                query=message_data.message,
                context_chunks=retrieval_results,
                chatbot_config=config,
                conversation_history=conversation_history
            )
            response_text = response["answer"]
            sources = [
                SourceReference(
                    text=s.text[:300],
                    kb_id=s.metadata.get("kb_id", ""),
                    chunk_id=s.chunk_id,
                    source_type=s.source,
                    score=s.score,
                    metadata=s.metadata
                )
                for s in retrieval_results[:3]
            ]
        except Exception as e:
            logger.error("Generation error", error=str(e))
            response_text = "I'm sorry, I encountered an error processing your request. Please try again."
            sources = []

    # Create user message
    user_message = Message(
        id=str(ObjectId()),
        role=MessageRole.USER,
        content=message_data.message,
        timestamp=datetime.utcnow()
    )

    # Create assistant message
    assistant_message = Message(
        id=str(ObjectId()),
        role=MessageRole.ASSISTANT,
        content=response_text,
        sources=sources,
        timestamp=datetime.utcnow()
    )

    # Save conversation
    if conversation:
        await db.conversations.update_one(
            {"_id": conversation["_id"]},
            {
                "$push": {"messages": {"$each": [
                    user_message.model_dump(),
                    assistant_message.model_dump()
                ]}},
                "$set": {"updated_at": datetime.utcnow()},
                "$inc": {"total_messages": 2}
            }
        )
    else:
        new_conversation = {
            "tenant_id": tenant_id,
            "bot_id": bot_id,
            "session_id": session_id,
            "messages": [user_message.model_dump(), assistant_message.model_dump()],
            "metadata": {},
            "total_messages": 2,
            "has_feedback": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.conversations.insert_one(new_conversation)

    # Update chatbot stats
    await db.chatbots.update_one(
        {"_id": bot["_id"]},
        {"$inc": {"total_messages": 2, "total_conversations": 0 if conversation else 1}}
    )

    return {
        "session_id": session_id,
        "message": assistant_message.model_dump(),
        "sources": [s.model_dump() for s in sources] if config.show_sources else []
    }


@router.post("/{bot_id}/message/stream")
async def send_message_stream(
    bot_id: str,
    message_data: MessageCreate,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db=Depends(get_mongo_db)
):
    """Send a message and stream the response."""
    # Validate API key and get chatbot
    tenant_id, bot = await validate_api_key(x_api_key, db)

    if str(bot["_id"]) != bot_id:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    config = ChatbotConfig(**bot.get("config", {}))
    kb_ids = bot.get("kb_ids", [])
    session_id = message_data.session_id or f"sess_{ObjectId()}"

    async def generate_stream():
        try:
            # Retrieve context
            retrieval_results = await retriever.retrieve(
                tenant_id=tenant_id,
                query=message_data.message,
                kb_ids=kb_ids,
                top_k=5
            ) if kb_ids else []

            # Stream response
            async for chunk in generator.generate_stream(
                query=message_data.message,
                context_chunks=retrieval_results,
                chatbot_config=config
            ):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            # Send sources at the end
            sources = [
                {
                    "text": r.text[:300],
                    "source_type": r.source,
                    "score": r.score
                }
                for r in retrieval_results[:3]
            ]
            yield f"data: {json.dumps({'sources': sources, 'done': True})}\n\n"

        except Exception as e:
            logger.error("Streaming error", error=str(e))
            yield f"data: {json.dumps({'error': 'An error occurred'})}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream"
    )


@router.get("/{bot_id}/history/{session_id}")
async def get_chat_history(
    bot_id: str,
    session_id: str,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db=Depends(get_mongo_db)
):
    """Get chat history for a session."""
    tenant_id, bot = await validate_api_key(x_api_key, db)

    if str(bot["_id"]) != bot_id:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    conversation = await db.conversations.find_one({
        "bot_id": bot_id,
        "session_id": session_id,
        "tenant_id": tenant_id
    })

    if not conversation:
        return {"session_id": session_id, "messages": []}

    return {
        "session_id": session_id,
        "messages": conversation.get("messages", [])
    }


@router.post("/{bot_id}/feedback/{message_id}")
async def submit_feedback(
    bot_id: str,
    message_id: str,
    feedback: str,  # "positive" or "negative"
    x_api_key: str = Header(..., alias="X-API-Key"),
    session_id: str = Header(..., alias="X-Session-Id"),
    db=Depends(get_mongo_db)
):
    """Submit feedback for a message."""
    tenant_id, bot = await validate_api_key(x_api_key, db)

    if str(bot["_id"]) != bot_id:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if feedback not in ["positive", "negative"]:
        raise HTTPException(status_code=400, detail="Invalid feedback value")

    result = await db.conversations.update_one(
        {
            "bot_id": bot_id,
            "session_id": session_id,
            "tenant_id": tenant_id,
            "messages.id": message_id
        },
        {
            "$set": {
                "messages.$.feedback": feedback,
                "has_feedback": True
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"status": "feedback recorded"}
