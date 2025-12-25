from fastapi import APIRouter, HTTPException, Response, Query, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import uuid
import json
import logging
from ..schemas.chat import ChatMessage, ChatResponse, AnalyticsResponse
from ..core.database import get_mongodb
from ..core.security import get_current_user
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

# Context system (gracefully handles if not available)
try:
    from ..services.context.context_manager import build_context, ContextManager
    CONTEXT_SYSTEM_AVAILABLE = True
except ImportError:
    CONTEXT_SYSTEM_AVAILABLE = False
    logger.warning("Context system not available, using basic history")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


def validate_visitor_id(visitor_id: Optional[str]) -> None:
    """
    Validate visitor_id is a valid UUID format.
    Raises HTTPException if invalid.
    """
    if visitor_id is None:
        return  # None is acceptable for non-personal mode

    try:
        # Attempt to parse as UUID
        uuid.UUID(visitor_id)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid visitor_id format. Must be a valid UUID."
        )


@router.post("/{bot_id}/message", response_model=ChatResponse)
async def send_message(
    bot_id: str,
    message: ChatMessage,
    enhanced: bool = Query(default=True, description="Use enhanced RAG pipeline"),
    visitor_id: Optional[str] = Query(None, description="Visitor ID for personal mode")
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
        # Validate visitor_id format
        validate_visitor_id(visitor_id)

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

        # Check if session has an active handoff where agent has taken over
        # If so, skip bot response to avoid confusing the customer
        if message.session_id:
            active_handoff = await db.handoffs.find_one({
                "session_id": session_id,
                "status": {"$in": ["pending", "assigned", "active", "timeout_collecting"]}
            })
            if active_handoff:
                # Check if agent has sent any messages (agent took over)
                agent_messages = [m for m in active_handoff.get("messages", [])
                                  if m.get("sender_type") == "agent"]
                if len(agent_messages) > 0:
                    # Agent has taken over - don't let bot respond
                    logger.info(f"Skipping bot response - agent has taken over handoff {active_handoff['_id']}")
                    return ChatResponse(
                        response="",
                        session_id=session_id,
                        sources=[]
                    )

        # Check if bot is in personal mode
        is_personal = bot.get("is_personal", False)

        # Get conversation for history
        conversation = await db.conversations.find_one({
            "session_id": session_id,
            "bot_id": bot_id
        })

        # Store visitor_id for personal mode
        if is_personal and visitor_id and conversation and not conversation.get("visitor_id"):
            # Backfill visitor_id
            await db.conversations.update_one(
                {"session_id": session_id},
                {"$set": {"visitor_id": visitor_id}}
            )

        # Analyze query for adaptive processing
        query_analysis = analyze_query(message.message)
        logger.info(f"Query analysis: intent={query_analysis['intent']}, complexity={query_analysis['complexity']}")

        # Get raw history
        raw_history = conversation.get("messages", [])[-20:] if conversation else []

        # Build rich context using Context Manager (with graceful fallback)
        user_context = ""
        working_memory = {}
        user_profile = None
        stage_guidance = ""

        if CONTEXT_SYSTEM_AVAILABLE:
            try:
                context_data = await build_context(
                    query=message.message,
                    session_id=session_id,
                    bot_id=bot_id,
                    tenant_id=tenant_id,
                    conversation_history=raw_history,
                    query_analysis=query_analysis
                )
                history = context_data.get("recent_messages", raw_history)
                user_context = context_data.get("prompt_context", "")
                working_memory = context_data.get("working_memory", {})
                user_profile = context_data.get("user_profile")
                stage_guidance = context_data.get("stage_guidance", "")
                logger.info(f"Context built successfully with {len(history)} messages")
            except Exception as e:
                logger.warning(f"Context building failed, using basic history: {e}")
                history = raw_history
        else:
            history = raw_history

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

        # Build system prompt with booking and lead capture instructions if enabled
        base_system_prompt = bot.get("system_prompt", "You are a helpful assistant.")
        effective_system_prompt = base_system_prompt

        # Add booking instructions if enabled
        booking_config = bot.get("booking_config", {})
        if booking_config.get("enabled", False):
            from ..schemas.booking import DEFAULT_BOOKING_PROMPT
            booking_prompt = booking_config.get("booking_prompt") or DEFAULT_BOOKING_PROMPT
            effective_system_prompt = f"{effective_system_prompt}\n\n## Booking Instructions\n{booking_prompt}"

        # Add smart lead capture instructions if enabled
        lead_config = bot.get("lead_form_config", {})
        if lead_config.get("enabled", False) and lead_config.get("smart_capture", False):
            from ..schemas.leads import DEFAULT_SMART_CAPTURE_PROMPT
            smart_prompt = lead_config.get("smart_capture_prompt") or DEFAULT_SMART_CAPTURE_PROMPT
            effective_system_prompt = f"{effective_system_prompt}\n\n## Lead Capture Instructions\n{smart_prompt}"

        # Generate response with enhanced LLM
        if enhanced:
            llm_result = await generate_enhanced_response(
                query=message.message,
                context=context,
                system_prompt=effective_system_prompt,
                conversation_history=history,
                query_analysis=query_analysis,
                tenant_id=tenant_id,
                bot_id=bot_id,
                session_id=session_id,
                # NEW: Rich context parameters
                user_context=user_context,
                user_profile=user_profile,
                stage_guidance=stage_guidance
            )
            response_text = llm_result["response"]
            confidence = llm_result.get("confidence", 0.5)
            logger.info(f"Response generated with confidence: {confidence:.2f}")
        else:
            response_text = await generate_response(
                query=message.message,
                context=context,
                system_prompt=effective_system_prompt,
                conversation_history=history,
                tenant_id=tenant_id,
                bot_id=bot_id,
                session_id=session_id
            )

        # Check for booking trigger and process booking notification
        booking_config = bot.get("booking_config", {})
        if booking_config.get("enabled", False):
            from ..services.booking import check_booking_trigger, extract_booking_details, create_booking, check_availability
            from ..services.handoff import create_booking_handoff

            # Check if response indicates a booking was made
            custom_keywords = booking_config.get("trigger_keywords")
            if check_booking_trigger(response_text, custom_keywords):
                logger.info(f"Booking trigger detected in session {session_id}")

                # Build full conversation history for extraction
                full_history = history + [
                    {"role": "user", "content": message.message},
                    {"role": "assistant", "content": response_text}
                ]

                # Extract booking details via LLM
                try:
                    booking_details = await extract_booking_details(
                        conversation_history=full_history,
                        tenant_id=tenant_id,
                        bot_id=bot_id
                    )

                    if booking_details and booking_details.get("guest_name") and booking_details.get("phone"):
                        # Set default booking type if not detected
                        if not booking_details.get("booking_type"):
                            booking_details["booking_type"] = booking_config.get("default_booking_type", "other")

                        # Check availability before creating booking
                        availability = await check_availability(
                            bot_id=bot_id,
                            tenant_id=tenant_id,
                            date_str=booking_details.get("date", ""),
                            time_str=booking_details.get("time", ""),
                            duration_str=booking_details.get("duration")
                        )

                        if not availability.get("available", True):
                            # Time slot is taken - append conflict message to response
                            conflict_times = [c.get("time", "") for c in availability.get("conflicts", [])]
                            conflict_msg = f"\n\nI apologize, but that time slot is already booked. There's an existing booking at {', '.join(conflict_times)}. Would you like to choose a different time?"
                            response_text += conflict_msg
                            logger.info(f"Booking blocked due to conflict: {availability.get('message')}")
                        else:
                            # Time slot is available - create booking
                            booking = await create_booking(
                                bot_id=bot_id,
                                tenant_id=tenant_id,
                                session_id=session_id,
                                booking_data=booking_details
                            )

                            # Create booking handoff for dashboard notification
                            await create_booking_handoff(
                                session_id=session_id,
                                bot_id=bot_id,
                                tenant_id=tenant_id,
                                booking_details=booking_details,
                                conversation_context=history[-20:]
                            )

                            logger.info(f"Booking created: {booking['_id']} for {booking_details.get('guest_name')}")
                    else:
                        logger.warning(f"Booking trigger detected but extraction incomplete (missing name or phone)")
                except Exception as e:
                    logger.error(f"Booking processing failed: {e}")

        # Generate message IDs upfront for updating later
        user_msg_id = str(uuid.uuid4())
        assistant_msg_id = str(uuid.uuid4())

        # Store messages with analytics data
        user_msg = {
            "role": "user",
            "content": message.message,
            "timestamp": datetime.utcnow(),
            # NEW: Context data
            "intent": working_memory.get("current_intent", {}).get("intent") if working_memory else None,
            "stage": working_memory.get("current_stage") if working_memory else None,
            "extracted_facts": working_memory.get("new_facts", {}) if working_memory else {}
        }

        assistant_msg = {
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.utcnow(),
            "query": message.message  # Store the original query for quality analysis
        }

        # Run analytics in background and UPDATE stored messages
        async def run_analytics_background(user_msg_id: str, assistant_msg_id: str):
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

                # Update the stored messages with actual analytics data
                await db.messages.update_one(
                    {"_id": user_msg_id},
                    {"$set": {"sentiment": user_sentiment}}
                )
                await db.messages.update_one(
                    {"_id": assistant_msg_id},
                    {"$set": {"quality_score": quality_score}}
                )
                logger.debug(f"Analytics updated for session {session_id}: sentiment={user_sentiment.get('label') if isinstance(user_sentiment, dict) else user_sentiment}, quality={quality_score.get('overall') if isinstance(quality_score, dict) else quality_score}")
            except Exception as e:
                logger.warning(f"Background analytics failed: {e}")

        # Start analytics in background (non-blocking)
        import asyncio
        asyncio.create_task(run_analytics_background(user_msg_id, assistant_msg_id))

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
                "visitor_id": visitor_id if is_personal else None,
                "title": None,
                "messages": [user_msg, assistant_msg],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

        # Store individual messages for analytics (using pre-generated IDs for later update)
        await db.messages.insert_many([
            {
                "_id": user_msg_id,
                "session_id": session_id,
                "bot_id": bot_id,
                "tenant_id": tenant_id,
                **user_msg
            },
            {
                "_id": assistant_msg_id,
                "session_id": session_id,
                "bot_id": bot_id,
                "tenant_id": tenant_id,
                **assistant_msg
            }
        ])

        # Generate title for first message in personal mode
        # Check if this is the first user message (message_count was 0 before this message)
        is_first_message = conversation is None or len(conversation.get("messages", [])) == 0
        if is_personal and is_first_message:
            try:
                from ..services.title_generator import generate_title
                title = await generate_title(message.message)
                await db.conversations.update_one(
                    {"session_id": session_id},
                    {"$set": {"title": title}}
                )
                logger.info(f"Generated title for session {session_id}: {title}")
            except Exception as e:
                logger.warning(f"Title generation failed: {e}")

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
    enhanced: bool = Query(default=True, description="Use enhanced RAG pipeline"),
    visitor_id: Optional[str] = Query(None, description="Visitor ID for personal mode"),
    timezone: Optional[str] = Query(None, description="Customer timezone (e.g., Africa/Cairo)")
):
    """
    Send a message and stream the response.

    Uses enhanced RAG pipeline by default for better retrieval quality.
    """
    # Validate visitor_id format
    validate_visitor_id(visitor_id)

    db = get_mongodb()

    # Get chatbot
    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    tenant_id = bot["tenant_id"]

    # Check message limit for the tenant
    await check_message_limit(tenant_id)

    session_id = message.session_id or str(uuid.uuid4())

    # Check if session has an active handoff where agent has taken over
    # If so, skip bot response to avoid confusing the customer
    if message.session_id:
        active_handoff = await db.handoffs.find_one({
            "session_id": session_id,
            "status": {"$in": ["pending", "assigned", "active", "timeout_collecting"]}
        })
        if active_handoff:
            # Check if agent has sent any messages (agent took over)
            agent_messages = [m for m in active_handoff.get("messages", [])
                              if m.get("sender_type") == "agent"]
            if len(agent_messages) > 0:
                # Agent has taken over - return empty stream
                logger.info(f"Skipping bot stream response - agent has taken over handoff {active_handoff['_id']}")
                async def empty_stream():
                    yield f"data: {json.dumps({'session_id': session_id})}\n\n"
                    yield "data: [DONE]\n\n"
                return StreamingResponse(
                    empty_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no"
                    }
                )

    # Check if bot is in personal mode
    is_personal = bot.get("is_personal", False)

    # Get conversation for history
    conversation = await db.conversations.find_one({
        "session_id": session_id,
        "bot_id": bot_id
    })

    # Store visitor_id for personal mode
    if is_personal and visitor_id and conversation and not conversation.get("visitor_id"):
        # Backfill visitor_id
        await db.conversations.update_one(
            {"session_id": session_id},
            {"$set": {"visitor_id": visitor_id}}
        )

    # Analyze query for adaptive processing
    query_analysis = analyze_query(message.message)
    logger.info(f"Stream query analysis: intent={query_analysis['intent']}, complexity={query_analysis['complexity']}")

    # Get raw history
    raw_history = conversation.get("messages", [])[-5:] if conversation else []  # Last 5 messages (reduced for speed)

    # Build rich context using Context Manager (with graceful fallback)
    user_context = ""
    working_memory = {}
    user_profile = None
    stage_guidance = ""

    if CONTEXT_SYSTEM_AVAILABLE:
        try:
            context_data = await build_context(
                query=message.message,
                session_id=session_id,
                bot_id=bot_id,
                tenant_id=tenant_id,
                conversation_history=raw_history,
                query_analysis=query_analysis
            )
            history = context_data.get("recent_messages", raw_history)
            user_context = context_data.get("prompt_context", "")
            working_memory = context_data.get("working_memory", {})
            user_profile = context_data.get("user_profile")
            stage_guidance = context_data.get("stage_guidance", "")
            logger.info(f"Stream context built successfully with {len(history)} messages")
        except Exception as e:
            logger.warning(f"Stream context building failed, using basic history: {e}")
            history = raw_history
    else:
        history = raw_history

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

    # Build system prompt with booking and lead capture instructions if enabled (streaming)
    base_system_prompt = bot.get("system_prompt", "You are a helpful assistant.")
    effective_system_prompt = base_system_prompt

    # Add booking instructions if enabled
    booking_config = bot.get("booking_config", {})
    if booking_config.get("enabled", False):
        from ..schemas.booking import DEFAULT_BOOKING_PROMPT
        booking_prompt = booking_config.get("booking_prompt") or DEFAULT_BOOKING_PROMPT
        effective_system_prompt = f"{effective_system_prompt}\n\n## Booking Instructions\n{booking_prompt}"

    # Add smart lead capture instructions if enabled
    lead_config = bot.get("lead_form_config", {})
    if lead_config.get("enabled", False) and lead_config.get("smart_capture", False):
        from ..schemas.leads import DEFAULT_SMART_CAPTURE_PROMPT
        smart_prompt = lead_config.get("smart_capture_prompt") or DEFAULT_SMART_CAPTURE_PROMPT
        effective_system_prompt = f"{effective_system_prompt}\n\n## Lead Capture Instructions\n{smart_prompt}"

    async def generate():
        full_response = ""

        # Send session_id first
        yield f"data: {json.dumps({'session_id': session_id})}\n\n"

        async for chunk in generate_response_stream(
            query=message.message,
            context=context,
            system_prompt=effective_system_prompt,
            conversation_history=history,
            tenant_id=tenant_id,
            bot_id=bot_id,
            session_id=session_id
        ):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        # Generate message IDs upfront for updating later
        user_msg_id = str(uuid.uuid4())
        assistant_msg_id = str(uuid.uuid4())

        # Store messages after streaming completes
        user_msg = {
            "role": "user",
            "content": message.message,
            "timestamp": datetime.utcnow(),
            # NEW: Context data
            "intent": working_memory.get("current_intent", {}).get("intent") if working_memory else None,
            "stage": working_memory.get("current_stage") if working_memory else None,
            "extracted_facts": working_memory.get("new_facts", {}) if working_memory else {}
        }

        assistant_msg = {
            "role": "assistant",
            "content": full_response,
            "timestamp": datetime.utcnow(),
            "query": message.message  # Store the original query for quality analysis
        }

        # Store conversation in database (same as non-streaming endpoint)
        try:
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
                    "visitor_id": visitor_id if is_personal else None,
                    "title": None,
                    "messages": [user_msg, assistant_msg],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })

            # Store individual messages for analytics (using pre-generated IDs for later update)
            await db.messages.insert_many([
                {
                    "_id": user_msg_id,
                    "session_id": session_id,
                    "bot_id": bot_id,
                    "tenant_id": tenant_id,
                    **user_msg
                },
                {
                    "_id": assistant_msg_id,
                    "session_id": session_id,
                    "bot_id": bot_id,
                    "tenant_id": tenant_id,
                    **assistant_msg
                }
            ])

            # Run analytics in background and UPDATE stored messages
            async def run_streaming_analytics():
                try:
                    user_sentiment = await analyze_sentiment(message.message)
                    quality_score = await calculate_quality_score(
                        query=message.message,
                        response=full_response,
                        context=context
                    )
                    await detect_unanswered_question(
                        query=message.message,
                        response=full_response,
                        context=context,
                        tenant_id=tenant_id,
                        bot_id=bot_id,
                        session_id=session_id
                    )
                    await track_usage_realtime(bot_id, session_id)

                    # Update the stored messages with actual analytics data
                    await db.messages.update_one(
                        {"_id": user_msg_id},
                        {"$set": {"sentiment": user_sentiment}}
                    )
                    await db.messages.update_one(
                        {"_id": assistant_msg_id},
                        {"$set": {"quality_score": quality_score}}
                    )
                    logger.debug(f"[STREAMING] Analytics updated for session {session_id}")
                except Exception as e:
                    logger.warning(f"[STREAMING] Background analytics failed: {e}")

            # Start analytics in background (non-blocking)
            import asyncio
            asyncio.create_task(run_streaming_analytics())

            # Generate title for first message in personal mode
            is_first_message = conversation is None or len(conversation.get("messages", [])) == 0
            if is_personal and is_first_message:
                try:
                    from ..services.title_generator import generate_title
                    title = await generate_title(message.message)
                    await db.conversations.update_one(
                        {"session_id": session_id},
                        {"$set": {"title": title}}
                    )
                    logger.info(f"Generated title for session {session_id}: {title}")
                except Exception as e:
                    logger.warning(f"Title generation failed: {e}")
        except Exception as e:
            logger.error(f"Failed to store streaming messages: {e}")

        # Check for booking trigger and process booking notification (streaming endpoint)
        booking_config = bot.get("booking_config", {})
        if booking_config.get("enabled", False):
            from ..services.booking import check_booking_trigger, extract_booking_details, create_booking, check_availability
            from ..services.handoff import create_booking_handoff

            # Check if response indicates a booking was made
            custom_keywords = booking_config.get("trigger_keywords")
            if check_booking_trigger(full_response, custom_keywords):
                logger.info(f"[STREAMING] Booking trigger detected in session {session_id}, customer timezone: {timezone}")

                # Fetch full conversation history for booking extraction
                # Note: The conversation was already saved above, so it includes the current exchange
                booking_conversation = await db.conversations.find_one({"session_id": session_id, "bot_id": bot_id})

                if booking_conversation and booking_conversation.get("messages"):
                    # Conversation already includes the just-saved messages
                    full_history = booking_conversation.get("messages", [])[-20:]
                else:
                    # Fallback: use raw_history plus current exchange
                    full_history = raw_history + [
                        {"role": "user", "content": message.message},
                        {"role": "assistant", "content": full_response}
                    ]

                logger.info(f"[STREAMING] Extracting from {len(full_history)} messages")

                # Extract booking details via LLM
                try:
                    booking_details = await extract_booking_details(
                        conversation_history=full_history,
                        tenant_id=tenant_id,
                        bot_id=bot_id,
                        customer_timezone=timezone
                    )

                    logger.info(f"[STREAMING] Extraction result: {booking_details}")

                    if booking_details and booking_details.get("guest_name") and booking_details.get("phone"):
                        # Set default booking type if not detected
                        if not booking_details.get("booking_type"):
                            booking_details["booking_type"] = booking_config.get("default_booking_type", "other")

                        # Check availability before creating booking
                        availability = await check_availability(
                            bot_id=bot_id,
                            tenant_id=tenant_id,
                            date_str=booking_details.get("date", ""),
                            time_str=booking_details.get("time", ""),
                            duration_str=booking_details.get("duration"),
                            customer_timezone=timezone
                        )

                        if not availability.get("available", True):
                            # Time slot is taken - log the conflict
                            logger.info(f"[STREAMING] Booking blocked due to conflict: {availability.get('message')}")
                        else:
                            # Time slot is available - create booking
                            booking = await create_booking(
                                bot_id=bot_id,
                                tenant_id=tenant_id,
                                session_id=session_id,
                                booking_data=booking_details
                            )

                            # Create booking handoff for dashboard notification
                            await create_booking_handoff(
                                session_id=session_id,
                                bot_id=bot_id,
                                tenant_id=tenant_id,
                                booking_details=booking_details,
                                conversation_context=raw_history[-20:]
                            )

                            logger.info(f"[STREAMING] Booking created: {booking['_id']} for {booking_details.get('guest_name')}")
                    else:
                        logger.warning(f"[STREAMING] Booking trigger detected but extraction incomplete (missing name or phone)")
                except Exception as e:
                    logger.error(f"[STREAMING] Booking processing failed: {e}")

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
async def get_analytics(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get chatbot analytics. Requires authentication.

    SECURITY: Uses tenant_id from authenticated user to ensure tenant isolation.
    """
    db = get_mongodb()

    # Get tenant_id from authenticated user (not from query parameter)
    tenant_id = current_user["tenant_id"]

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


# Personal Chatbot Mode - Conversation Management Endpoints

@router.get("/{bot_id}/conversations")
async def list_conversations(
    bot_id: str,
    visitor_id: str = Query(..., description="Anonymous visitor ID"),
    limit: int = Query(50, le=100),
    offset: int = Query(0)
):
    """List conversations for a visitor (Personal Mode sidebar)."""
    # Validate visitor_id format
    validate_visitor_id(visitor_id)

    db = get_mongodb()

    # Validate bot exists and is personal mode
    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if not bot.get("is_personal", False):
        raise HTTPException(status_code=400, detail="Bot is not in personal mode")

    # Query conversations
    cursor = db.conversations.find({
        "bot_id": bot_id,
        "visitor_id": visitor_id
    }).sort("updated_at", -1).skip(offset).limit(limit)

    conversations = await cursor.to_list(length=limit)

    items = []
    for conv in conversations:
        items.append({
            "id": conv["_id"],
            "session_id": conv["session_id"],
            "title": conv.get("title") or "New Conversation",
            "created_at": conv["created_at"],
            "updated_at": conv["updated_at"],
            "message_count": len(conv.get("messages", []))
        })

    total = await db.conversations.count_documents({
        "bot_id": bot_id,
        "visitor_id": visitor_id
    })

    return {"conversations": items, "total": total}


@router.get("/{bot_id}/conversations/{session_id}")
async def get_conversation(
    bot_id: str,
    session_id: str,
    visitor_id: str = Query(..., description="Anonymous visitor ID")
):
    """Get full conversation with messages."""
    # Validate visitor_id format
    validate_visitor_id(visitor_id)

    db = get_mongodb()

    conversation = await db.conversations.find_one({
        "session_id": session_id,
        "bot_id": bot_id,
        "visitor_id": visitor_id
    })

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conversation["_id"],
        "session_id": conversation["session_id"],
        "title": conversation.get("title"),
        "messages": conversation.get("messages", []),
        "created_at": conversation["created_at"],
        "updated_at": conversation["updated_at"]
    }


@router.post("/{bot_id}/conversations")
async def create_conversation(
    bot_id: str,
    visitor_id: str = Query(..., description="Anonymous visitor ID")
):
    """Create new empty conversation (New Chat button)."""
    # Validate visitor_id format
    validate_visitor_id(visitor_id)

    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    new_session_id = str(uuid.uuid4())

    await db.conversations.insert_one({
        "_id": str(uuid.uuid4()),
        "session_id": new_session_id,
        "bot_id": bot_id,
        "tenant_id": bot["tenant_id"],
        "visitor_id": visitor_id,
        "title": None,
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })

    return {"session_id": new_session_id}


@router.patch("/{bot_id}/conversations/{session_id}")
async def update_conversation(
    bot_id: str,
    session_id: str,
    visitor_id: str = Query(...),
    title: str = None
):
    """Update conversation (rename title)."""
    # Validate visitor_id format
    validate_visitor_id(visitor_id)

    db = get_mongodb()

    result = await db.conversations.update_one(
        {
            "session_id": session_id,
            "bot_id": bot_id,
            "visitor_id": visitor_id
        },
        {"$set": {"title": title, "updated_at": datetime.utcnow()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {"success": True}


@router.delete("/{bot_id}/conversations/{session_id}")
async def delete_conversation(
    bot_id: str,
    session_id: str,
    visitor_id: str = Query(...)
):
    """Delete conversation and associated data."""
    # Validate visitor_id format
    validate_visitor_id(visitor_id)

    db = get_mongodb()

    result = await db.conversations.delete_one({
        "session_id": session_id,
        "bot_id": bot_id,
        "visitor_id": visitor_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete associated messages
    await db.messages.delete_many({"session_id": session_id})

    return {"success": True}
