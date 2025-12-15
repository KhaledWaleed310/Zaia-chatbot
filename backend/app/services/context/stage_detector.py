"""
Stage Detector for Zaia Context System.
Detects conversation stage for adaptive responses.
"""

from typing import Dict, Any, List, Optional, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Conversation stages (sales funnel)
CONVERSATION_STAGES = {
    "greeting": {
        "description": "Initial contact, introductions",
        "indicators": ["first message", "hello", "hi", "مرحبا"],
        "prompt_guidance": "Be welcoming and ask how you can help."
    },
    "discovery": {
        "description": "Understanding user needs and requirements",
        "indicators": ["questions about services", "what do you offer", "ايه خدماتكم"],
        "prompt_guidance": "Ask clarifying questions to understand their needs."
    },
    "solution": {
        "description": "Presenting solutions and features",
        "indicators": ["how does it work", "features", "capabilities"],
        "prompt_guidance": "Explain relevant features and benefits."
    },
    "pricing": {
        "description": "Discussing pricing and plans",
        "indicators": ["price", "cost", "plans", "سعر"],
        "prompt_guidance": "Present pricing clearly, emphasize value."
    },
    "objection_handling": {
        "description": "Addressing concerns and objections",
        "indicators": ["expensive", "not sure", "concern", "but"],
        "prompt_guidance": "Address concerns empathetically, provide reassurance."
    },
    "closing": {
        "description": "Moving towards commitment/action",
        "indicators": ["interested", "sign up", "demo", "next steps"],
        "prompt_guidance": "Guide towards clear next steps, be helpful not pushy."
    }
}

# Intent to stage mapping
INTENT_TO_STAGE_MAPPING = {
    "greeting": "greeting",
    "inquiry": "discovery",
    "technical": "solution",
    "pricing": "pricing",
    "comparison": "solution",
    "objection": "objection_handling",
    "commitment": "closing",
    "support": "solution",
    "feedback": "closing",
    "closing": "closing"
}


async def detect_stage(
    conversation_history: List[Dict[str, str]],
    intent_history: List[str] = None,
    current_facts: Dict[str, Any] = None
) -> Tuple[str, float]:
    """
    Detect current conversation stage.

    Args:
        conversation_history: Full conversation
        intent_history: Sequence of detected intents
        current_facts: Extracted facts about user

    Returns:
        Tuple of (stage_name, confidence)
    """
    # Default to greeting if no history
    if not conversation_history or len(conversation_history) == 0:
        return ("greeting", 1.0)

    # Count user messages
    user_messages = [m for m in conversation_history if m.get("role") == "user"]

    # If this is the first or second user message, likely still in greeting
    if len(user_messages) <= 1:
        return ("greeting", 0.9)

    # Analyze intent history if provided
    if intent_history and len(intent_history) > 0:
        # Get recent intents (last 3)
        recent_intents = intent_history[-3:]

        # Map intents to stages
        recent_stages = [
            INTENT_TO_STAGE_MAPPING.get(intent, "discovery")
            for intent in recent_intents
        ]

        # Get most recent stage
        current_stage_from_intent = recent_stages[-1]

        # Calculate confidence based on consistency
        stage_count = recent_stages.count(current_stage_from_intent)
        confidence = min(0.6 + (stage_count * 0.2), 1.0)

        return (current_stage_from_intent, confidence)

    # Fallback: analyze last few messages for stage indicators
    recent_messages = user_messages[-3:]
    stage_scores = {stage: 0 for stage in CONVERSATION_STAGES.keys()}

    for message in recent_messages:
        content = message.get("content", "").lower()

        for stage, stage_info in CONVERSATION_STAGES.items():
            indicators = stage_info["indicators"]
            for indicator in indicators:
                if indicator.lower() in content:
                    stage_scores[stage] += 1

    # Get highest scoring stage
    max_score = max(stage_scores.values())

    if max_score > 0:
        detected_stage = max(stage_scores.items(), key=lambda x: x[1])[0]
        confidence = min(max_score / (len(recent_messages) * 2), 1.0)
        return (detected_stage, confidence)

    # Default to discovery if no clear signals
    # Use message count to infer stage
    if len(user_messages) <= 2:
        return ("greeting", 0.7)
    elif len(user_messages) <= 4:
        return ("discovery", 0.6)
    elif len(user_messages) <= 8:
        return ("solution", 0.5)
    else:
        return ("pricing", 0.5)


class StageDetector:
    """
    Tracks conversation stage progression.
    """

    def __init__(self):
        self.stage_history: List[Dict[str, Any]] = []
        self.current_stage: str = "greeting"

    def update_stage(self, stage: str, confidence: float) -> bool:
        """
        Update current stage if changed.
        Returns True if stage changed.
        """
        changed = (stage != self.current_stage)

        if changed or confidence > 0.7:
            self.stage_history.append({
                "stage": stage,
                "confidence": confidence,
                "timestamp": datetime.utcnow()
            })
            self.current_stage = stage

        return changed

    def get_stage_progression(self) -> List[str]:
        """Get sequence of stages visited."""
        return [item["stage"] for item in self.stage_history]

    def get_prompt_guidance(self) -> str:
        """Get LLM prompt guidance for current stage."""
        stage_info = CONVERSATION_STAGES.get(self.current_stage)
        if stage_info:
            return stage_info["prompt_guidance"]
        return "Be helpful and professional."

    def is_progressing(self) -> bool:
        """Check if conversation is moving forward in funnel."""
        if len(self.stage_history) < 2:
            return True  # Just started, considered progressing

        # Define stage order (sales funnel progression)
        stage_order = ["greeting", "discovery", "solution", "pricing", "objection_handling", "closing"]

        # Get last two stages
        last_stages = [item["stage"] for item in self.stage_history[-2:]]

        if last_stages[0] == last_stages[1]:
            # Staying in same stage is neutral
            return True

        try:
            prev_index = stage_order.index(last_stages[0])
            curr_index = stage_order.index(last_stages[1])

            # Moving forward is progressing
            # Objection handling can come from any stage, so it's not regression
            if last_stages[1] == "objection_handling":
                return True

            # Moving backward is not progressing (except for objection)
            return curr_index >= prev_index

        except ValueError:
            # If stage not in order list, assume progressing
            return True

    def get_stage_duration(self) -> Optional[int]:
        """Get duration in current stage (in number of updates)."""
        if not self.stage_history:
            return None

        count = 0
        for item in reversed(self.stage_history):
            if item["stage"] == self.current_stage:
                count += 1
            else:
                break

        return count

    def is_stuck(self, threshold: int = 5) -> bool:
        """Check if conversation is stuck in one stage too long."""
        duration = self.get_stage_duration()
        if duration is None:
            return False
        return duration > threshold

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for storage."""
        return {
            "stage_history": [
                {
                    "stage": item["stage"],
                    "confidence": item["confidence"],
                    "timestamp": item["timestamp"].isoformat() if isinstance(item["timestamp"], datetime) else item["timestamp"]
                }
                for item in self.stage_history
            ],
            "current_stage": self.current_stage
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StageDetector":
        """Deserialize from storage."""
        detector = cls()
        detector.current_stage = data.get("current_stage", "greeting")

        stage_history = data.get("stage_history", [])
        for item in stage_history:
            detector.stage_history.append({
                "stage": item["stage"],
                "confidence": item["confidence"],
                "timestamp": datetime.fromisoformat(item["timestamp"]) if isinstance(item["timestamp"], str) else item["timestamp"]
            })

        return detector
