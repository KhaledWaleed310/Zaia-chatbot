"""
Learning API Endpoints for AIDEN

Provides endpoints for:
1. Collecting explicit user feedback
2. Viewing learned patterns and knowledge
3. Triggering crystallization
4. Viewing experiments and A/B tests
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from ..core.database import get_mongodb
from ..core.security import get_current_user
from ..services.learning.feedback_collector import FeedbackCollector, record_feedback
from ..services.learning.memory_crystallizer import MemoryCrystallizer, get_patterns_for_context
from ..services.learning.prompt_evolver import AdaptivePromptEvolver
from ..services.learning.meta_cognition import MetaCognitiveReflector
from ..services.learning.knowledge_synthesizer import KnowledgeSynthesizer

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learning", tags=["Learning"])


# Request/Response Models
class FeedbackRequest(BaseModel):
    message_id: str
    feedback_type: str  # "positive" or "negative"
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    success: bool
    message: str


class PatternResponse(BaseModel):
    id: str
    pattern_type: str
    description: str
    confidence: float
    evidence_count: int
    trigger_intents: List[str]
    recommended_actions: List[str]


class KnowledgeResponse(BaseModel):
    id: str
    level: str
    description: str
    rationale: str
    confidence: float
    when_to_apply: List[str]


class CrystallizationResponse(BaseModel):
    success: bool
    patterns_created: int
    patterns_updated: int
    items_processed: int
    duration_seconds: float


class InsightResponse(BaseModel):
    session_id: str
    critique_summary: str
    strengths: List[str]
    weaknesses: List[str]
    hypotheses_count: int


# Public Endpoints (Widget Access)

@router.post("/{bot_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    bot_id: str,
    feedback: FeedbackRequest,
    session_id: str = Query(..., description="Session ID"),
):
    """
    Submit explicit feedback for a message (thumbs up/down).

    This endpoint is called from the chat widget when users
    provide feedback on bot responses.
    """
    try:
        # Get tenant_id from bot
        db = get_mongodb()
        bot = await db.chatbots.find_one({"_id": bot_id})
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        tenant_id = bot["tenant_id"]

        # Record the feedback
        result = await record_feedback(
            bot_id=bot_id,
            session_id=session_id,
            message_id=feedback.message_id,
            feedback_type=feedback.feedback_type,
            comment=feedback.comment,
            tenant_id=tenant_id,
        )

        logger.info(f"Feedback recorded for message {feedback.message_id}: {feedback.feedback_type}")

        return FeedbackResponse(
            success=True,
            message="Thank you for your feedback!"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to record feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to record feedback")


# Protected Endpoints (Dashboard Access)

@router.get("/{bot_id}/patterns", response_model=List[PatternResponse])
async def get_learned_patterns(
    bot_id: str,
    limit: int = Query(20, le=100),
    pattern_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Get learned patterns for a bot.

    Returns patterns that have been crystallized from conversation experiences.
    """
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["tenant_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    # Build query
    query = {
        "$or": [
            {"bot_id": bot_id},
            {"scope": "global"}
        ]
    }
    if pattern_type:
        query["pattern_type"] = pattern_type

    cursor = db.learned_patterns.find(query).sort(
        "confidence", -1
    ).limit(limit)

    patterns = []
    async for doc in cursor:
        patterns.append(PatternResponse(
            id=doc["_id"],
            pattern_type=doc.get("pattern_type", "unknown"),
            description=doc.get("pattern_description", ""),
            confidence=doc.get("confidence", 0),
            evidence_count=doc.get("evidence_count", 0),
            trigger_intents=doc.get("trigger_intents", []),
            recommended_actions=doc.get("recommended_actions", []),
        ))

    return patterns


@router.get("/{bot_id}/knowledge", response_model=List[KnowledgeResponse])
async def get_crystallized_knowledge(
    bot_id: str,
    limit: int = Query(20, le=100),
    level: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Get crystallized knowledge (strategies and principles).

    Returns higher-level knowledge synthesized from patterns.
    """
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["tenant_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    query = {
        "$or": [
            {"scope": "global"},
            {"bot_id": bot_id}
        ]
    }
    if level:
        query["level"] = level

    cursor = db.crystallized_knowledge.find(query).sort(
        [("level", 1), ("confidence", -1)]
    ).limit(limit)

    knowledge = []
    async for doc in cursor:
        knowledge.append(KnowledgeResponse(
            id=doc["_id"],
            level=doc.get("level", "unknown"),
            description=doc.get("description", ""),
            rationale=doc.get("rationale", ""),
            confidence=doc.get("confidence", 0),
            when_to_apply=doc.get("when_to_apply", []),
        ))

    return knowledge


@router.post("/{bot_id}/crystallize", response_model=CrystallizationResponse)
async def trigger_crystallization(
    bot_id: str,
    hours: int = Query(24, description="Hours of experiences to process"),
    current_user: dict = Depends(get_current_user),
):
    """
    Manually trigger crystallization for a bot.

    This processes recent experiences and extracts learned patterns.
    Normally runs automatically as part of the nightly batch.
    """
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["tenant_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    crystallizer = MemoryCrystallizer()
    outcome = await crystallizer.crystallize_batch(
        bot_id=bot_id,
        tenant_id=current_user["tenant_id"],
        hours=hours
    )

    return CrystallizationResponse(
        success=outcome.success,
        patterns_created=outcome.patterns_created,
        patterns_updated=outcome.patterns_updated,
        items_processed=outcome.items_processed,
        duration_seconds=outcome.duration_seconds,
    )


@router.get("/{bot_id}/insights", response_model=List[InsightResponse])
async def get_reflection_insights(
    bot_id: str,
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
):
    """
    Get self-reflection insights for a bot.

    Returns results of meta-cognitive analysis on conversations.
    """
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["tenant_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    cursor = db.reflection_insights.find({
        "bot_id": bot_id
    }).sort("created_at", -1).limit(limit)

    insights = []
    async for doc in cursor:
        insights.append(InsightResponse(
            session_id=doc.get("session_id", ""),
            critique_summary=doc.get("critique_summary", ""),
            strengths=doc.get("strengths", []),
            weaknesses=doc.get("weaknesses", []),
            hypotheses_count=len(doc.get("hypotheses", [])),
        ))

    return insights


@router.get("/{bot_id}/experiments")
async def get_prompt_experiments(
    bot_id: str,
    status: Optional[str] = Query(None, description="Filter by status: testing, promoted, retired"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get prompt evolution experiments (A/B tests).

    Returns information about prompt variants being tested.
    """
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["tenant_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    query = {"bot_id": bot_id}
    if status:
        query["status"] = status

    cursor = db.prompt_variants.find(query).sort("created_at", -1).limit(20)

    variants = []
    async for doc in cursor:
        variants.append({
            "id": doc["_id"],
            "status": doc.get("status", "unknown"),
            "sample_size": doc.get("sample_size", 0),
            "avg_quality_score": round(doc.get("avg_quality_score", 0), 3),
            "avg_user_satisfaction": round(doc.get("avg_user_satisfaction", 0), 3),
            "conversion_rate": round(doc.get("conversion_rate", 0), 3),
            "created_at": doc.get("created_at"),
            "promoted_at": doc.get("promoted_at"),
        })

    return {"experiments": variants}


@router.get("/{bot_id}/stats")
async def get_learning_stats(
    bot_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get learning system statistics for a bot.
    """
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["tenant_id"]
    })
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    # Count various entities
    total_experiences = await db.learning_experiences.count_documents({"bot_id": bot_id})
    crystallized = await db.learning_experiences.count_documents({
        "bot_id": bot_id,
        "crystallized": True
    })

    patterns = await db.learned_patterns.count_documents({
        "$or": [{"bot_id": bot_id}, {"scope": "global"}]
    })

    knowledge = await db.crystallized_knowledge.count_documents({
        "$or": [{"scope": "global"}]
    })

    # Get feedback counts
    positive_feedback = await db.learning_feedback.count_documents({
        "bot_id": bot_id,
        "feedback_type": "explicit",
        "rating": 1.0
    })
    negative_feedback = await db.learning_feedback.count_documents({
        "bot_id": bot_id,
        "feedback_type": "explicit",
        "rating": 0.0
    })

    # Get prompt evolution info
    active_experiments = await db.prompt_variants.count_documents({
        "bot_id": bot_id,
        "status": "testing"
    })

    return {
        "experiences": {
            "total": total_experiences,
            "crystallized": crystallized,
            "pending": total_experiences - crystallized,
        },
        "patterns": patterns,
        "knowledge": knowledge,
        "feedback": {
            "positive": positive_feedback,
            "negative": negative_feedback,
            "total": positive_feedback + negative_feedback,
        },
        "experiments": {
            "active": active_experiments,
        },
        "prompt_evolved_at": bot.get("prompt_evolved_at"),
    }
