"""
Meta-Cognitive Reflection Loop for AIDEN

PATENT CLAIM: An architecture enabling AI systems to evaluate their own
performance and generate improvement hypotheses without human intervention.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import json
import logging

from .base import (
    ReflectionResult,
    LearningExperience,
    LearningConfig,
    InteractionType,
)
from .llm_provider import generate_json_with_provider, generate_with_provider
from ...core.database import get_mongodb

logger = logging.getLogger(__name__)


@dataclass
class Hypothesis:
    """An improvement hypothesis generated through reflection."""
    id: str
    description: str
    category: str  # "prompt", "retrieval", "response_style", "knowledge_gap"
    confidence: float
    suggested_action: str
    evidence: List[str]
    tested: bool = False
    test_result: Optional[float] = None


class MetaCognitiveReflector:
    """
    Self-reflection system that enables the AI to evaluate its own performance
    and generate improvement hypotheses.

    Components:
    1. Self-Critique: Evaluates response quality
    2. Pattern Recognition: Identifies failure patterns
    3. Hypothesis Generation: Proposes improvements
    4. Experiment Design: Plans how to test hypotheses
    """

    def __init__(self, config: LearningConfig = None):
        self.config = config or LearningConfig()
        self.db = None

    async def _get_db(self):
        if self.db is None:
            self.db = get_mongodb()
        return self.db

    async def reflect_on_session(
        self,
        session_id: str,
        bot_id: str,
    ) -> ReflectionResult:
        """
        Perform meta-cognitive reflection on a completed session.

        Returns insights about what worked, what didn't, and how to improve.
        """
        db = await self._get_db()

        # Get conversation
        conversation = await db.conversations.find_one({
            "session_id": session_id,
            "bot_id": bot_id
        })

        if not conversation:
            return ReflectionResult(session_id=session_id, bot_id=bot_id)

        messages = conversation.get("messages", [])
        if len(messages) < 2:
            return ReflectionResult(session_id=session_id, bot_id=bot_id)

        # Get outcome data
        outcome = await self._get_session_outcome(session_id, bot_id)

        # 1. Self-critique
        critique = await self._self_critique(messages, outcome)

        # 2. Find similar failures
        similar_failures = await self._find_similar_failures(
            bot_id, critique.get("weaknesses", [])
        )

        # 3. Generate hypotheses
        hypotheses = await self._generate_hypotheses(
            critique, similar_failures, messages
        )

        # 4. Store reflection
        result = ReflectionResult(
            session_id=session_id,
            bot_id=bot_id,
            critique_summary=critique.get("summary", ""),
            strengths=critique.get("strengths", []),
            weaknesses=critique.get("weaknesses", []),
            hypotheses=[h.__dict__ for h in hypotheses],
            confidence=critique.get("confidence", 0.5),
        )

        await self._store_reflection(result)

        return result

    async def _self_critique(
        self,
        messages: List[Dict[str, str]],
        outcome: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use the LLM to critique its own responses."""

        # Format conversation
        conv_text = "\n".join([
            f"{m.get('role', 'unknown').upper()}: {m.get('content', '')}"
            for m in messages[-20:]  # Last 20 messages
        ])

        prompt = f"""Analyze this conversation and evaluate the AI's performance.

CONVERSATION:
{conv_text}

OUTCOME:
- Lead captured: {outcome.get('lead_captured', False)}
- Booking made: {outcome.get('booking_made', False)}
- Handoff triggered: {outcome.get('handoff_triggered', False)}
- User satisfied: {outcome.get('user_satisfied', 'unknown')}

Evaluate:
1. What did the AI do well?
2. What could be improved?
3. Were there misunderstandings?
4. Was the user's intent fully addressed?
5. Rate overall performance (0.0-1.0)

Respond with JSON:
{{
    "summary": "Brief overall assessment",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "misunderstandings": ["any misunderstandings"],
    "user_intent_addressed": true/false,
    "confidence": 0.X,
    "improvement_areas": ["area1", "area2"]
}}"""

        try:
            result = await generate_json_with_provider(
                prompt=prompt,
                temperature=0.3
            )
            return result
        except Exception as e:
            logger.error(f"Self-critique failed: {e}")
            return {"summary": "Critique failed", "strengths": [], "weaknesses": []}

    async def _get_session_outcome(
        self,
        session_id: str,
        bot_id: str
    ) -> Dict[str, Any]:
        """Get outcome data for a session."""
        db = await self._get_db()

        outcome = {
            "lead_captured": False,
            "booking_made": False,
            "handoff_triggered": False,
            "user_satisfied": None,
        }

        # Check for lead
        lead = await db.leads.find_one({
            "session_id": session_id,
            "bot_id": bot_id
        })
        outcome["lead_captured"] = lead is not None

        # Check for booking
        booking = await db.bookings.find_one({
            "session_id": session_id,
            "bot_id": bot_id
        })
        outcome["booking_made"] = booking is not None

        # Check for handoff
        handoff = await db.handoffs.find_one({
            "session_id": session_id,
            "bot_id": bot_id
        })
        outcome["handoff_triggered"] = handoff is not None

        # Check for explicit feedback
        feedback = await db.learning_feedback.find_one({
            "session_id": session_id,
            "feedback_type": "explicit"
        })
        if feedback:
            outcome["user_satisfied"] = feedback.get("rating", 0) > 0.5

        return outcome

    async def _find_similar_failures(
        self,
        bot_id: str,
        weaknesses: List[str]
    ) -> List[Dict[str, Any]]:
        """Find past sessions with similar failure patterns."""
        db = await self._get_db()

        # Get past reflections with similar weaknesses
        similar = []

        if not weaknesses:
            return similar

        cursor = db.reflection_insights.find({
            "bot_id": bot_id,
            "weaknesses": {"$in": weaknesses}
        }).limit(10)

        async for doc in cursor:
            similar.append({
                "session_id": doc.get("session_id"),
                "weaknesses": doc.get("weaknesses"),
                "hypotheses": doc.get("hypotheses", []),
            })

        return similar

    async def _generate_hypotheses(
        self,
        critique: Dict[str, Any],
        similar_failures: List[Dict[str, Any]],
        messages: List[Dict[str, str]]
    ) -> List[Hypothesis]:
        """Generate improvement hypotheses based on analysis."""

        weaknesses = critique.get("weaknesses", [])
        improvement_areas = critique.get("improvement_areas", [])

        if not weaknesses and not improvement_areas:
            return []

        # Collect past hypotheses that worked
        past_hypotheses = []
        for failure in similar_failures:
            for hyp in failure.get("hypotheses", []):
                if hyp.get("test_result", 0) > 0.6:
                    past_hypotheses.append(hyp)

        prompt = f"""Generate improvement hypotheses for an AI chatbot.

IDENTIFIED WEAKNESSES:
{json.dumps(weaknesses, indent=2)}

IMPROVEMENT AREAS:
{json.dumps(improvement_areas, indent=2)}

PAST SUCCESSFUL FIXES:
{json.dumps(past_hypotheses[:5], indent=2) if past_hypotheses else "None yet"}

SAMPLE CONVERSATION EXCERPT:
{messages[-4:] if messages else []}

Generate 2-3 specific, actionable hypotheses to improve the AI.

Categories:
- prompt: Changes to system prompt or instructions
- retrieval: Improvements to knowledge retrieval
- response_style: Changes to how responses are formatted
- knowledge_gap: Missing information that should be added

Respond with JSON:
{{
    "hypotheses": [
        {{
            "description": "What to change",
            "category": "prompt|retrieval|response_style|knowledge_gap",
            "confidence": 0.X,
            "suggested_action": "Specific action to take",
            "evidence": ["reason1", "reason2"]
        }}
    ]
}}"""

        try:
            result = await generate_json_with_provider(
                prompt=prompt,
                temperature=0.5
            )

            hypotheses = []
            for h in result.get("hypotheses", []):
                hypotheses.append(Hypothesis(
                    id=f"hyp_{datetime.utcnow().timestamp()}_{len(hypotheses)}",
                    description=h.get("description", ""),
                    category=h.get("category", "prompt"),
                    confidence=float(h.get("confidence", 0.5)),
                    suggested_action=h.get("suggested_action", ""),
                    evidence=h.get("evidence", []),
                ))

            return hypotheses

        except Exception as e:
            logger.error(f"Hypothesis generation failed: {e}")
            return []

    async def _store_reflection(self, result: ReflectionResult) -> None:
        """Store reflection result in database."""
        db = await self._get_db()

        await db.reflection_insights.update_one(
            {"session_id": result.session_id},
            {"$set": result.to_dict()},
            upsert=True
        )

    async def get_pending_hypotheses(
        self,
        bot_id: str,
        category: str = None
    ) -> List[Hypothesis]:
        """Get untested hypotheses for a bot."""
        db = await self._get_db()

        query = {
            "bot_id": bot_id,
            "hypotheses.tested": False
        }

        cursor = db.reflection_insights.find(query).limit(50)

        hypotheses = []
        async for doc in cursor:
            for h in doc.get("hypotheses", []):
                if not h.get("tested", False):
                    if category is None or h.get("category") == category:
                        hypotheses.append(Hypothesis(
                            id=h.get("id", ""),
                            description=h.get("description", ""),
                            category=h.get("category", ""),
                            confidence=h.get("confidence", 0.5),
                            suggested_action=h.get("suggested_action", ""),
                            evidence=h.get("evidence", []),
                        ))

        # Sort by confidence
        hypotheses.sort(key=lambda h: h.confidence, reverse=True)
        return hypotheses

    async def apply_hypothesis(
        self,
        hypothesis_id: str,
        bot_id: str
    ) -> bool:
        """Apply a hypothesis as an experiment."""
        db = await self._get_db()

        # Find the hypothesis
        doc = await db.reflection_insights.find_one({
            "bot_id": bot_id,
            "hypotheses.id": hypothesis_id
        })

        if not doc:
            return False

        hypothesis = None
        for h in doc.get("hypotheses", []):
            if h.get("id") == hypothesis_id:
                hypothesis = h
                break

        if not hypothesis:
            return False

        # Apply based on category
        category = hypothesis.get("category")
        action = hypothesis.get("suggested_action", "")

        if category == "prompt":
            # Create a prompt variant to test
            from .prompt_evolver import AdaptivePromptEvolver

            evolver = AdaptivePromptEvolver()
            bot = await db.chatbots.find_one({"_id": bot_id})
            if bot:
                current_prompt = bot.get("system_prompt", "")
                # Generate a variant incorporating the suggested change
                # (This is a simplified version - could be more sophisticated)
                logger.info(f"Would create prompt variant with action: {action}")

        elif category == "knowledge_gap":
            # Log for manual review
            logger.info(f"Knowledge gap identified: {action}")
            await db.knowledge_gaps.insert_one({
                "bot_id": bot_id,
                "hypothesis_id": hypothesis_id,
                "description": hypothesis.get("description"),
                "suggested_action": action,
                "created_at": datetime.utcnow(),
                "status": "pending"
            })

        # Mark as applied (but not yet tested)
        await db.reflection_insights.update_one(
            {"_id": doc["_id"], "hypotheses.id": hypothesis_id},
            {"$set": {"hypotheses.$.applied": True}}
        )

        return True


# Convenience functions
async def reflect_on_session(session_id: str, bot_id: str) -> ReflectionResult:
    """Perform reflection on a session."""
    reflector = MetaCognitiveReflector()
    return await reflector.reflect_on_session(session_id, bot_id)
