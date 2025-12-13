from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import uuid
import json
from ..schemas.chat import ChatMessage, ChatResponse, AnalyticsResponse
from ..core.database import get_mongodb
from ..services.retrieval import triple_retrieval
from ..services.llm import generate_response, generate_response_stream
from ..services.limits import check_message_limit
from ..services.analytics import (
    detect_unanswered_question,
    analyze_sentiment,
    calculate_quality_score,
    track_usage_realtime
)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/{bot_id}/message", response_model=ChatResponse)
async def send_message(bot_id: str, message: ChatMessage):
    """Send a message to the chatbot and get a response."""
    db = get_mongodb()

    # Get chatbot
    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    tenant_id = bot["tenant_id"]

    # Check message limit for the tenant
    await check_message_limit(tenant_id)

    # Get or create session
    session_id = message.session_id or str(uuid.uuid4())

    # Get conversation history
    conversation = await db.conversations.find_one({
        "session_id": session_id,
        "bot_id": bot_id
    })

    history = []
    if conversation:
        history = conversation.get("messages", [])[-10:]  # Last 10 messages

    # Retrieve relevant context using triple retrieval
    context = await triple_retrieval(
        query=message.message,
        tenant_id=tenant_id,
        bot_id=bot_id,
        top_k=5
    )

    # Generate response
    response_text = await generate_response(
        query=message.message,
        context=context,
        system_prompt=bot.get("system_prompt", "You are a helpful assistant."),
        conversation_history=history,
        tenant_id=tenant_id,
        bot_id=bot_id,
        session_id=session_id
    )

    # Analyze sentiment of user message
    user_sentiment = await analyze_sentiment(message.message)

    # Calculate quality score for the response
    quality_score = await calculate_quality_score(
        query=message.message,
        response=response_text,
        context=context
    )

    # Detect if this was an unanswered question
    await detect_unanswered_question(
        query=message.message,
        response=response_text,
        context=context,
        tenant_id=tenant_id,
        bot_id=bot_id,
        session_id=session_id
    )

    # Track real-time usage
    await track_usage_realtime(bot_id, session_id)

    # Store messages with analytics data
    user_msg = {
        "role": "user",
        "content": message.message,
        "timestamp": datetime.utcnow(),
        "sentiment": user_sentiment
    }

    assistant_msg = {
        "role": "assistant",
        "content": response_text,
        "timestamp": datetime.utcnow(),
        "quality_score": quality_score,
        "query": message.message  # Store the original query for quality analysis
    }

    # Update conversation
    if conversation:
        await db.conversations.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    else:
        await db.conversations.insert_one({
            "_id": str(uuid.uuid4()),
            "session_id": session_id,
            "bot_id": bot_id,
            "tenant_id": tenant_id,
            "messages": [user_msg, assistant_msg],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

    # Store individual messages for analytics
    await db.messages.insert_many([
        {
            "_id": str(uuid.uuid4()),
            "session_id": session_id,
            "bot_id": bot_id,
            "tenant_id": tenant_id,
            **user_msg
        },
        {
            "_id": str(uuid.uuid4()),
            "session_id": session_id,
            "bot_id": bot_id,
            "tenant_id": tenant_id,
            **assistant_msg
        }
    ])

    # Format sources
    sources = [
        {
            "content": c["content"][:200] + "..." if len(c["content"]) > 200 else c["content"],
            "source": c["source"],
            "score": c.get("fused_score", c.get("score", 0))
        }
        for c in context
    ]

    return ChatResponse(
        response=response_text,
        session_id=session_id,
        sources=sources
    )


@router.post("/{bot_id}/message/stream")
async def send_message_stream(bot_id: str, message: ChatMessage):
    """Send a message and stream the response."""
    db = get_mongodb()

    # Get chatbot
    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    tenant_id = bot["tenant_id"]

    # Check message limit for the tenant
    await check_message_limit(tenant_id)

    session_id = message.session_id or str(uuid.uuid4())

    # Get conversation history
    conversation = await db.conversations.find_one({
        "session_id": session_id,
        "bot_id": bot_id
    })

    history = []
    if conversation:
        history = conversation.get("messages", [])[-10:]

    # Retrieve context
    context = await triple_retrieval(
        query=message.message,
        tenant_id=tenant_id,
        bot_id=bot_id,
        top_k=5
    )

    async def generate():
        full_response = ""

        # Send session_id first
        yield f"data: {json.dumps({'session_id': session_id})}\n\n"

        async for chunk in generate_response_stream(
            query=message.message,
            context=context,
            system_prompt=bot.get("system_prompt", "You are a helpful assistant."),
            conversation_history=history,
            tenant_id=tenant_id,
            bot_id=bot_id,
            session_id=session_id
        ):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        # Store messages after streaming completes
        user_msg = {
            "role": "user",
            "content": message.message,
            "timestamp": datetime.utcnow().isoformat()
        }

        assistant_msg = {
            "role": "assistant",
            "content": full_response,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Send sources
        sources = [
            {
                "content": c["content"][:200],
                "source": c["source"]
            }
            for c in context
        ]
        yield f"data: {json.dumps({'sources': sources})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/{bot_id}/config")
async def get_bot_config(bot_id: str):
    """Get chatbot configuration for widget."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    return {
        "name": bot["name"],
        "welcome_message": bot.get("welcome_message", "Hello! How can I help you?"),
        "primary_color": bot.get("primary_color", "#3B82F6"),
        "text_color": bot.get("text_color", "#FFFFFF"),
        "position": bot.get("position", "bottom-right")
    }


@router.get("/{bot_id}/analytics", response_model=AnalyticsResponse)
async def get_analytics(bot_id: str, tenant_id: str):
    """Get chatbot analytics. Requires tenant_id for auth."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": tenant_id
    })

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get stats
    total_conversations = await db.conversations.count_documents({
        "bot_id": bot_id,
        "tenant_id": tenant_id
    })

    total_messages = await db.messages.count_documents({
        "bot_id": bot_id,
        "tenant_id": tenant_id
    })

    avg_messages = total_messages / total_conversations if total_conversations > 0 else 0

    # Get daily usage (last 7 days)
    from datetime import timedelta
    daily_usage = []
    for i in range(7):
        date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        next_date = date + timedelta(days=1)

        count = await db.messages.count_documents({
            "bot_id": bot_id,
            "tenant_id": tenant_id,
            "timestamp": {"$gte": date, "$lt": next_date}
        })

        daily_usage.append({
            "date": date.isoformat(),
            "messages": count
        })

    return AnalyticsResponse(
        total_conversations=total_conversations,
        total_messages=total_messages,
        avg_messages_per_conversation=avg_messages,
        popular_topics=[],  # Would need NLP analysis
        daily_usage=daily_usage
    )
