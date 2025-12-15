"""
Intent Tracker for Zaia Context System.
Detects and tracks user intent evolution during conversation.
"""

from typing import Dict, Any, List, Optional, Tuple
import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Intent categories for sales/support chatbot
INTENT_CATEGORIES = {
    "greeting": ["hello", "hi", "مرحبا", "السلام", "أهلا", "hey", "good morning", "صباح الخير"],
    "inquiry": ["what is", "what are", "tell me about", "ايه هي", "عايز اعرف", "ما هو", "أخبرني"],
    "technical": ["how to", "how do", "integrate", "API", "setup", "ازاي", "كيف", "integration"],
    "pricing": ["price", "cost", "how much", "كم", "سعر", "تكلفة", "plans", "خطط", "باقات"],
    "comparison": ["vs", "versus", "compare", "difference", "better", "مقارنة", "الفرق"],
    "objection": ["expensive", "غالي", "not sure", "مش متأكد", "concern", "قلق", "doubt"],
    "commitment": ["interested", "sign up", "demo", "trial", "مهتم", "عايز اجرب", "تجربة"],
    "support": ["help", "problem", "issue", "error", "مشكلة", "خطأ", "مساعدة"],
    "feedback": ["thanks", "شكرا", "great", "bad", "ممتاز", "رائع", "سيء"],
    "closing": ["bye", "مع السلامة", "thank you", "شكرا جزيلا", "goodbye"]
}

# Common intent patterns
INTENT_PATTERNS = {
    "pricing": [
        r"\b(price|cost|how much|pricing|كم|سعر|تكلفة)\b",
        r"\b(plan|subscription|package|باقة|خطة)\b"
    ],
    "technical": [
        r"\b(how to|how do|setup|install|configure|API|integrate|ازاي|كيف)\b",
        r"\b(documentation|docs|guide|tutorial)\b"
    ],
    "commitment": [
        r"\b(sign up|register|demo|trial|get started|subscribe|مهتم|تجربة)\b",
        r"\b(interested|want to|would like to|ready to)\b"
    ],
    "objection": [
        r"\b(expensive|too much|غالي|concern|worried|قلق)\b",
        r"\b(not sure|hesitant|doubt|مش متأكد)\b"
    ]
}


async def detect_intent(
    message: str,
    conversation_history: List[Dict[str, str]] = None,
    current_stage: str = None
) -> Dict[str, Any]:
    """
    Detect intent from user message.

    Args:
        message: Current user message
        conversation_history: Previous messages for context
        current_stage: Current conversation stage for context

    Returns:
        {
            "intent": "pricing",
            "confidence": 0.85,
            "secondary_intent": "technical",
            "keywords": ["price", "API"]
        }
    """
    message_lower = message.lower().strip()

    # If message is empty, default to inquiry
    if not message_lower:
        return {
            "intent": "inquiry",
            "confidence": 0.5,
            "secondary_intent": None,
            "keywords": []
        }

    # Score each intent category
    intent_scores = {}

    for intent_name, keywords in INTENT_CATEGORIES.items():
        score = 0
        matched_keywords = []

        # Keyword matching
        for keyword in keywords:
            if keyword.lower() in message_lower:
                score += 1
                matched_keywords.append(keyword)

        # Pattern matching (higher weight)
        if intent_name in INTENT_PATTERNS:
            for pattern in INTENT_PATTERNS[intent_name]:
                if re.search(pattern, message_lower, re.IGNORECASE):
                    score += 2

        if score > 0:
            intent_scores[intent_name] = {
                "score": score,
                "keywords": matched_keywords
            }

    # If no matches, try to infer from message structure
    if not intent_scores:
        # Questions usually indicate inquiry
        if "?" in message or message_lower.startswith(("what", "how", "why", "when", "where", "who")):
            intent_scores["inquiry"] = {"score": 1, "keywords": []}
        # Short messages might be greetings or feedback
        elif len(message.split()) <= 3:
            intent_scores["greeting"] = {"score": 1, "keywords": []}
        else:
            intent_scores["inquiry"] = {"score": 1, "keywords": []}

    # Context-based boosting
    if conversation_history and len(conversation_history) > 0:
        # If first message in conversation, likely a greeting
        user_messages = [m for m in conversation_history if m.get("role") == "user"]
        if len(user_messages) == 0 and "greeting" in intent_scores:
            intent_scores["greeting"]["score"] += 2

    # Stage-based boosting
    if current_stage:
        # If in pricing stage, pricing-related intents are more likely
        if current_stage == "pricing" and "pricing" in intent_scores:
            intent_scores["pricing"]["score"] += 1
        # If in closing stage, commitment/objection intents more likely
        elif current_stage == "closing":
            if "commitment" in intent_scores:
                intent_scores["commitment"]["score"] += 1
            if "objection" in intent_scores:
                intent_scores["objection"]["score"] += 1

    # Sort by score
    sorted_intents = sorted(
        intent_scores.items(),
        key=lambda x: x[1]["score"],
        reverse=True
    )

    if not sorted_intents:
        return {
            "intent": "inquiry",
            "confidence": 0.5,
            "secondary_intent": None,
            "keywords": []
        }

    # Primary intent
    primary_intent = sorted_intents[0][0]
    primary_score = sorted_intents[0][1]["score"]
    primary_keywords = sorted_intents[0][1]["keywords"]

    # Calculate confidence (normalize score)
    max_possible_score = max(
        len(INTENT_CATEGORIES.get(primary_intent, [])) +
        len(INTENT_PATTERNS.get(primary_intent, [])) * 2,
        1
    )
    confidence = min(primary_score / max_possible_score, 1.0)

    # Boost confidence if multiple strong signals
    if primary_score >= 3:
        confidence = min(confidence + 0.2, 1.0)

    # Secondary intent
    secondary_intent = None
    if len(sorted_intents) > 1:
        second_score = sorted_intents[1][1]["score"]
        # Only consider secondary if it's significant
        if second_score >= 2 or second_score >= primary_score * 0.5:
            secondary_intent = sorted_intents[1][0]

    return {
        "intent": primary_intent,
        "confidence": round(confidence, 2),
        "secondary_intent": secondary_intent,
        "keywords": primary_keywords[:5]  # Limit to top 5 keywords
    }


