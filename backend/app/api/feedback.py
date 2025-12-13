from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Optional
from ..schemas.feedback import (
    FeedbackCreate, FeedbackResponse, FeedbackListResponse, FeedbackStats,
    TrainingPairCreate, TrainingPairResponse, TrainingPairListResponse,
    TrainingExportFormat
)
from ..services.feedback import (
    create_feedback, list_feedback, get_feedback_stats,
    create_training_pair, list_training_pairs, update_training_pair,
    delete_training_pair, export_training_data
)
from ..api.auth import get_current_user
from ..core.database import get_mongodb

router = APIRouter(prefix="/feedback", tags=["Feedback & Training"])


def feedback_to_response(f: dict) -> dict:
    return {
        "id": f["_id"],
        "bot_id": f["bot_id"],
        "message_id": f["message_id"],
        "session_id": f["session_id"],
        "query": f.get("query", ""),
        "response": f.get("response", ""),
        "feedback_type": f["feedback_type"],
        "rating": f.get("rating"),
        "comment": f.get("comment"),
        "created_at": f["created_at"]
    }


def training_to_response(t: dict) -> dict:
    return {
        "id": t["_id"],
        "bot_id": t["bot_id"],
        "query": t["query"],
        "ideal_response": t.get("ideal_response", ""),
        "tags": t.get("tags", []),
        "source": t.get("source", "manual"),
        "approved": t.get("approved", False),
        "created_at": t["created_at"]
    }


# Public endpoint for submitting feedback
@router.post("/{bot_id}/submit")
async def submit_feedback(bot_id: str, data: FeedbackCreate):
    """Public endpoint for visitors to submit feedback."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    feedback = await create_feedback(
        bot_id=bot_id,
        tenant_id=bot["tenant_id"],
        message_id=data.message_id,
        session_id=data.session_id,
        feedback_type=data.feedback_type,
        rating=data.rating,
        comment=data.comment
    )

    return {"success": True, "feedback_id": feedback["_id"]}


@router.get("/{bot_id}", response_model=FeedbackListResponse)
async def list_bot_feedback(
    bot_id: str,
    page: int = 1,
    per_page: int = 20,
    feedback_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """List feedback for a chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    result = await list_feedback(bot_id, user["tenant_id"], page, per_page, feedback_type)

    return FeedbackListResponse(
        items=[feedback_to_response(f) for f in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        pages=result["pages"]
    )


@router.get("/{bot_id}/stats", response_model=FeedbackStats)
async def get_bot_feedback_stats(
    bot_id: str,
    days: int = 30,
    user: dict = Depends(get_current_user)
):
    """Get feedback statistics."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    return await get_feedback_stats(bot_id, user["tenant_id"], days)


# Training pairs endpoints
@router.get("/{bot_id}/training", response_model=TrainingPairListResponse)
async def list_bot_training_pairs(
    bot_id: str,
    page: int = 1,
    per_page: int = 20,
    approved_only: bool = False,
    user: dict = Depends(get_current_user)
):
    """List training pairs for a chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    result = await list_training_pairs(bot_id, user["tenant_id"], page, per_page, approved_only)

    return TrainingPairListResponse(
        items=[training_to_response(t) for t in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        pages=result["pages"]
    )


@router.post("/{bot_id}/training", response_model=TrainingPairResponse)
async def create_bot_training_pair(
    bot_id: str,
    data: TrainingPairCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new training pair."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    pair = await create_training_pair(
        bot_id=bot_id,
        tenant_id=user["tenant_id"],
        query=data.query,
        ideal_response=data.ideal_response,
        tags=data.tags,
        source=data.source
    )

    return training_to_response(pair)


@router.patch("/{bot_id}/training/{pair_id}", response_model=TrainingPairResponse)
async def update_bot_training_pair(
    bot_id: str,
    pair_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a training pair."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Filter allowed fields
    allowed = {"query", "ideal_response", "tags", "approved"}
    update_data = {k: v for k, v in data.items() if k in allowed}

    updated = await update_training_pair(pair_id, user["tenant_id"], update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Training pair not found")

    return training_to_response(updated)


@router.delete("/{bot_id}/training/{pair_id}")
async def delete_bot_training_pair(
    bot_id: str,
    pair_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a training pair."""
    success = await delete_training_pair(pair_id, user["tenant_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Training pair not found")

    return {"message": "Training pair deleted"}


@router.get("/{bot_id}/training/export")
async def export_bot_training_data(
    bot_id: str,
    format: TrainingExportFormat = TrainingExportFormat.JSON,
    approved_only: bool = True,
    user: dict = Depends(get_current_user)
):
    """Export training data."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    content = await export_training_data(bot_id, user["tenant_id"], format.value, approved_only)

    media_types = {
        "json": "application/json",
        "jsonl": "application/jsonl",
        "csv": "text/csv"
    }

    return Response(
        content=content,
        media_type=media_types.get(format.value, "application/json"),
        headers={"Content-Disposition": f"attachment; filename=training_{bot_id}.{format.value}"}
    )
