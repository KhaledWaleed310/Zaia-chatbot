"""
Conversation Summarizer for Zaia Context System.
Auto-summarizes conversations when they exceed threshold.
"""

from typing import Dict, Any, List, Optional
import httpx
import json
import logging
from datetime import datetime

from ...core.config import settings

logger = logging.getLogger(__name__)

SUMMARY_THRESHOLD = 20  # Summarize when messages exceed this


async def summarize_conversation(
    messages: List[Dict[str, str]],
    extracted_facts: Dict[str, Any] = None,
    intent_history: List[str] = None,
    language: str = "auto"
) -> Dict[str, Any]:
    """
    Generate comprehensive conversation summary.

    Args:
        messages: Full conversation history
        extracted_facts: Facts extracted during conversation
        intent_history: Sequence of detected intents
        language: Preferred output language

    Returns:
        {
            "short_summary": "User inquired about API integration...",
            "detailed_summary": "Ahmed from TechCorp discussed...",
            "key_facts": {"name": "Ahmed", "company": "TechCorp"},
            "main_topics": ["API", "pricing", "Arabic support"],
            "user_needs": ["WhatsApp integration", "Arabic support"],
            "outcome": "interested",  # interested, not_interested, undecided
            "next_steps": ["send documentation", "schedule demo"],
            "sentiment_overall": "positive"
        }
    """
    if not settings.DEEPSEEK_API_KEY:
        logger.warning("No DeepSeek API key configured, skipping summarization")
        return _empty_summary()

    if not messages or len(messages) < 3:
        return _empty_summary()

    # Build summarization prompt
    prompt = _build_summarization_prompt(messages, extracted_facts, intent_history, language)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 800,
                    "response_format": {"type": "json_object"}
                },
                timeout=15.0
            )

            if response.status_code != 200:
                logger.error(f"Summarization API error: {response.status_code} - {response.text}")
                return _empty_summary()

            data = response.json()
            content = data["choices"][0]["message"]["content"]

            try:
                summary = json.loads(content)

                # Validate and clean summary
                validated_summary = _validate_summary(summary)
                validated_summary["generated_at"] = datetime.utcnow().isoformat()
                validated_summary["message_count"] = len(messages)

                logger.debug(f"Generated conversation summary with {len(validated_summary.get('main_topics', []))} topics")
                return validated_summary

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON from summarization: {e}")
                logger.debug(f"Raw content: {content}")
                return _empty_summary()

    except httpx.TimeoutException:
        logger.warning("Summarization timed out")
        return _empty_summary()
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        return _empty_summary()


async def should_summarize(
    message_count: int,
    last_summary_at: int = None
) -> bool:
    """Check if conversation should be summarized."""
    if message_count < SUMMARY_THRESHOLD:
        return False

    # If never summarized, summarize now
    if last_summary_at is None:
        return True

    # Summarize again if we've had significant new messages
    messages_since_summary = message_count - last_summary_at
    return messages_since_summary >= SUMMARY_THRESHOLD // 2


