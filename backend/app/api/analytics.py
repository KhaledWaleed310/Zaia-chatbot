from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional
from datetime import datetime, timedelta
import uuid
from ..core.security import get_current_user
from ..core.database import get_mongodb, get_redis
from ..services.analytics import analyze_sentiment, analyze_conversation_sentiment
from ..schemas.analytics import (
    UnansweredQuestionResponse,
    UnansweredQuestionUpdate,
    UnansweredQuestionListResponse,
    UnansweredSummary,
    SentimentSummary,
    SentimentTimelineResponse,
    SentimentTimeline,
    QualitySummary,
    QualityListResponse,
    QualityResponse,
    UsageHeatmapResponse,
    UsageHeatmapCell,
    PeakHoursResponse,
    RealtimeUsage,
    TopicListResponse,
    TopicResponse,
    AnalyticsDashboard,
    TopicDistribution,
    QualityDimensions,
    QualityScore
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ==================== Unanswered Questions ====================

@router.get("/{bot_id}/unanswered-questions", response_model=UnansweredQuestionListResponse)
async def list_unanswered_questions(
    bot_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    resolved: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    """List unanswered questions for a chatbot."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Build query
    query = {"bot_id": bot_id, "tenant_id": current_user["_id"]}
    if resolved is not None:
        query["resolved"] = resolved
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = end_date
        else:
            query["timestamp"] = {"$lte": end_date}

    # Get total count
    total = await db.unanswered_questions.count_documents(query)

    # Get paginated results
    skip = (page - 1) * per_page
    cursor = db.unanswered_questions.find(query).sort("timestamp", -1).skip(skip).limit(per_page)
    items = await cursor.to_list(per_page)

    return UnansweredQuestionListResponse(
        items=[UnansweredQuestionResponse(
            id=item["_id"],
            bot_id=item["bot_id"],
            session_id=item["session_id"],
            question=item["question"],
            response=item["response"],
            detection_method=item["detection_method"],
            context_score=item["context_score"],
            sources_count=item["sources_count"],
            timestamp=item["timestamp"],
            resolved=item.get("resolved", False),
            resolved_by=item.get("resolved_by"),
            resolved_at=item.get("resolved_at"),
            notes=item.get("notes")
        ) for item in items],
        total=total,
        page=page,
        per_page=per_page
    )


@router.patch("/{bot_id}/unanswered-questions/{question_id}")
async def update_unanswered_question(
    bot_id: str,
    question_id: str,
    update: UnansweredQuestionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mark an unanswered question as resolved or add notes."""
    db = get_mongodb()

    # Verify ownership
    question = await db.unanswered_questions.find_one({
        "_id": question_id,
        "bot_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    update_data = {}
    if update.resolved is not None:
        update_data["resolved"] = update.resolved
        if update.resolved:
            update_data["resolved_by"] = current_user["_id"]
            update_data["resolved_at"] = datetime.utcnow()
    if update.notes is not None:
        update_data["notes"] = update.notes

    await db.unanswered_questions.update_one(
        {"_id": question_id},
        {"$set": update_data}
    )

    return {"message": "Question updated successfully"}


@router.get("/{bot_id}/unanswered-summary", response_model=UnansweredSummary)
async def get_unanswered_summary(
    bot_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get summary statistics for unanswered questions."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    start_date = datetime.utcnow() - timedelta(days=days)
    query = {
        "bot_id": bot_id,
        "tenant_id": current_user["_id"],
        "timestamp": {"$gte": start_date}
    }

    total = await db.unanswered_questions.count_documents(query)
    unresolved = await db.unanswered_questions.count_documents({**query, "resolved": False})
    resolved = await db.unanswered_questions.count_documents({**query, "resolved": True})

    # By detection method
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$detection_method", "count": {"$sum": 1}}}
    ]
    method_counts = await db.unanswered_questions.aggregate(pipeline).to_list(10)
    by_detection_method = {item["_id"]: item["count"] for item in method_counts}

    # By day
    daily_pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    daily_counts = await db.unanswered_questions.aggregate(daily_pipeline).to_list(days)
    by_day = [{"date": item["_id"], "count": item["count"]} for item in daily_counts]

    return UnansweredSummary(
        total=total,
        unresolved=unresolved,
        resolved=resolved,
        by_detection_method=by_detection_method,
        by_day=by_day
    )


# ==================== Sentiment Analysis ====================

@router.get("/{bot_id}/sentiment/summary", response_model=SentimentSummary)
async def get_sentiment_summary(
    bot_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get sentiment analysis summary."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    start_date = datetime.utcnow() - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)

    # Current period
    query = {
        "bot_id": bot_id,
        "tenant_id": current_user["_id"],
        "role": "user",
        "timestamp": {"$gte": start_date},
        "sentiment": {"$exists": True}
    }

    pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": "$sentiment.label",
                "count": {"$sum": 1},
                "avg_score": {"$avg": "$sentiment.score"}
            }
        }
    ]

    results = await db.messages.aggregate(pipeline).to_list(10)

    positive_count = 0
    neutral_count = 0
    negative_count = 0
    total_score = 0
    total_count = 0

    for item in results:
        count = item["count"]
        total_count += count
        total_score += item.get("avg_score", 0) * count

        if item["_id"] == "positive":
            positive_count = count
        elif item["_id"] == "neutral":
            neutral_count = count
        elif item["_id"] == "negative":
            negative_count = count

    avg_score = total_score / total_count if total_count > 0 else 0

    # Previous period for trend calculation
    prev_query = {**query, "timestamp": {"$gte": prev_start, "$lt": start_date}}
    prev_pipeline = [
        {"$match": prev_query},
        {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment.score"}}}
    ]
    prev_results = await db.messages.aggregate(prev_pipeline).to_list(1)
    prev_avg = prev_results[0]["avg_score"] if prev_results else 0
    trend = avg_score - prev_avg

    return SentimentSummary(
        average_score=avg_score,
        positive_count=positive_count,
        neutral_count=neutral_count,
        negative_count=negative_count,
        total_messages=total_count,
        trend=trend
    )


@router.get("/{bot_id}/sentiment/timeline", response_model=SentimentTimelineResponse)
async def get_sentiment_timeline(
    bot_id: str,
    granularity: str = Query("day", pattern="^(hour|day|week)$"),
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get sentiment timeline data for charts."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    start_date = datetime.utcnow() - timedelta(days=days)

    # Build date format based on granularity
    date_formats = {
        "hour": "%Y-%m-%dT%H:00:00",
        "day": "%Y-%m-%d",
        "week": "%Y-W%V"
    }

    pipeline = [
        {
            "$match": {
                "bot_id": bot_id,
                "tenant_id": current_user["_id"],
                "role": "user",
                "timestamp": {"$gte": start_date},
                "sentiment": {"$exists": True}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": date_formats[granularity],
                        "date": "$timestamp"
                    }
                },
                "average_score": {"$avg": "$sentiment.score"},
                "message_count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]

    results = await db.messages.aggregate(pipeline).to_list(1000)

    data = [
        SentimentTimeline(
            timestamp=datetime.fromisoformat(item["_id"].replace("T", " ").replace(":00:00", ":00:00")),
            average_score=item["average_score"],
            message_count=item["message_count"]
        ) for item in results
    ]

    return SentimentTimelineResponse(data=data, granularity=granularity)


@router.post("/{bot_id}/sentiment/analyze")
async def trigger_sentiment_analysis(
    bot_id: str,
    background_tasks: BackgroundTasks,
    days: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_user)
):
    """
    Trigger AI-powered sentiment re-analysis for recent conversations.
    Uses DeepSeek API for accurate sentiment detection.
    """
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["tenant_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Queue background analysis
    background_tasks.add_task(
        run_sentiment_analysis,
        bot_id,
        current_user["tenant_id"],
        days
    )

    return {
        "status": "started",
        "message": f"Sentiment analysis started for last {days} days. This may take a few minutes."
    }


async def run_sentiment_analysis(bot_id: str, tenant_id: str, days: int):
    """Background task to analyze sentiment of recent messages."""
    db = get_mongodb()
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get user messages without sentiment analysis
    cursor = db.messages.find({
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "role": "user",
        "timestamp": {"$gte": start_date},
        "$or": [
            {"sentiment": {"$exists": False}},
            {"sentiment.analysis_method": {"$ne": "deepseek"}}
        ]
    }).limit(500)  # Limit to avoid too many API calls

    messages = await cursor.to_list(500)
    analyzed_count = 0

    for msg in messages:
        try:
            content = msg.get("content", "")
            if content and len(content) > 5:  # Skip very short messages
                sentiment = await analyze_sentiment(content)

                await db.messages.update_one(
                    {"_id": msg["_id"]},
                    {"$set": {"sentiment": sentiment}}
                )
                analyzed_count += 1

        except Exception as e:
            print(f"Error analyzing message {msg['_id']}: {e}")
            continue

    print(f"Sentiment analysis complete: {analyzed_count} messages analyzed for bot {bot_id}")


@router.post("/{bot_id}/sentiment/analyze-conversation/{session_id}")
async def analyze_single_conversation(
    bot_id: str,
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze sentiment of a specific conversation using DeepSeek AI.
    Returns detailed sentiment breakdown.
    """
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["tenant_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get conversation messages
    cursor = db.messages.find({
        "bot_id": bot_id,
        "session_id": session_id
    }).sort("timestamp", 1)

    messages = await cursor.to_list(100)

    if not messages:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Analyze the conversation
    result = await analyze_conversation_sentiment(messages)

    # Also analyze individual messages if needed
    user_messages = [m for m in messages if m.get("role") == "user"]
    message_sentiments = []

    for msg in user_messages[-10:]:  # Last 10 user messages
        sentiment = await analyze_sentiment(msg.get("content", ""))
        message_sentiments.append({
            "content": msg.get("content", "")[:100],
            "timestamp": msg.get("timestamp"),
            "sentiment": sentiment
        })

        # Update message in DB
        await db.messages.update_one(
            {"_id": msg["_id"]},
            {"$set": {"sentiment": sentiment}}
        )

    return {
        "session_id": session_id,
        "overall": result,
        "messages": message_sentiments,
        "analysis_method": result.get("analysis_method", "deepseek")
    }


# ==================== Response Quality ====================

@router.get("/{bot_id}/quality/summary", response_model=QualitySummary)
async def get_quality_summary(
    bot_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get response quality summary."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    start_date = datetime.utcnow() - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)

    query = {
        "bot_id": bot_id,
        "tenant_id": current_user["_id"],
        "role": "assistant",
        "timestamp": {"$gte": start_date},
        "quality_score": {"$exists": True}
    }

    pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": None,
                "avg_overall": {"$avg": "$quality_score.overall"},
                "avg_relevance": {"$avg": "$quality_score.relevance"},
                "avg_completeness": {"$avg": "$quality_score.completeness"},
                "avg_accuracy": {"$avg": "$quality_score.accuracy"},
                "avg_clarity": {"$avg": "$quality_score.clarity"},
                "total_evaluated": {"$sum": 1}
            }
        }
    ]

    results = await db.messages.aggregate(pipeline).to_list(1)

    if not results:
        return QualitySummary(
            avg_overall=0, avg_relevance=0, avg_completeness=0,
            avg_accuracy=0, avg_clarity=0, total_evaluated=0,
            low_quality_count=0, high_quality_count=0, trend=0
        )

    result = results[0]

    # Count low and high quality
    low_quality = await db.messages.count_documents({**query, "quality_score.overall": {"$lt": 5}})
    high_quality = await db.messages.count_documents({**query, "quality_score.overall": {"$gte": 8}})

    # Calculate trend
    prev_query = {**query, "timestamp": {"$gte": prev_start, "$lt": start_date}}
    prev_pipeline = [
        {"$match": prev_query},
        {"$group": {"_id": None, "avg_overall": {"$avg": "$quality_score.overall"}}}
    ]
    prev_results = await db.messages.aggregate(prev_pipeline).to_list(1)
    prev_avg = prev_results[0]["avg_overall"] if prev_results else 0
    trend = (result["avg_overall"] or 0) - prev_avg

    return QualitySummary(
        avg_overall=result["avg_overall"] or 0,
        avg_relevance=result["avg_relevance"] or 0,
        avg_completeness=result["avg_completeness"] or 0,
        avg_accuracy=result["avg_accuracy"] or 0,
        avg_clarity=result["avg_clarity"] or 0,
        total_evaluated=result["total_evaluated"],
        low_quality_count=low_quality,
        high_quality_count=high_quality,
        trend=trend
    )


@router.get("/{bot_id}/quality/responses", response_model=QualityListResponse)
async def list_quality_responses(
    bot_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """List responses with quality scores."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    query = {
        "bot_id": bot_id,
        "tenant_id": current_user["_id"],
        "role": "assistant",
        "quality_score": {"$exists": True}
    }

    if min_score is not None:
        query["quality_score.overall"] = {"$gte": min_score}
    if max_score is not None:
        if "quality_score.overall" in query:
            query["quality_score.overall"]["$lte"] = max_score
        else:
            query["quality_score.overall"] = {"$lte": max_score}

    total = await db.messages.count_documents(query)
    skip = (page - 1) * per_page

    cursor = db.messages.find(query).sort("timestamp", -1).skip(skip).limit(per_page)
    items = await cursor.to_list(per_page)

    responses = []
    for item in items:
        qs = item["quality_score"]
        responses.append(QualityResponse(
            message_id=item["_id"],
            session_id=item["session_id"],
            query=item.get("query", ""),
            response=item["content"],
            quality_score=QualityScore(
                overall=qs.get("overall", 0),
                dimensions=QualityDimensions(
                    relevance=qs.get("relevance", 0),
                    completeness=qs.get("completeness", 0),
                    accuracy=qs.get("accuracy", 0),
                    clarity=qs.get("clarity", 0),
                    source_alignment=qs.get("source_alignment", 0)
                ),
                evaluated_at=qs.get("evaluated_at", datetime.utcnow()),
                evaluation_method=qs.get("evaluation_method", "heuristic")
            ),
            timestamp=item["timestamp"]
        ))

    return QualityListResponse(
        items=responses,
        total=total,
        page=page,
        per_page=per_page
    )


# ==================== Usage Patterns ====================

@router.get("/{bot_id}/usage/realtime", response_model=RealtimeUsage)
async def get_realtime_usage(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get real-time usage statistics."""
    db = get_mongodb()
    redis = get_redis()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Try Redis for real-time data
    active_sessions = 0
    messages_last_hour = 0
    messages_last_minute = 0

    if redis:
        try:
            active_sessions = await redis.scard(f"analytics:{bot_id}:active_sessions") or 0

            # Get hourly counter
            hour_key = datetime.utcnow().strftime("%Y-%m-%d-%H")
            messages_last_hour = int(await redis.get(f"analytics:{bot_id}:hourly:{hour_key}:messages") or 0)

            # Get minute counter
            minute_key = datetime.utcnow().strftime("%Y-%m-%d-%H-%M")
            messages_last_minute = int(await redis.get(f"analytics:{bot_id}:minute:{minute_key}:messages") or 0)
        except Exception:
            pass

    # Fallback to MongoDB if Redis data not available
    if messages_last_hour == 0:
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        messages_last_hour = await db.messages.count_documents({
            "bot_id": bot_id,
            "tenant_id": current_user["_id"],
            "timestamp": {"$gte": one_hour_ago}
        })

    return RealtimeUsage(
        active_sessions=active_sessions,
        messages_last_hour=messages_last_hour,
        messages_last_minute=messages_last_minute
    )


@router.get("/{bot_id}/usage/heatmap", response_model=UsageHeatmapResponse)
async def get_usage_heatmap(
    bot_id: str,
    metric: str = Query("messages", pattern="^(messages|sessions|users)$"),
    days: int = Query(30, ge=7, le=90),
    current_user: dict = Depends(get_current_user)
):
    """Get usage heatmap data (hour x day of week)."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    start_date = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {
            "$match": {
                "bot_id": bot_id,
                "tenant_id": current_user["_id"],
                "timestamp": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "dayOfWeek": {"$dayOfWeek": "$timestamp"},
                    "hour": {"$hour": "$timestamp"}
                },
                "count": {"$sum": 1}
            }
        }
    ]

    results = await db.messages.aggregate(pipeline).to_list(200)

    # Convert MongoDB dayOfWeek (1=Sunday) to 0=Monday format
    data = []
    for item in results:
        dow = item["_id"]["dayOfWeek"]
        # Convert: 1(Sun)->6, 2(Mon)->0, 3(Tue)->1, etc.
        adjusted_dow = (dow + 5) % 7
        data.append(UsageHeatmapCell(
            day_of_week=adjusted_dow,
            hour=item["_id"]["hour"],
            value=item["count"]
        ))

    return UsageHeatmapResponse(data=data, metric=metric)


@router.get("/{bot_id}/usage/peak-hours", response_model=PeakHoursResponse)
async def get_peak_hours(
    bot_id: str,
    days: int = Query(30, ge=7, le=90),
    current_user: dict = Depends(get_current_user)
):
    """Get peak usage hours analysis."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    start_date = datetime.utcnow() - timedelta(days=days)

    # Peak hours by hour
    hour_pipeline = [
        {
            "$match": {
                "bot_id": bot_id,
                "tenant_id": current_user["_id"],
                "timestamp": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {"$hour": "$timestamp"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}}
    ]

    hour_results = await db.messages.aggregate(hour_pipeline).to_list(24)
    peak_hours = [{"hour": item["_id"], "count": item["count"]} for item in hour_results]

    # Peak by day of week
    dow_pipeline = [
        {
            "$match": {
                "bot_id": bot_id,
                "tenant_id": current_user["_id"],
                "timestamp": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {"$dayOfWeek": "$timestamp"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}}
    ]

    dow_results = await db.messages.aggregate(dow_pipeline).to_list(7)

    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    busiest_day = day_names[dow_results[0]["_id"] - 1] if dow_results else "Unknown"
    quietest_day = day_names[dow_results[-1]["_id"] - 1] if dow_results else "Unknown"

    overall_peak_hour = hour_results[0]["_id"] if hour_results else 12

    return PeakHoursResponse(
        peak_hours=peak_hours[:10],
        busiest_day=busiest_day,
        quietest_day=quietest_day,
        overall_peak_hour=overall_peak_hour,
        daily_patterns=[]
    )


# ==================== Topics ====================

@router.get("/{bot_id}/topics", response_model=TopicListResponse)
async def list_topics(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List conversation topics for a chatbot."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    cursor = db.conversation_topics.find({
        "bot_id": bot_id,
        "tenant_id": current_user["_id"]
    }).sort("message_count", -1)

    items = await cursor.to_list(100)

    topics = [TopicResponse(
        id=item["_id"],
        name=item["name"],
        description=item.get("description"),
        keywords=item.get("keywords", []),
        message_count=item.get("message_count", 0),
        conversation_count=item.get("conversation_count", 0),
        sample_questions=item.get("sample_questions", []),
        is_custom=item.get("is_custom", False),
        created_at=item.get("created_at", datetime.utcnow())
    ) for item in items]

    return TopicListResponse(items=topics, total=len(topics))


@router.post("/{bot_id}/topics/cluster")
async def trigger_topic_clustering(
    bot_id: str,
    min_cluster_size: int = Query(10, ge=5),
    current_user: dict = Depends(get_current_user)
):
    """Trigger topic clustering job."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # TODO: Trigger Celery task for clustering
    # For now, return a placeholder response
    return {
        "message": "Topic clustering job queued",
        "job_id": str(uuid.uuid4()),
        "status": "pending"
    }


# ==================== Dashboard ====================

@router.get("/{bot_id}/dashboard", response_model=AnalyticsDashboard)
async def get_analytics_dashboard(
    bot_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get complete analytics dashboard data."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get all summaries
    unanswered_summary = await get_unanswered_summary(bot_id, days, current_user)
    sentiment_summary = await get_sentiment_summary(bot_id, days, current_user)
    quality_summary = await get_quality_summary(bot_id, days, current_user)
    realtime_usage = await get_realtime_usage(bot_id, current_user)

    # Get topic distribution
    topics = await list_topics(bot_id, current_user)
    total_messages = sum(t.message_count for t in topics.items)
    topic_distribution = [
        TopicDistribution(
            topic_id=t.id,
            topic_name=t.name,
            percentage=(t.message_count / total_messages * 100) if total_messages > 0 else 0,
            count=t.message_count
        ) for t in topics.items[:10]
    ]

    return AnalyticsDashboard(
        unanswered_summary=unanswered_summary,
        sentiment_summary=sentiment_summary,
        quality_summary=quality_summary,
        realtime_usage=realtime_usage,
        topic_distribution=topic_distribution
    )
