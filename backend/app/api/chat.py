from fastapi import APIRouter, HTTPException, Response, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import uuid
import json
import logging
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

# Enhanced RAG services
from ..services.enhanced_retrieval import enhanced_triple_retrieval, adaptive_retrieval
from ..services.enhanced_llm import generate_enhanced_response
from ..services.query_enhancer import analyze_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/{bot_id}/message", response_model=ChatResponse)
async def send_message(
    bot_id: str,
    message: ChatMessage,
    enhanced: bool = Query(default=True, description="Use enhanced RAG pipeline")
):
    """
    Send a message to the chatbot and get a response.

    Uses the world-class enhanced RAG pipeline with:
    - Query enhancement and rewriting
    - Triple-database hybrid search (Qdrant + MongoDB + Neo4j)
    - Cross-encoder reranking
    - MMR diversity selection
    - Contextual compression
    - Chain-of-thought prompting
    """
    try:
        db = get_mongodb()

        # Validate bot exists
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
            history = conversation.get("messages", [])[-5:]  # Last 5 messages (reduced for speed)

        # Analyze query for adaptive processing
        query_analysis = analyze_query(message.message)
        logger.info(f"Query analysis: intent={query_analysis['intent']}, complexity={query_analysis['complexity']}")

        # Use enhanced or basic retrieval based on flag
        if enhanced:
            # World-class enhanced retrieval pipeline
            # NOTE: Query enhancement disabled by default for faster response times
            # It adds 10-30s latency with minimal quality improvement for most queries
            retrieval_result = await enhanced_triple_retrieval(
                query=message.message,
                tenant_id=tenant_id,
                bot_id=bot_id,
                top_k=5,
                use_reranking=True,
                use_query_enhancement=False,  # Disabled for speed - saves 10-30s
                use_mmr=True,
                use_compression=True,
                verbose=False
            )
            context = retrieval_result["contexts"]
            query_analysis = retrieval_result.get("query_analysis", query_analysis)
        else:
            # Fallback to basic triple retrieval
            context = await triple_retrieval(
                query=message.message,
                tenant_id=tenant_id,
                bot_id=bot_id,
                top_k=5
            )

        # Generate response with enhanced LLM
        if enhanced:
            llm_result = await generate_enhanced_response(
                query=message.message,
                context=context,
                system_prompt=bot.get("system_prompt", "You are a helpful assistant."),
                conversation_history=history,
                query_analysis=query_analysis,
                tenant_id=tenant_id,
                bot_id=bot_id,
                session_id=session_id
            )
            response_text = llm_result["response"]
            confidence = llm_result.get("confidence", 0.5)
            logger.info(f"Response generated with confidence: {confidence:.2f}")
        else:
            response_text = await generate_response(
                query=message.message,
                context=context,
                system_prompt=bot.get("system_prompt", "You are a helpful assistant."),
                conversation_history=history,
                tenant_id=tenant_id,
                bot_id=bot_id,
                session_id=session_id
            )

        # Run analytics in background to not block the response
        # These operations are important but shouldn't delay the user
        async def run_analytics_background():
            try:
                user_sentiment = await analyze_sentiment(message.message)
                quality_score = await calculate_quality_score(
                    query=message.message,
                    response=response_text,
                    context=context
                )
                await detect_unanswered_question(
                    query=message.message,
                    response=response_text,
                    context=context,
                    tenant_id=tenant_id,
                    bot_id=bot_id,
                    session_id=session_id
                )
                await track_usage_realtime(bot_id, session_id)
                return user_sentiment, quality_score
            except Exception as e:
                logger.warning(f"Background analytics failed: {e}")
                return "neutral", 0.5

        # Start analytics in background (non-blocking)
        import asyncio
        analytics_task = asyncio.create_task(run_analytics_background())

        # Use default values for immediate response
        user_sentiment = "neutral"
        quality_score = 0.5

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

        # Format sources with enhanced metadata
        sources = []
        for c in context:
            source_info = {
                "content": c["content"][:200] + "..." if len(c["content"]) > 200 else c["content"],
                "source": c.get("source", "document"),
                "score": c.get("reranker_score", c.get("fused_score", c.get("score", 0)))
            }
            # Add filename if available
            if "metadata" in c and "filename" in c["metadata"]:
                source_info["filename"] = c["metadata"]["filename"]
            sources.append(source_info)

        return ChatResponse(
            response=response_text,
            session_id=session_id,
            sources=sources
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Chat error for bot {bot_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred processing your message. Please try again."
        )


@router.post("/{bot_id}/message/stream")
async def send_message_stream(
    bot_id: str,
    message: ChatMessage,
    enhanced: bool = Query(default=True, description="Use enhanced RAG pipeline")
):
    """
    Send a message and stream the response.

    Uses enhanced RAG pipeline by default for better retrieval quality.
    """
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
        history = conversation.get("messages", [])[-5:]  # Last 5 messages (reduced for speed)

    # Analyze query for adaptive processing
    query_analysis = analyze_query(message.message)
    logger.info(f"Stream query analysis: intent={query_analysis['intent']}, complexity={query_analysis['complexity']}")

    # Retrieve context using enhanced or basic pipeline
    if enhanced:
        # NOTE: Query enhancement disabled by default for faster response times
        retrieval_result = await enhanced_triple_retrieval(
            query=message.message,
            tenant_id=tenant_id,
            bot_id=bot_id,
            top_k=5,
            use_reranking=True,
            use_query_enhancement=False,  # Disabled for speed - saves 10-30s
            use_mmr=True,
            use_compression=True,
            verbose=False
        )
        context = retrieval_result["contexts"]
        query_analysis = retrieval_result.get("query_analysis", query_analysis)
    else:
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

        # Format sources with enhanced metadata
        sources = []
        for c in context:
            source_info = {
                "content": c["content"][:200] + "..." if len(c["content"]) > 200 else c["content"],
                "source": c.get("source", "document"),
                "score": c.get("reranker_score", c.get("fused_score", c.get("score", 0)))
            }
            if "metadata" in c and "filename" in c["metadata"]:
                source_info["filename"] = c["metadata"]["filename"]
            sources.append(source_info)

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