async def update_rolling_summary(
    existing_summary: Dict[str, Any],
    new_messages: List[Dict[str, str]],
    new_facts: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Update existing summary with new messages.
    More efficient than re-summarizing entire conversation.
    """
    if not settings.DEEPSEEK_API_KEY:
        logger.warning("No DeepSeek API key configured, returning existing summary")
        return existing_summary

    if not new_messages:
        return existing_summary

    # Build update prompt
    prompt = _build_update_prompt(existing_summary, new_messages, new_facts)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 800,
                    "response_format": {"type": "json_object"}
                },
                timeout=15.0
            )

            if response.status_code != 200:
                logger.error(f"Summary update API error: {response.status_code}")
                return existing_summary

            data = response.json()
            content = data["choices"][0]["message"]["content"]

            try:
                updated_summary = json.loads(content)
                validated_summary = _validate_summary(updated_summary)
                validated_summary["generated_at"] = datetime.utcnow().isoformat()
                validated_summary["message_count"] = existing_summary.get("message_count", 0) + len(new_messages)

                logger.debug(f"Updated rolling summary")
                return validated_summary

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON from summary update: {e}")
                return existing_summary

    except Exception as e:
        logger.error(f"Summary update failed: {e}")
        return existing_summary


class ConversationSummarizer:
    """
    Manages conversation summarization.
    """

    def __init__(self, threshold: int = SUMMARY_THRESHOLD):
        self.threshold = threshold
        self.current_summary: Optional[Dict[str, Any]] = None
        self.last_summarized_index: int = 0

    async def process_conversation(
        self,
        messages: List[Dict[str, str]],
        facts: Dict[str, Any] = None,
        intents: List[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Process conversation and return summary if needed.
        """
        message_count = len(messages)

        # Check if we should summarize
        if not await should_summarize(message_count, self.last_summarized_index or None):
            return self.current_summary

        # Determine if we should do rolling update or full summarization
        if self.current_summary and self.last_summarized_index > 0:
            # Rolling update with new messages
            new_messages = messages[self.last_summarized_index:]
            self.current_summary = await update_rolling_summary(
                self.current_summary,
                new_messages,
                facts
            )
        else:
            # Full summarization
            self.current_summary = await summarize_conversation(
                messages,
                facts,
                intents
            )

        self.last_summarized_index = message_count
        return self.current_summary

    def get_context_for_llm(self, max_tokens: int = 500) -> str:
        """
        Get summary formatted for LLM context.
        """
        if not self.current_summary:
            return ""

        parts = []

        # Short summary
        if self.current_summary.get("short_summary"):
            parts.append(f"CONVERSATION SUMMARY: {self.current_summary['short_summary']}")

        # Key facts
        key_facts = self.current_summary.get("key_facts", {})
        if key_facts:
            facts_str = ", ".join([f"{k}: {v}" for k, v in key_facts.items()])
            parts.append(f"KEY FACTS: {facts_str}")

        # Main topics
        main_topics = self.current_summary.get("main_topics", [])
        if main_topics:
            parts.append(f"TOPICS: {', '.join(main_topics)}")

        # User needs
        user_needs = self.current_summary.get("user_needs", [])
        if user_needs:
            parts.append(f"USER NEEDS: {', '.join(user_needs)}")

        # Outcome
        outcome = self.current_summary.get("outcome")
        if outcome:
            parts.append(f"OUTCOME: {outcome}")

        context = "\n".join(parts)

        # Truncate if too long (rough token estimation: 1 token ≈ 4 chars)
        max_chars = max_tokens * 4
        if len(context) > max_chars:
            context = context[:max_chars] + "..."

        return context

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for storage."""
        return {
            "current_summary": self.current_summary,
            "last_summarized_index": self.last_summarized_index,
            "threshold": self.threshold
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationSummarizer":
        """Deserialize from storage."""
        summarizer = cls(threshold=data.get("threshold", SUMMARY_THRESHOLD))
        summarizer.current_summary = data.get("current_summary")
        summarizer.last_summarized_index = data.get("last_summarized_index", 0)
        return summarizer


def _build_summarization_prompt(
    messages: List[Dict[str, str]],
    facts: Dict[str, Any] = None,
    intent_history: List[str] = None,
    language: str = "auto"
) -> str:
    """Build the summarization prompt."""

    # Format conversation
    conversation_text = "\n".join([
        f"{msg.get('role', 'unknown').upper()}: {msg.get('content', '')}"
        for msg in messages
    ])

    # Format facts if available
    facts_text = ""
    if facts:
        facts_list = [f"{k}: {v.get('value', v) if isinstance(v, dict) else v}"
                     for k, v in facts.items()]
        facts_text = f"\n\nEXTRACTED FACTS:\n{', '.join(facts_list)}"

    # Format intent history if available
    intent_text = ""
    if intent_history:
        intent_text = f"\n\nINTENT FLOW:\n{' → '.join(intent_history)}"

    prompt = f"""Analyze and summarize this conversation between a user and an AI chatbot.

CONVERSATION:
{conversation_text}
{facts_text}
{intent_text}

Generate a comprehensive summary in JSON format with these fields:

1. short_summary: One sentence (max 150 chars) summarizing the conversation
2. detailed_summary: Detailed 2-3 sentence summary with context
3. key_facts: Object with the most important facts about the user (name, company, etc.)
4. main_topics: Array of main topics discussed (max 5)
5. user_needs: Array of expressed needs/requirements (max 5)
6. outcome: One of ["interested", "not_interested", "undecided", "support_resolved", "support_pending"]
7. next_steps: Array of suggested next actions (max 3)
8. sentiment_overall: One of ["positive", "neutral", "negative"]

INSTRUCTIONS:
- Be concise but informative
- Extract only explicitly stated information
- Preserve Arabic text if present
- Focus on actionable insights
- If the conversation is in Arabic, summaries can be in Arabic too

Return ONLY valid JSON, no additional text.

EXAMPLE OUTPUT:
{{
  "short_summary": "User inquired about chatbot pricing for e-commerce integration",
  "detailed_summary": "Ahmed from TechCorp discussed implementing a chatbot for their e-commerce platform. Interested in API integration and Arabic language support.",
  "key_facts": {{"name": "Ahmed", "company": "TechCorp", "use_case": "e-commerce"}},
  "main_topics": ["pricing", "API integration", "Arabic support"],
  "user_needs": ["WhatsApp integration", "multi-language support"],
  "outcome": "interested",
  "next_steps": ["send pricing details", "schedule technical demo"],
  "sentiment_overall": "positive"
}}

Now generate the summary:"""

    return prompt


def _build_update_prompt(
    existing_summary: Dict[str, Any],
    new_messages: List[Dict[str, str]],
    new_facts: Dict[str, Any] = None
) -> str:
    """Build prompt for updating existing summary."""

    # Format new messages
    new_conversation_text = "\n".join([
        f"{msg.get('role', 'unknown').upper()}: {msg.get('content', '')}"
        for msg in new_messages
    ])

    # Format existing summary
    existing_summary_text = json.dumps(existing_summary, indent=2, ensure_ascii=False)

    # Format new facts if available
    facts_text = ""
    if new_facts:
        facts_list = [f"{k}: {v.get('value', v) if isinstance(v, dict) else v}"
                     for k, v in new_facts.items()]
        facts_text = f"\n\nNEW FACTS:\n{', '.join(facts_list)}"

    prompt = f"""Update this conversation summary with new messages.

EXISTING SUMMARY:
{existing_summary_text}

NEW MESSAGES:
{new_conversation_text}
{facts_text}

Update the summary by:
1. Incorporating new information from recent messages
2. Updating key_facts with any new information
3. Adding new topics/needs if they appear
4. Updating outcome and next_steps based on latest context
5. Adjusting sentiment if it has changed

Maintain the same JSON structure. Return ONLY valid JSON, no additional text:"""

    return prompt


def _validate_summary(summary: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clean summary."""
    validated = {
        "short_summary": summary.get("short_summary", ""),
        "detailed_summary": summary.get("detailed_summary", ""),
        "key_facts": summary.get("key_facts", {}),
        "main_topics": summary.get("main_topics", []),
        "user_needs": summary.get("user_needs", []),
        "outcome": summary.get("outcome", "undecided"),
        "next_steps": summary.get("next_steps", []),
        "sentiment_overall": summary.get("sentiment_overall", "neutral")
    }

    # Ensure arrays don't exceed reasonable limits
    validated["main_topics"] = validated["main_topics"][:5]
    validated["user_needs"] = validated["user_needs"][:5]
    validated["next_steps"] = validated["next_steps"][:3]

    # Validate outcome
    valid_outcomes = ["interested", "not_interested", "undecided", "support_resolved", "support_pending"]
    if validated["outcome"] not in valid_outcomes:
        validated["outcome"] = "undecided"

    # Validate sentiment
    valid_sentiments = ["positive", "neutral", "negative"]
    if validated["sentiment_overall"] not in valid_sentiments:
        validated["sentiment_overall"] = "neutral"

    return validated


def _empty_summary() -> Dict[str, Any]:
    """Return empty summary structure."""
    return {
        "short_summary": "",
        "detailed_summary": "",
        "key_facts": {},
        "main_topics": [],
        "user_needs": [],
        "outcome": "undecided",
        "next_steps": [],
        "sentiment_overall": "neutral",
        "generated_at": None,
        "message_count": 0
    }
