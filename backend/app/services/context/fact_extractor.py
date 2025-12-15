"""
Fact Extractor for Zaia Context System.
Extracts structured information from user messages using LLM.
Supports Arabic and English.
"""

from typing import Dict, Any, List, Optional
import httpx
import json
import logging
from datetime import datetime

from ...core.config import settings

logger = logging.getLogger(__name__)

# Fact categories to extract
FACT_CATEGORIES = {
    "personal": ["name", "email", "phone", "role", "job_title"],
    "business": ["company", "industry", "company_size", "budget", "timeline"],
    "requirements": ["features_needed", "integrations", "use_case"],
    "pain_points": ["current_problems", "challenges"],
    "preferences": ["language", "communication_style", "expertise_level"]
}


async def extract_facts(
    message: str,
    existing_facts: Dict[str, Any] = None,
    language: str = "auto"
) -> Dict[str, Any]:
    """
    Extract facts from a single message.

    Args:
        message: User message to extract facts from
        existing_facts: Previously extracted facts to avoid duplicates
        language: "en", "ar", or "auto" for auto-detection

    Returns:
        Dict with extracted facts and confidence scores
        Example: {
            "name": {"value": "Ahmed", "confidence": 0.95},
            "company": {"value": "TechCorp", "confidence": 0.85},
            ...
        }
    """
    if not settings.DEEPSEEK_API_KEY:
        logger.warning("No DeepSeek API key configured, skipping fact extraction")
        return {}

    if not message or len(message.strip()) < 3:
        return {}

    # Build the extraction prompt
    prompt = _build_extraction_prompt(message, existing_facts, language)

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
                    "temperature": 0.3,  # Low temperature for consistent extraction
                    "max_tokens": 500,
                    "response_format": {"type": "json_object"}  # JSON mode for structured output
                },
                timeout=10.0
            )

            if response.status_code != 200:
                logger.error(f"Fact extraction API error: {response.status_code} - {response.text}")
                return {}

            data = response.json()
            content = data["choices"][0]["message"]["content"]

            # Parse JSON response
            try:
                extracted_facts = json.loads(content)

                # Validate and clean the extracted facts
                validated_facts = _validate_facts(extracted_facts)

                logger.debug(f"Extracted {len(validated_facts)} facts from message")
                return validated_facts

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON from fact extraction: {e}")
                logger.debug(f"Raw content: {content}")
                return {}

    except httpx.TimeoutException:
        logger.warning("Fact extraction timed out")
        return {}
    except Exception as e:
        logger.error(f"Fact extraction failed: {e}")
        return {}


