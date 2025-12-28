"""
Experience Replay System for AIDEN

PATENT CLAIM: A method for reinforcing learning in API-based AI systems
through selective replay of past experiences with importance weighting.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import random
import logging

from .base import (
    LearningExperience,
    LearningConfig,
    LearningOutcome,
    InteractionType,
)
from .feedback_collector import FeedbackCollector
from .llm_provider import generate_with_provider, generate_json_with_provider
from ...core.database import get_mongodb

logger = logging.getLogger(__name__)


class ExperienceReplaySystem:
    """
    Periodically replays important past experiences to:
    1. Reinforce successful patterns
    2. Learn from failures
    3. Maintain knowledge freshness
    4. Detect improvements or regressions
    """

    def __init__(self, config: LearningConfig = None):
        self.config = config or LearningConfig()
        self.db = None

    async def _get_db(self):
        if self.db is None:
            self.db = get_mongodb()
        return self.db

    async def replay_batch(
        self,
        bot_id: str = None,
        sample_size: int = None
    ) -> LearningOutcome:
        """
        Replay a batch of experiences and extract learnings.

        This is designed to be run during the nightly batch process.
        """
        sample_size = sample_size or self.config.replay_sample_size
        outcome = LearningOutcome(operation="experience_replay")
        start_time = datetime.utcnow()

        try:
            # Select experiences for replay
            experiences = await self.select_replay_candidates(
                bot_id=bot_id,
                limit=sample_size
            )

            if not experiences:
                logger.info("No experiences selected for replay")
                return outcome

            outcome.items_processed = len(experiences)
            improvements = 0
            regressions = 0

            # Replay each experience
            for exp in experiences:
                result = await self.replay_experience(exp)

                if result.get("improved"):
                    improvements += 1
                    await self._record_improvement(exp, result)
                elif result.get("regressed"):
                    regressions += 1
                    await self._record_regression(exp, result)

            outcome.items_learned = improvements
            outcome.details = {
                "improvements": improvements,
                "regressions": regressions,
                "neutral": len(experiences) - improvements - regressions
            }

            outcome.success = True
            outcome.completed_at = datetime.utcnow()
            outcome.duration_seconds = (outcome.completed_at - start_time).total_seconds()

            logger.info(
                f"Experience replay complete: {improvements} improvements, "
                f"{regressions} regressions out of {len(experiences)}"
            )

        except Exception as e:
            logger.error(f"Experience replay failed: {e}", exc_info=True)
            outcome.success = False
            outcome.errors.append(str(e))

        return outcome

    async def select_replay_candidates(
        self,
        bot_id: str = None,
        limit: int = 100
    ) -> List[LearningExperience]:
        """
        Select experiences for replay using prioritized sampling.

        Selection criteria:
        1. High-importance experiences (recent successes/failures)
        2. Landmark experiences (major learnings)
        3. Random sample (exploration)
        """
        db = await self._get_db()

        candidates = []

        # 1. Recent high-importance experiences (40%)
        recent_limit = int(limit * 0.4)
        recent = await self._get_recent_important(bot_id, recent_limit)
        candidates.extend(recent)

        # 2. Landmark experiences (30%)
        landmark_limit = int(limit * 0.3)
        landmarks = await self._get_landmark_experiences(bot_id, landmark_limit)
        candidates.extend(landmarks)

        # 3. Random sample (30%)
        random_limit = limit - len(candidates)
        random_sample = await self._get_random_sample(bot_id, random_limit)
        candidates.extend(random_sample)

        # Deduplicate
        seen_ids = set()
        unique = []
        for exp in candidates:
            if exp.id not in seen_ids:
                seen_ids.add(exp.id)
                unique.append(exp)

        return unique[:limit]

    async def _get_recent_important(
        self,
        bot_id: str,
        limit: int
    ) -> List[LearningExperience]:
        """Get recent high-importance experiences."""
        db = await self._get_db()

        cutoff = datetime.utcnow() - timedelta(days=7)
        query = {
            "created_at": {"$gte": cutoff},
            "importance_score": {"$gte": 0.7}
        }
        if bot_id:
            query["bot_id"] = bot_id

        cursor = db.learning_experiences.find(query).sort(
            "importance_score", -1
        ).limit(limit)

        experiences = []
        async for doc in cursor:
            experiences.append(LearningExperience.from_dict(doc))

        return experiences

    async def _get_landmark_experiences(
        self,
        bot_id: str,
        limit: int
    ) -> List[LearningExperience]:
        """Get landmark experiences (marked as particularly valuable)."""
        db = await self._get_db()

        query = {"is_landmark": True}
        if bot_id:
            query["bot_id"] = bot_id

        cursor = db.learning_experiences.find(query).sort(
            "importance_score", -1
        ).limit(limit)

        experiences = []
        async for doc in cursor:
            experiences.append(LearningExperience.from_dict(doc))

        return experiences

    async def _get_random_sample(
        self,
        bot_id: str,
        limit: int
    ) -> List[LearningExperience]:
        """Get a random sample of experiences."""
        db = await self._get_db()

        # Use MongoDB's $sample aggregation
        pipeline = [{"$sample": {"size": limit}}]
        if bot_id:
            pipeline.insert(0, {"$match": {"bot_id": bot_id}})

        cursor = db.learning_experiences.aggregate(pipeline)

        experiences = []
        async for doc in cursor:
            experiences.append(LearningExperience.from_dict(doc))

        return experiences

    async def replay_experience(
        self,
        experience: LearningExperience
    ) -> Dict[str, Any]:
        """
        Replay an experience with current knowledge and compare.

        Returns comparison results indicating if the system has improved.
        """
        db = await self._get_db()

        # Get current bot configuration
        bot = await db.chatbots.find_one({"_id": experience.bot_id})
        if not bot:
            return {"error": "Bot not found"}

        # Get current learned patterns
        from .memory_crystallizer import MemoryCrystallizer
        crystallizer = MemoryCrystallizer(self.config)
        patterns = await crystallizer.get_applicable_patterns(
            bot_id=experience.bot_id,
            intent=experience.detected_intent
        )

        # Generate new response with current knowledge
        system_prompt = bot.get("system_prompt", "")

        # Add pattern guidance if available
        if patterns:
            pattern_guidance = "\n\n## Learned Best Practices:\n"
            for p in patterns[:3]:
                pattern_guidance += f"- {p.pattern_description}\n"
            system_prompt += pattern_guidance

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add conversation history up to this point
        for msg in experience.conversation_history:
            messages.append(msg)

        messages.append({"role": "user", "content": experience.user_message})

        try:
            new_response = await generate_with_provider(
                prompt=experience.user_message,
                system_prompt=system_prompt,
                temperature=0.7
            )

            # Compare responses
            comparison = await self._compare_responses(
                original=experience.assistant_response,
                new=new_response,
                user_message=experience.user_message,
                context=experience.context_used
            )

            return {
                "original_response": experience.assistant_response,
                "new_response": new_response,
                "improved": comparison.get("new_is_better", False),
                "regressed": comparison.get("original_is_better", False),
                "comparison": comparison,
                "patterns_used": [p.id for p in patterns]
            }

        except Exception as e:
            logger.error(f"Replay failed: {e}")
            return {"error": str(e)}

    async def _compare_responses(
        self,
        original: str,
        new: str,
        user_message: str,
        context: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compare two responses using LLM evaluation."""

        prompt = f"""Compare these two AI responses to the same user message.

USER MESSAGE:
{user_message}

RESPONSE A (Original):
{original}

RESPONSE B (New):
{new}

Evaluate both responses on:
1. Relevance to the user's question
2. Accuracy (if context is available)
3. Helpfulness
4. Clarity and conciseness
5. Professionalism

Respond with JSON:
{{
    "response_a_score": 0.X,
    "response_b_score": 0.X,
    "original_is_better": true/false,
    "new_is_better": true/false,
    "analysis": "Brief explanation of differences",
    "improvement_areas": ["what the new response does better"],
    "regression_areas": ["what the original did better"]
}}"""

        try:
            result = await generate_json_with_provider(
                prompt=prompt,
                temperature=0.3
            )
            return result
        except Exception as e:
            logger.error(f"Response comparison failed: {e}")
            return {"error": str(e)}

    async def _record_improvement(
        self,
        experience: LearningExperience,
        result: Dict[str, Any]
    ) -> None:
        """Record an improvement for learning."""
        db = await self._get_db()

        await db.replay_improvements.insert_one({
            "experience_id": experience.id,
            "bot_id": experience.bot_id,
            "original_response": result.get("original_response"),
            "new_response": result.get("new_response"),
            "comparison": result.get("comparison"),
            "patterns_used": result.get("patterns_used", []),
            "created_at": datetime.utcnow()
        })

        # Mark experience as a positive learning example
        await db.learning_experiences.update_one(
            {"_id": experience.id},
            {"$set": {"replay_improved": True, "last_replayed": datetime.utcnow()}}
        )

    async def _record_regression(
        self,
        experience: LearningExperience,
        result: Dict[str, Any]
    ) -> None:
        """Record a regression for investigation."""
        db = await self._get_db()

        await db.replay_regressions.insert_one({
            "experience_id": experience.id,
            "bot_id": experience.bot_id,
            "original_response": result.get("original_response"),
            "new_response": result.get("new_response"),
            "comparison": result.get("comparison"),
            "patterns_used": result.get("patterns_used", []),
            "created_at": datetime.utcnow(),
            "investigated": False
        })

        # Mark as landmark (preserve the original as valuable)
        await db.learning_experiences.update_one(
            {"_id": experience.id},
            {
                "$set": {
                    "is_landmark": True,
                    "last_replayed": datetime.utcnow()
                }
            }
        )

    async def mark_as_landmark(
        self,
        experience_id: str,
        reason: str = None
    ) -> bool:
        """Mark an experience as a landmark for future reference."""
        db = await self._get_db()

        result = await db.learning_experiences.update_one(
            {"_id": experience_id},
            {
                "$set": {
                    "is_landmark": True,
                    "landmark_reason": reason,
                    "marked_landmark_at": datetime.utcnow()
                }
            }
        )

        return result.modified_count > 0


# Convenience function
async def replay_experiences(
    bot_id: str = None,
    sample_size: int = 100
) -> LearningOutcome:
    """Replay experiences for learning."""
    replay_system = ExperienceReplaySystem()
    return await replay_system.replay_batch(bot_id, sample_size)
