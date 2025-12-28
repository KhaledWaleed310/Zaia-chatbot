"""
Importance Scorer for AIDEN Learning System

Computes importance scores for learning experiences using multiple signals
to prioritize which interactions should be crystallized into knowledge.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import math
import logging

from .base import (
    LearningExperience,
    FeedbackSignals,
    InteractionType,
    LearningConfig,
)
from .llm_provider import generate_json_with_provider

logger = logging.getLogger(__name__)


class ImportanceScorer:
    """
    Computes importance scores for learning experiences.

    Uses multiple signals:
    1. Explicit user feedback (highest weight)
    2. Conversation outcomes (leads, bookings, handoffs)
    3. Quality metrics
    4. Novelty (how different from past experiences)
    5. Semantic significance (LLM-assessed)
    """

    def __init__(self, config: LearningConfig = None):
        self.config = config or LearningConfig()

        # Weights for different signal types
        self.weights = {
            "explicit_feedback": 0.30,
            "outcome_signals": 0.25,
            "quality_metrics": 0.20,
            "novelty": 0.15,
            "semantic_significance": 0.10,
        }

    async def compute_importance(
        self,
        experience: LearningExperience,
        similar_experiences: List[LearningExperience] = None,
    ) -> float:
        """
        Compute the overall importance score for an experience.

        Returns a score between 0.0 and 1.0.
        """
        scores = {}

        # 1. Explicit feedback score
        scores["explicit_feedback"] = self._compute_explicit_score(
            experience.feedback_signals
        )

        # 2. Outcome signals score
        scores["outcome_signals"] = self._compute_outcome_score(
            experience.feedback_signals,
            experience.interaction_type
        )

        # 3. Quality metrics score
        scores["quality_metrics"] = self._compute_quality_score(
            experience.feedback_signals
        )

        # 4. Novelty score
        scores["novelty"] = await self._compute_novelty_score(
            experience,
            similar_experiences or []
        )

        # 5. Semantic significance (optional, expensive)
        if experience.importance_score < 0.5:  # Only for borderline cases
            scores["semantic_significance"] = await self._compute_semantic_score(
                experience
            )
        else:
            scores["semantic_significance"] = 0.5  # Default

        # Weighted combination
        total_score = sum(
            scores[key] * self.weights[key]
            for key in self.weights
        )

        # Apply adjustments
        total_score = self._apply_adjustments(total_score, experience)

        # Clamp to [0, 1]
        final_score = max(0.0, min(1.0, total_score))

        logger.debug(
            f"Importance scores for {experience.id}: "
            f"{scores} -> final: {final_score:.3f}"
        )

        return final_score

    def _compute_explicit_score(self, feedback: FeedbackSignals) -> float:
        """Compute score from explicit user feedback."""
        if feedback.user_rating is not None:
            # Direct mapping of user rating
            return feedback.user_rating

        # No explicit feedback
        return 0.5

    def _compute_outcome_score(
        self,
        feedback: FeedbackSignals,
        interaction_type: InteractionType
    ) -> float:
        """Compute score from conversation outcomes."""
        score = 0.5  # Neutral baseline

        # Positive outcomes
        if feedback.booking_made:
            score += 0.4
        if feedback.lead_captured:
            score += 0.3

        # Handoff signals
        if feedback.handoff_triggered:
            if feedback.handoff_resolved:
                score += 0.2  # Good handoff
            else:
                score -= 0.1  # Unresolved handoff

        # Interaction type adjustments
        if interaction_type == InteractionType.CONVERSION:
            score += 0.2
        elif interaction_type == InteractionType.FAILURE:
            # Failures are also important to learn from
            score += 0.1

        return max(0.0, min(1.0, score))

    def _compute_quality_score(self, feedback: FeedbackSignals) -> float:
        """Compute score from quality metrics."""
        scores = []

        if feedback.quality_score is not None:
            scores.append(feedback.quality_score)

        if feedback.response_relevance is not None:
            scores.append(feedback.response_relevance)

        if feedback.engagement_depth is not None:
            scores.append(feedback.engagement_depth)

        if feedback.sentiment_score is not None:
            # Normalize sentiment from [-1, 1] to [0, 1]
            normalized = (feedback.sentiment_score + 1) / 2
            scores.append(normalized)

        if not scores:
            return 0.5

        return sum(scores) / len(scores)

    async def _compute_novelty_score(
        self,
        experience: LearningExperience,
        similar_experiences: List[LearningExperience]
    ) -> float:
        """
        Compute novelty score based on similarity to past experiences.

        High novelty = more important to learn from.
        """
        if not similar_experiences:
            return 0.8  # Assume novel if no similar experiences

        # Simple approach: check content similarity
        # A more sophisticated approach would use embeddings
        current_content = f"{experience.user_message} {experience.assistant_response}"
        current_words = set(current_content.lower().split())

        similarities = []
        for past in similar_experiences:
            past_content = f"{past.user_message} {past.assistant_response}"
            past_words = set(past_content.lower().split())

            # Jaccard similarity
            intersection = len(current_words & past_words)
            union = len(current_words | past_words)
            similarity = intersection / union if union > 0 else 0

            similarities.append(similarity)

        # Average similarity
        avg_similarity = sum(similarities) / len(similarities)

        # Novelty is inverse of similarity
        novelty = 1.0 - avg_similarity

        return novelty

    async def _compute_semantic_score(
        self,
        experience: LearningExperience
    ) -> float:
        """
        Use LLM to assess semantic significance of the interaction.

        This is expensive, so only used for borderline cases.
        """
        try:
            prompt = f"""Analyze this conversation turn and rate its significance for learning on a scale of 0.0 to 1.0.

Consider:
1. Does it contain a unique insight or pattern?
2. Is this a challenging scenario the AI handled well/poorly?
3. Would learning from this improve future responses?
4. Is this a common scenario or edge case?

User message: {experience.user_message}

AI response: {experience.assistant_response}

Respond with JSON: {{"score": 0.X, "reason": "brief explanation"}}"""

            result = await generate_json_with_provider(
                prompt=prompt,
                temperature=0.3
            )

            return float(result.get("score", 0.5))

        except Exception as e:
            logger.warning(f"Semantic scoring failed: {e}")
            return 0.5

    def _apply_adjustments(
        self,
        score: float,
        experience: LearningExperience
    ) -> float:
        """Apply final adjustments to the score."""
        adjusted = score

        # Boost for failures (important to learn from mistakes)
        if experience.interaction_type == InteractionType.FAILURE:
            adjusted = min(1.0, adjusted * 1.2)

        # Boost for conversions (learn what works)
        if experience.interaction_type == InteractionType.CONVERSION:
            adjusted = min(1.0, adjusted * 1.15)

        # Decay for very old experiences
        age_days = (datetime.utcnow() - experience.created_at).days
        if age_days > 30:
            decay = math.exp(-0.01 * (age_days - 30))
            adjusted *= decay

        return adjusted

    async def score_batch(
        self,
        experiences: List[LearningExperience]
    ) -> List[LearningExperience]:
        """
        Score a batch of experiences.

        Updates the importance_score field on each experience.
        """
        for exp in experiences:
            # Find similar experiences in the batch
            similar = [
                e for e in experiences
                if e.id != exp.id and e.bot_id == exp.bot_id
            ][:5]

            exp.importance_score = await self.compute_importance(exp, similar)

        return experiences


async def compute_importance(
    experience: LearningExperience,
    similar_experiences: List[LearningExperience] = None,
) -> float:
    """Convenience function to compute importance score."""
    scorer = ImportanceScorer()
    return await scorer.compute_importance(experience, similar_experiences)
