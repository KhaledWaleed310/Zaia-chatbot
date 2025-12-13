from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid
import json
import csv
import io
from ..core.database import get_mongodb
from ..schemas.feedback import FeedbackType


async def create_feedback(
    bot_id: str,
    tenant_id: str,
    message_id: str,
    session_id: str,
    feedback_type: FeedbackType,
    rating: Optional[int] = None,
    comment: Optional[str] = None
) -> Dict[str, Any]:
    """Create feedback for a message."""
    db = get_mongodb()

    # Get the message to store query/response
    message = await db.messages.find_one({"_id": message_id})
    query = ""
    response = ""

    if message and message.get("role") == "assistant":
        response = message.get("content", "")
        query = message.get("query", "")
    elif message and message.get("role") == "user":
        # This shouldn't happen usually, but handle it
        query = message.get("content", "")

    feedback = {
        "_id": str(uuid.uuid4()),
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "message_id": message_id,
        "session_id": session_id,
        "query": query,
        "response": response,
        "feedback_type": feedback_type.value,
        "rating": rating,
        "comment": comment,
        "created_at": datetime.utcnow()
    }

    await db.feedback.insert_one(feedback)

    # If negative feedback, potentially create training pair suggestion
    if feedback_type == FeedbackType.THUMBS_DOWN and query and response:
        await create_training_suggestion(bot_id, tenant_id, query, response, "negative_feedback")

    return feedback


async def list_feedback(
    bot_id: str,
    tenant_id: str,
    page: int = 1,
    per_page: int = 20,
    feedback_type: Optional[str] = None
) -> Dict[str, Any]:
    """List feedback with pagination."""
    db = get_mongodb()

    query = {"bot_id": bot_id, "tenant_id": tenant_id}
    if feedback_type:
        query["feedback_type"] = feedback_type

    total = await db.feedback.count_documents(query)
    pages = (total + per_page - 1) // per_page

    skip = (page - 1) * per_page
    items = await db.feedback.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages
    }


async def get_feedback_stats(bot_id: str, tenant_id: str, days: int = 30) -> Dict[str, Any]:
    """Get feedback statistics."""
    db = get_mongodb()
    start_date = datetime.utcnow() - timedelta(days=days)

    query = {"bot_id": bot_id, "tenant_id": tenant_id, "created_at": {"$gte": start_date}}

    # Total feedback
    total = await db.feedback.count_documents(query)

    # By type
    thumbs_up = await db.feedback.count_documents({**query, "feedback_type": "thumbs_up"})
    thumbs_down = await db.feedback.count_documents({**query, "feedback_type": "thumbs_down"})

    # Average rating
    rating_pipeline = [
        {"$match": {**query, "rating": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
    ]
    avg_rating = 0
    async for doc in db.feedback.aggregate(rating_pipeline):
        avg_rating = doc.get("avg", 0)

    # Positive rate
    total_thumbs = thumbs_up + thumbs_down
    positive_rate = (thumbs_up / total_thumbs * 100) if total_thumbs > 0 else 0

    # Feedback rate (messages with feedback / total assistant messages)
    total_messages = await db.messages.count_documents({
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "role": "assistant",
        "timestamp": {"$gte": start_date}
    })
    feedback_rate = (total / total_messages * 100) if total_messages > 0 else 0

    return {
        "total_feedback": total,
        "thumbs_up": thumbs_up,
        "thumbs_down": thumbs_down,
        "average_rating": round(avg_rating, 2),
        "positive_rate": round(positive_rate, 1),
        "feedback_rate": round(feedback_rate, 1)
    }


async def create_training_suggestion(
    bot_id: str,
    tenant_id: str,
    query: str,
    original_response: str,
    source: str
):
    """Create a training pair suggestion from feedback."""
    db = get_mongodb()

    # Check if already exists
    existing = await db.training_pairs.find_one({
        "bot_id": bot_id,
        "query": query
    })

    if existing:
        return existing

    suggestion = {
        "_id": str(uuid.uuid4()),
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "query": query,
        "original_response": original_response,
        "ideal_response": "",  # To be filled by user
        "tags": [],
        "source": source,
        "approved": False,
        "created_at": datetime.utcnow()
    }

    await db.training_pairs.insert_one(suggestion)
    return suggestion


async def create_training_pair(
    bot_id: str,
    tenant_id: str,
    query: str,
    ideal_response: str,
    tags: List[str] = None,
    source: str = "manual"
) -> Dict[str, Any]:
    """Create a training pair."""
    db = get_mongodb()

    pair = {
        "_id": str(uuid.uuid4()),
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "query": query,
        "ideal_response": ideal_response,
        "tags": tags or [],
        "source": source,
        "approved": source == "manual",  # Auto-approve manual entries
        "created_at": datetime.utcnow()
    }

    await db.training_pairs.insert_one(pair)
    return pair


async def list_training_pairs(
    bot_id: str,
    tenant_id: str,
    page: int = 1,
    per_page: int = 20,
    approved_only: bool = False
) -> Dict[str, Any]:
    """List training pairs."""
    db = get_mongodb()

    query = {"bot_id": bot_id, "tenant_id": tenant_id}
    if approved_only:
        query["approved"] = True

    total = await db.training_pairs.count_documents(query)
    pages = (total + per_page - 1) // per_page

    skip = (page - 1) * per_page
    items = await db.training_pairs.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages
    }


async def update_training_pair(
    pair_id: str,
    tenant_id: str,
    data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update a training pair."""
    db = get_mongodb()

    result = await db.training_pairs.find_one_and_update(
        {"_id": pair_id, "tenant_id": tenant_id},
        {"$set": data},
        return_document=True
    )

    return result


async def delete_training_pair(pair_id: str, tenant_id: str) -> bool:
    """Delete a training pair."""
    db = get_mongodb()
    result = await db.training_pairs.delete_one({"_id": pair_id, "tenant_id": tenant_id})
    return result.deleted_count > 0


async def export_training_data(
    bot_id: str,
    tenant_id: str,
    format: str = "json",
    approved_only: bool = True
) -> str:
    """Export training pairs to various formats."""
    db = get_mongodb()

    query = {"bot_id": bot_id, "tenant_id": tenant_id}
    if approved_only:
        query["approved"] = True

    pairs = await db.training_pairs.find(query).to_list(None)

    if format == "jsonl":
        # JSONL format (one JSON per line, good for fine-tuning)
        lines = []
        for p in pairs:
            lines.append(json.dumps({
                "messages": [
                    {"role": "user", "content": p["query"]},
                    {"role": "assistant", "content": p["ideal_response"]}
                ]
            }))
        return "\n".join(lines)

    elif format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["query", "ideal_response", "tags", "source"])
        writer.writeheader()
        for p in pairs:
            writer.writerow({
                "query": p["query"],
                "ideal_response": p["ideal_response"],
                "tags": ",".join(p.get("tags", [])),
                "source": p.get("source", "")
            })
        return output.getvalue()

    else:
        # JSON format
        return json.dumps([
            {
                "id": p["_id"],
                "query": p["query"],
                "ideal_response": p["ideal_response"],
                "tags": p.get("tags", []),
                "source": p.get("source", ""),
                "created_at": p["created_at"].isoformat()
            }
            for p in pairs
        ], indent=2)
