"""
Feedback Collector for AIDEN Learning System

Collects both explicit (user ratings) and implicit (analytics) feedback
to create learning signals for the self-improvement pipeline.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from .base import (
    LearningExperience,
    FeedbackSignals,
    InteractionType,
    LearningConfig,
)
from ...core.database import get_mongodb

logger = logging.getLogger(__name__)


class FeedbackCollector:
    """
    Collects and aggregates feedback signals from multiple sources.

    Sources:
    1. Explicit feedback (thumbs up/down from users)
    2. Quality scores (from existing analytics)
    3. Sentiment analysis
    4. Conversation outcomes (leads, bookings, handoffs)
    5. Engagement metrics
    """

    def __init__(self, config: LearningConfig = None):
        self.config = config or LearningConfig()
        self.db = None

    async def _get_db(self):
        """Get database connection."""
        if self.db is None:
            self.db = get_mongodb()
        return self.db

    async def record_explicit_feedback(
        self,
        bot_id: str,
        session_id: str,
        message_id: str,
        feedback_type: str,  # "positive" or "negative"
        comment: Optional[str] = None,
        tenant_id: str = None,
    ) -> Dict[str, Any]:
        """
        Record explicit user feedback (thumbs up/down).

        Returns the updated feedback record.
        """
        db = await self._get_db()

        rating = 1.0 if feedback_type == "positive" else 0.0

        feedback_record = {
            "_id": f"{session_id}:{message_id}:explicit",
            "bot_id": bot_id,
            "tenant_id": tenant_id,
            "session_id": session_id,
            "message_id": message_id,
            "feedback_type": "explicit",
            "rating": rating,
            "comment": comment,
            "created_at": datetime.utcnow(),
        }

        await db.learning_feedback.update_one(
            {"_id": feedback_record["_id"]},
            {"$set": feedback_record},
            upsert=True
        )

        # Also update the message with feedback
        await db.messages.update_one(
            {"_id": message_id},
            {
                "$set": {
                    "user_feedback": {
                        "rating": rating,
                        "type": feedback_type,
                        "comment": comment,
                        "timestamp": datetime.utcnow()
                    }
                }
            }
        )

        logger.info(f"Recorded explicit feedback for message {message_id}: {feedback_type}")
        return feedback_record

    async def collect_session_feedback(
        self,
        session_id: str,
        bot_id: str,
        tenant_id: str,
    ) -> FeedbackSignals:
        """
        Collect all feedback signals for a session.

        Aggregates explicit and implicit feedback into a FeedbackSignals object.
        """
        db = await self._get_db()

        # Get explicit feedback for session
        explicit_feedbacks = await db.learning_feedback.find({
            "session_id": session_id,
            "feedback_type": "explicit"
        }).to_list(length=100)

        # Calculate average explicit rating
        user_rating = None
        if explicit_feedbacks:
            ratings = [f["rating"] for f in explicit_feedbacks]
            user_rating = sum(ratings) / len(ratings)

        # Get messages for implicit signals
        messages = await db.messages.find({
            "session_id": session_id,
            "bot_id": bot_id
        }).to_list(length=100)

        # Calculate quality score average
        quality_scores = [
            m.get("quality_score", {}).get("overall", 0.5)
            for m in messages
            if m.get("role") == "assistant" and m.get("quality_score")
        ]
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else None

        # Calculate engagement depth
        user_messages = [m for m in messages if m.get("role") == "user"]
        engagement_depth = min(1.0, len(user_messages) / 10.0)  # Normalize to 0-1

        # Calculate sentiment
        sentiments = [
            m.get("sentiment", {}).get("score", 0.0)
            for m in messages
            if m.get("role") == "user" and m.get("sentiment")
        ]
        avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else None

        # Check for outcomes
        lead_captured = await db.leads.find_one({
            "session_id": session_id,
            "bot_id": bot_id
        }) is not None

        booking_made = await db.bookings.find_one({
            "session_id": session_id,
            "bot_id": bot_id
        }) is not None

        handoff = await db.handoffs.find_one({
            "session_id": session_id,
            "bot_id": bot_id
        })
        handoff_triggered = handoff is not None
        handoff_resolved = handoff.get("status") == "resolved" if handoff else False

        return FeedbackSignals(
            user_rating=user_rating,
            quality_score=avg_quality,
            engagement_depth=engagement_depth,
            conversation_length=len(messages),
            lead_captured=lead_captured,
            booking_made=booking_made,
            handoff_triggered=handoff_triggered,
            handoff_resolved=handoff_resolved,
            sentiment_score=avg_sentiment,
        )

    async def collect_message_feedback(
        self,
        message_id: str,
        session_id: str,
        bot_id: str,
    ) -> FeedbackSignals:
        """
        Collect feedback signals for a specific message.
        """
        db = await self._get_db()

        message = await db.messages.find_one({"_id": message_id})
        if not message:
            return FeedbackSignals()

        # Get explicit feedback
        explicit = await db.learning_feedback.find_one({
            "message_id": message_id,
            "feedback_type": "explicit"
        })
        user_rating = explicit.get("rating") if explicit else None

        # Get quality score
        quality_score = message.get("quality_score", {}).get("overall")

        # Get sentiment from the user message that triggered this response
        # (If this is an assistant message, look at the preceding user message)
        response_relevance = None
        if message.get("role") == "assistant":
            quality_data = message.get("quality_score", {})
            response_relevance = quality_data.get("relevance")

        return FeedbackSignals(
            user_rating=user_rating,
            quality_score=quality_score,
            response_relevance=response_relevance,
        )

    async def create_learning_experience(
        self,
        session_id: str,
        bot_id: str,
        tenant_id: str,
        user_message: str,
        assistant_response: str,
        context_used: List[Dict[str, Any]] = None,
        conversation_history: List[Dict[str, str]] = None,
        extracted_facts: Dict[str, Any] = None,
        detected_intent: str = None,
        conversation_stage: str = None,
    ) -> LearningExperience:
        """
        Create a learning experience from a conversation turn.

        This is called after each response to capture the interaction
        for potential learning.
        """
        # Collect feedback signals
        feedback = await self.collect_session_feedback(
            session_id=session_id,
            bot_id=bot_id,
            tenant_id=tenant_id
        )

        # Determine interaction type based on signals
        interaction_type = self._classify_interaction(feedback)

        # Compute importance score
        importance = feedback.compute_composite_score(self.config)

        experience = LearningExperience(
            bot_id=bot_id,
            tenant_id=tenant_id,
            session_id=session_id,
            interaction_type=interaction_type,
            user_message=user_message,
            assistant_response=assistant_response,
            context_used=context_used or [],
            importance_score=importance,
            feedback_signals=feedback,
            conversation_history=conversation_history or [],
            extracted_facts=extracted_facts or {},
            detected_intent=detected_intent,
            conversation_stage=conversation_stage,
        )

        # Store the experience
        db = await self._get_db()
        await db.learning_experiences.insert_one(experience.to_dict())

        logger.debug(f"Created learning experience for session {session_id}, importance: {importance:.2f}")
        return experience

    def _classify_interaction(self, feedback: FeedbackSignals) -> InteractionType:
        """Classify the interaction type based on feedback signals."""

        # Check for conversions first
        if feedback.booking_made:
            return InteractionType.CONVERSION
        if feedback.lead_captured:
            return InteractionType.CONVERSION

        # Check for handoff
        if feedback.handoff_triggered:
            return InteractionType.HANDOFF

        # Check explicit feedback
        if feedback.user_rating is not None:
            if feedback.user_rating >= 0.7:
                return InteractionType.SUCCESS
            elif feedback.user_rating <= 0.3:
                return InteractionType.FAILURE

        # Check quality score
        if feedback.quality_score is not None:
            if feedback.quality_score >= 0.7:
                return InteractionType.SUCCESS
            elif feedback.quality_score <= 0.4:
                return InteractionType.FAILURE

        return InteractionType.NEUTRAL

    async def get_unprocessed_experiences(
        self,
        bot_id: str = None,
        min_importance: float = 0.0,
        limit: int = 1000,
    ) -> List[LearningExperience]:
        """
        Get experiences that haven't been crystallized yet.
        """
        db = await self._get_db()

        query = {"crystallized": False}
        if bot_id:
            query["bot_id"] = bot_id
        if min_importance > 0:
            query["importance_score"] = {"$gte": min_importance}

        cursor = db.learning_experiences.find(query).sort(
            "importance_score", -1
        ).limit(limit)

        experiences = []
        async for doc in cursor:
            experiences.append(LearningExperience.from_dict(doc))

        return experiences

    async def get_recent_experiences(
        self,
        bot_id: str = None,
        days: int = 7,
        limit: int = 500,
    ) -> List[LearningExperience]:
        """
        Get recent experiences for a time period.
        """
        db = await self._get_db()

        cutoff = datetime.utcnow() - timedelta(days=days)

        query = {"created_at": {"$gte": cutoff}}
        if bot_id:
            query["bot_id"] = bot_id

        cursor = db.learning_experiences.find(query).sort(
            "importance_score", -1
        ).limit(limit)

        experiences = []
        async for doc in cursor:
            experiences.append(LearningExperience.from_dict(doc))

        return experiences

    async def mark_experiences_crystallized(
        self,
        experience_ids: List[str]
    ) -> int:
        """Mark experiences as crystallized."""
        db = await self._get_db()

        result = await db.learning_experiences.update_many(
            {"_id": {"$in": experience_ids}},
            {
                "$set": {
                    "crystallized": True,
                    "processed_at": datetime.utcnow()
                }
            }
        )

        return result.modified_count


# Convenience functions
async def collect_feedback(
    session_id: str,
    bot_id: str,
    tenant_id: str,
) -> FeedbackSignals:
    """Collect all feedback signals for a session."""
    collector = FeedbackCollector()
    return await collector.collect_session_feedback(session_id, bot_id, tenant_id)


async def record_feedback(
    bot_id: str,
    session_id: str,
    message_id: str,
    feedback_type: str,
    comment: str = None,
    tenant_id: str = None,
) -> Dict[str, Any]:
    """Record explicit user feedback."""
    collector = FeedbackCollector()
    return await collector.record_explicit_feedback(
        bot_id=bot_id,
        session_id=session_id,
        message_id=message_id,
        feedback_type=feedback_type,
        comment=comment,
        tenant_id=tenant_id,
    )
