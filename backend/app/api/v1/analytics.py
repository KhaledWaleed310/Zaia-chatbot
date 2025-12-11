from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
import structlog

from ...dependencies import get_mongo_db
from ...middleware.auth import get_current_tenant

logger = structlog.get_logger()
router = APIRouter(prefix="/analytics")


@router.get("/overview")
async def get_overview(
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get overview analytics for the tenant."""
    # Count knowledge bases
    kb_count = await db.knowledge_bases.count_documents({"tenant_id": tenant_id})

    # Count chatbots
    chatbot_count = await db.chatbots.count_documents({"tenant_id": tenant_id})

    # Count total conversations and messages
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": None,
            "total_conversations": {"$sum": 1},
            "total_messages": {"$sum": "$total_messages"}
        }}
    ]
    result = await db.conversations.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {"total_conversations": 0, "total_messages": 0}

    return {
        "knowledge_bases": kb_count,
        "chatbots": chatbot_count,
        "total_conversations": stats.get("total_conversations", 0),
        "total_messages": stats.get("total_messages", 0)
    }


@router.get("/messages-per-day")
async def get_messages_per_day(
    days: int = Query(default=30, ge=1, le=90),
    bot_id: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get message count per day for the last N days."""
    start_date = datetime.utcnow() - timedelta(days=days)

    match_stage = {
        "tenant_id": tenant_id,
        "created_at": {"$gte": start_date}
    }
    if bot_id:
        match_stage["bot_id"] = bot_id

    pipeline = [
        {"$match": match_stage},
        {"$unwind": "$messages"},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$messages.timestamp"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]

    results = await db.conversations.aggregate(pipeline).to_list(100)

    # Fill in missing days with zero
    date_counts = {r["_id"]: r["count"] for r in results}
    all_days = []
    current_date = start_date
    while current_date <= datetime.utcnow():
        date_str = current_date.strftime("%Y-%m-%d")
        all_days.append({
            "date": date_str,
            "count": date_counts.get(date_str, 0)
        })
        current_date += timedelta(days=1)

    return all_days


@router.get("/popular-questions")
async def get_popular_questions(
    limit: int = Query(default=10, ge=1, le=50),
    bot_id: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get the most frequently asked questions."""
    match_stage = {"tenant_id": tenant_id}
    if bot_id:
        match_stage["bot_id"] = bot_id

    pipeline = [
        {"$match": match_stage},
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user"}},
        {"$group": {
            "_id": {"$toLower": "$messages.content"},
            "count": {"$sum": 1},
            "original": {"$first": "$messages.content"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]

    results = await db.conversations.aggregate(pipeline).to_list(limit)

    return [
        {"question": r["original"], "count": r["count"]}
        for r in results
    ]


@router.get("/feedback-stats")
async def get_feedback_stats(
    bot_id: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get feedback statistics (positive/negative ratio)."""
    match_stage = {"tenant_id": tenant_id, "has_feedback": True}
    if bot_id:
        match_stage["bot_id"] = bot_id

    pipeline = [
        {"$match": match_stage},
        {"$unwind": "$messages"},
        {"$match": {"messages.feedback": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": "$messages.feedback",
            "count": {"$sum": 1}
        }}
    ]

    results = await db.conversations.aggregate(pipeline).to_list(10)

    stats = {"positive": 0, "negative": 0}
    for r in results:
        if r["_id"] in stats:
            stats[r["_id"]] = r["count"]

    total = stats["positive"] + stats["negative"]
    satisfaction_rate = (stats["positive"] / total * 100) if total > 0 else 0

    return {
        "positive": stats["positive"],
        "negative": stats["negative"],
        "total": total,
        "satisfaction_rate": round(satisfaction_rate, 1)
    }


@router.get("/chatbot/{bot_id}/stats")
async def get_chatbot_stats(
    bot_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get detailed stats for a specific chatbot."""
    try:
        bot = await db.chatbots.find_one({
            "_id": ObjectId(bot_id),
            "tenant_id": tenant_id
        })
    except:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get recent conversations
    recent_convos = await db.conversations.find(
        {"bot_id": bot_id, "tenant_id": tenant_id}
    ).sort("updated_at", -1).limit(5).to_list(5)

    # Get average messages per conversation
    pipeline = [
        {"$match": {"bot_id": bot_id, "tenant_id": tenant_id}},
        {"$group": {
            "_id": None,
            "avg_messages": {"$avg": "$total_messages"},
            "total_convos": {"$sum": 1}
        }}
    ]
    avg_result = await db.conversations.aggregate(pipeline).to_list(1)
    avg_stats = avg_result[0] if avg_result else {"avg_messages": 0, "total_convos": 0}

    return {
        "bot_id": bot_id,
        "name": bot["name"],
        "total_conversations": bot.get("total_conversations", 0),
        "total_messages": bot.get("total_messages", 0),
        "avg_messages_per_conversation": round(avg_stats.get("avg_messages", 0), 1),
        "is_active": bot.get("is_active", True),
        "created_at": bot["created_at"].isoformat(),
        "recent_conversations": [
            {
                "session_id": c["session_id"],
                "messages": c.get("total_messages", 0),
                "updated_at": c["updated_at"].isoformat()
            }
            for c in recent_convos
        ]
    }


@router.get("/unanswered")
async def get_unanswered_questions(
    limit: int = Query(default=20, ge=1, le=100),
    bot_id: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get questions that received negative feedback or low-confidence responses."""
    match_stage = {"tenant_id": tenant_id}
    if bot_id:
        match_stage["bot_id"] = bot_id

    pipeline = [
        {"$match": match_stage},
        {"$unwind": "$messages"},
        {"$match": {"messages.feedback": "negative"}},
        {"$project": {
            "bot_id": 1,
            "session_id": 1,
            "message": "$messages.content",
            "timestamp": "$messages.timestamp"
        }},
        {"$sort": {"timestamp": -1}},
        {"$limit": limit}
    ]

    results = await db.conversations.aggregate(pipeline).to_list(limit)

    return [
        {
            "bot_id": r["bot_id"],
            "session_id": r["session_id"],
            "question": r["message"],
            "timestamp": r["timestamp"].isoformat()
        }
        for r in results
    ]