class IntentTracker:
    """
    Tracks intent evolution throughout a conversation session.
    """

    def __init__(self):
        self.intent_history: List[Dict[str, Any]] = []

    def add_intent(self, intent: str, confidence: float, message: str) -> None:
        """Record a detected intent."""
        self.intent_history.append({
            "intent": intent,
            "confidence": confidence,
            "message": message,
            "timestamp": datetime.utcnow()
        })

    def get_intent_flow(self) -> List[str]:
        """Get sequence of intents (e.g., ['greeting', 'inquiry', 'pricing'])."""
        return [item["intent"] for item in self.intent_history]

    def get_dominant_intent(self) -> Optional[str]:
        """Get the most frequent/important intent in the conversation."""
        if not self.intent_history:
            return None

        # Count occurrences
        intent_counts = {}
        intent_confidence_sum = {}

        for item in self.intent_history:
            intent = item["intent"]
            confidence = item["confidence"]

            intent_counts[intent] = intent_counts.get(intent, 0) + 1
            intent_confidence_sum[intent] = intent_confidence_sum.get(intent, 0) + confidence

        # Score by frequency * average confidence
        intent_scores = {}
        for intent in intent_counts:
            avg_confidence = intent_confidence_sum[intent] / intent_counts[intent]
            # Prioritize non-greeting/closing intents for "dominant" intent
            weight = 1.0
            if intent in ["greeting", "closing", "feedback"]:
                weight = 0.5
            intent_scores[intent] = intent_counts[intent] * avg_confidence * weight

        # Return highest scoring intent
        return max(intent_scores.items(), key=lambda x: x[1])[0]

    def predict_next_intent(self) -> Optional[str]:
        """Predict likely next intent based on patterns."""
        if not self.intent_history:
            return "greeting"

        # Common patterns: greeting -> inquiry -> technical -> pricing -> commitment
        current_intent = self.intent_history[-1]["intent"]

        # Define common intent progressions
        intent_progressions = {
            "greeting": ["inquiry", "technical"],
            "inquiry": ["technical", "pricing", "inquiry"],
            "technical": ["pricing", "technical", "commitment"],
            "pricing": ["objection_handling", "commitment", "technical"],
            "objection": ["pricing", "commitment", "support"],
            "commitment": ["closing", "technical"],
            "support": ["technical", "inquiry"],
            "feedback": ["closing", "inquiry"],
            "closing": None  # End of conversation
        }

        # Get likely next intents
        next_intents = intent_progressions.get(current_intent)

        if next_intents:
            return next_intents[0]  # Return most likely

        return None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for storage."""
        return {
            "intent_history": [
                {
                    "intent": item["intent"],
                    "confidence": item["confidence"],
                    "message": item["message"],
                    "timestamp": item["timestamp"].isoformat() if isinstance(item["timestamp"], datetime) else item["timestamp"]
                }
                for item in self.intent_history
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "IntentTracker":
        """Deserialize from storage."""
        tracker = cls()

        intent_history = data.get("intent_history", [])
        for item in intent_history:
            tracker.intent_history.append({
                "intent": item["intent"],
                "confidence": item["confidence"],
                "message": item["message"],
                "timestamp": datetime.fromisoformat(item["timestamp"]) if isinstance(item["timestamp"], str) else item["timestamp"]
            })

        return tracker