async def extract_facts_batch(
    messages: List[Dict[str, str]],
    existing_facts: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Extract facts from multiple messages (e.g., conversation history).

    Args:
        messages: List of messages with 'role' and 'content' keys
        existing_facts: Previously extracted facts

    Returns:
        Dict with merged facts from all messages
    """
    if not messages:
        return existing_facts or {}

    accumulated_facts = existing_facts.copy() if existing_facts else {}

    # Extract facts from each user message
    for msg in messages:
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if content:
                new_facts = await extract_facts(
                    content,
                    existing_facts=accumulated_facts,
                    language="auto"
                )

                # Merge new facts into accumulated facts
                accumulated_facts = merge_facts(
                    accumulated_facts,
                    new_facts,
                    confidence_threshold=0.6
                )

    return accumulated_facts


def merge_facts(
    existing: Dict[str, Any],
    new: Dict[str, Any],
    confidence_threshold: float = 0.7
) -> Dict[str, Any]:
    """
    Merge new facts into existing, preferring higher confidence.

    Args:
        existing: Current facts dict
        new: New facts to merge
        confidence_threshold: Minimum confidence to keep a fact

    Returns:
        Merged facts dict
    """
    if not existing:
        return {k: v for k, v in new.items() if v.get("confidence", 0) >= confidence_threshold}

    if not new:
        return existing.copy()

    merged = existing.copy()

    for key, new_fact in new.items():
        new_confidence = new_fact.get("confidence", 0)

        # Skip facts below confidence threshold
        if new_confidence < confidence_threshold:
            continue

        # If fact doesn't exist, add it
        if key not in merged:
            merged[key] = new_fact
            continue

        # If fact exists, compare confidence
        existing_confidence = merged[key].get("confidence", 0)

        # Keep the fact with higher confidence
        if new_confidence > existing_confidence:
            merged[key] = new_fact
            logger.debug(f"Updated fact '{key}' with higher confidence: {new_confidence} > {existing_confidence}")
        # If same confidence, prefer newer value (more recent information)
        elif new_confidence == existing_confidence:
            # Check if values are different
            if merged[key].get("value") != new_fact.get("value"):
                merged[key] = new_fact
                merged[key]["updated_at"] = datetime.utcnow().isoformat()

    return merged


def _build_extraction_prompt(
    message: str,
    existing_facts: Dict[str, Any] = None,
    language: str = "auto"
) -> str:
    """Build the fact extraction prompt."""

    lang_instruction = ""
    if language == "ar":
        lang_instruction = "The message is in Arabic. Extract facts accordingly."
    elif language == "en":
        lang_instruction = "The message is in English."
    else:
        lang_instruction = "Auto-detect the language (Arabic or English) and extract facts accordingly."

    existing_context = ""
    if existing_facts:
        existing_context = f"\n\nPREVIOUSLY EXTRACTED FACTS (do not duplicate):\n{json.dumps(existing_facts, indent=2, ensure_ascii=False)}"

    prompt = f"""Extract structured facts from the user's message. {lang_instruction}

CATEGORIES TO EXTRACT:
1. Personal Info: name, email, phone, role, job_title
2. Business Info: company, industry, company_size, budget, timeline
3. Requirements: features_needed, integrations, use_case
4. Pain Points: current_problems, challenges
5. Preferences: language, communication_style, expertise_level

USER MESSAGE:
{message}
{existing_context}

INSTRUCTIONS:
- Extract ONLY explicitly stated facts, do not infer or assume
- For each fact, include a confidence score (0.0-1.0)
- Use confidence 0.9+ for direct statements (e.g., "My name is Ahmed")
- Use confidence 0.7-0.9 for clear implications (e.g., "I work at TechCorp" → company: TechCorp)
- Use confidence 0.5-0.7 for weak signals
- Do NOT extract facts that are already in the existing facts
- If no facts are found, return empty JSON object {{}}
- For Arabic names/companies, preserve the Arabic text
- Return ONLY valid JSON, no additional text

OUTPUT FORMAT (JSON):
{{
  "fact_name": {{
    "value": "extracted value",
    "confidence": 0.95,
    "category": "personal|business|requirements|pain_points|preferences"
  }}
}}

EXAMPLES:
Input: "Hi, I'm Ahmed from TechCorp"
Output: {{"name": {{"value": "Ahmed", "confidence": 0.95, "category": "personal"}}, "company": {{"value": "TechCorp", "confidence": 0.9, "category": "business"}}}}

Input: "We need a chatbot for customer support"
Output: {{"use_case": {{"value": "customer support", "confidence": 0.85, "category": "requirements"}}}}

Input: "مرحبا، اسمي أحمد"
Output: {{"name": {{"value": "أحمد", "confidence": 0.95, "category": "personal"}}, "language": {{"value": "Arabic", "confidence": 1.0, "category": "preferences"}}}}

Now extract facts from the message above. Return ONLY the JSON object:"""

    return prompt


def _validate_facts(facts: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and clean extracted facts.

    Ensures:
    - Each fact has required fields (value, confidence)
    - Confidence scores are in valid range [0, 1]
    - Category is valid if present
    - Values are not empty
    """
    validated = {}

    valid_categories = set()
    for category_list in FACT_CATEGORIES.values():
        valid_categories.update(category_list)
    valid_categories.update(FACT_CATEGORIES.keys())

    for key, fact_data in facts.items():
        # Skip if not a dict
        if not isinstance(fact_data, dict):
            logger.warning(f"Skipping invalid fact '{key}': not a dict")
            continue

        # Must have value
        value = fact_data.get("value")
        if not value or (isinstance(value, str) and not value.strip()):
            logger.warning(f"Skipping fact '{key}': empty value")
            continue

        # Must have confidence
        confidence = fact_data.get("confidence")
        if confidence is None:
            logger.warning(f"Fact '{key}' missing confidence, defaulting to 0.5")
            confidence = 0.5

        # Validate confidence range
        try:
            confidence = float(confidence)
            confidence = max(0.0, min(1.0, confidence))
        except (ValueError, TypeError):
            logger.warning(f"Invalid confidence for '{key}', defaulting to 0.5")
            confidence = 0.5

        # Validate category if present
        category = fact_data.get("category")
        if category and category not in valid_categories:
            logger.warning(f"Unknown category '{category}' for fact '{key}'")

        # Add validated fact
        validated[key] = {
            "value": value,
            "confidence": confidence,
            "category": category or "unknown",
            "extracted_at": datetime.utcnow().isoformat()
        }

    return validated


def get_fact_summary(facts: Dict[str, Any], min_confidence: float = 0.7) -> str:
    """
    Generate a human-readable summary of extracted facts.

    Args:
        facts: Facts dictionary
        min_confidence: Minimum confidence to include in summary

    Returns:
        Formatted string summary
    """
    if not facts:
        return "No facts extracted yet."

    high_confidence_facts = {
        k: v for k, v in facts.items()
        if v.get("confidence", 0) >= min_confidence
    }

    if not high_confidence_facts:
        return f"No facts with confidence >= {min_confidence}"

    summary_lines = []

    # Group by category
    by_category = {}
    for key, fact in high_confidence_facts.items():
        category = fact.get("category", "unknown")
        if category not in by_category:
            by_category[category] = []
        by_category[category].append((key, fact))

    for category, facts_list in sorted(by_category.items()):
        summary_lines.append(f"\n{category.upper()}:")
        for key, fact in facts_list:
            confidence_pct = int(fact["confidence"] * 100)
            summary_lines.append(f"  - {key}: {fact['value']} ({confidence_pct}%)")

    return "\n".join(summary_lines)
