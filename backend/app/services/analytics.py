"""
Analytics service for detecting unanswered questions, sentiment analysis,
and quality scoring.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime
import uuid
import re
import json
import httpx
from ..core.database import get_mongodb
from ..core.config import settings

# Fallback phrases that indicate the bot couldn't answer
FALLBACK_PHRASES = [
    "i don't have information",
    "i don't have that information",
    "i cannot find",
    "i'm not sure",
    "i don't know",
    "no relevant information",
    "outside my knowledge",
    "i'm unable to",
    "i cannot provide",
    "not in my knowledge base",
    "i don't have access to",
    "unfortunately, i don't",
    "i apologize, but i don't",
    "sorry, i don't have"
]

# Simple greetings and confirmations that don't need document context
SKIP_PATTERNS = [
    r'^(hi|hello|hey|hola|مرحبا|السلام عليكم|صباح الخير|مساء الخير)[\s!.,?]*$',
    r'^(yes|no|ok|okay|sure|thanks|thank you|yep|nope|yeah|nah)[\s!.,?]*$',
    r'^(good|great|nice|cool|awesome|perfect|excellent)[\s!.,?]*$',
    r'^(bye|goodbye|see you|later)[\s!.,?]*$',
    r'^[\s!.,?]*$',  # Empty or just punctuation
]

# Minimum context score threshold for a "good" answer
CONTEXT_SCORE_THRESHOLD = 0.3

# Minimum query length to consider as a real question
MIN_QUERY_LENGTH = 10


def is_simple_message(query: str) -> bool:
    """Check if query is a simple greeting/confirmation that doesn't need document context."""
    query_lower = query.lower().strip()

    # Check against skip patterns
    for pattern in SKIP_PATTERNS:
        if re.match(pattern, query_lower, re.IGNORECASE):
            return True

    # Very short messages (less than 3 words) that aren't questions
    words = query_lower.split()
    if len(words) <= 2 and '?' not in query:
        return True

    return False


def looks_like_question(query: str) -> bool:
    """Check if query looks like a real question needing specific information."""
    query_lower = query.lower().strip()

    # Contains question indicators
    question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does']
    has_question_word = any(query_lower.startswith(w) or f' {w} ' in f' {query_lower} ' for w in question_words)
    has_question_mark = '?' in query

    # Is long enough to be a real question
    is_long_enough = len(query_lower) >= MIN_QUERY_LENGTH

    return (has_question_word or has_question_mark) and is_long_enough


async def detect_unanswered_question(
    query: str,
    response: str,
    context: List[Dict],
    tenant_id: str,
    bot_id: str,
    session_id: str
) -> Optional[Dict]:
    """
    Detect if a query was not properly answered based on:
    1. Explicit fallback phrases in response (strongest signal)
    2. Low context relevance scores for real questions
    3. Empty retrieval results for questions that need specific info

    Skips simple greetings and confirmations.
    Returns the unanswered question record if detected, None otherwise.
    """
    # Skip simple greetings and confirmations - they don't need document context
    if is_simple_message(query):
        return None

    detection_method = None
    max_score = 0

    # Check 1: Explicit fallback phrases in response (strongest signal - always check)
    response_lower = response.lower()
    for phrase in FALLBACK_PHRASES:
        if phrase in response_lower:
            detection_method = "explicit_fallback"
            break

    # For the following checks, only flag if the query looks like a real question
    if not detection_method and looks_like_question(query):
        # Check 2: No sources retrieved for a real question
        if not context or len(context) == 0:
            detection_method = "no_sources"
            max_score = 0
        else:
            # Get the highest fused score from context
            max_score = max(
                c.get("fused_score", c.get("score", 0))
                for c in context
            )

            # Check 3: Low context relevance for a real question
            if max_score < CONTEXT_SCORE_THRESHOLD:
                detection_method = "low_context_score"

    if detection_method:
        db = get_mongodb()

        unanswered_record = {
            "_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "bot_id": bot_id,
            "session_id": session_id,
            "question": query,
            "response": response,
            "detection_method": detection_method,
            "context_score": max_score,
            "sources_count": len(context) if context else 0,
            "timestamp": datetime.utcnow(),
            "resolved": False,
            "processed": False
        }

        await db.unanswered_questions.insert_one(unanswered_record)
        return unanswered_record

    return None


async def analyze_sentiment(text: str) -> Dict:
    """
    AI-powered sentiment analysis using DeepSeek API.
    Returns sentiment label, score (-1 to 1), confidence, and detailed emotions.

    Falls back to rule-based analysis if API fails.
    """
    try:
        return await analyze_sentiment_deepseek(text)
    except Exception as e:
        print(f"DeepSeek sentiment analysis failed, using fallback: {e}")
        return await analyze_sentiment_fallback(text)


async def analyze_sentiment_deepseek(text: str) -> Dict:
    """
    Use DeepSeek API for accurate sentiment analysis.
    Analyzes emotions, intent, and overall sentiment.
    """
    prompt = f"""Analyze the sentiment of the following user message from a chatbot conversation.

Message: "{text}"

Respond ONLY with a JSON object (no markdown, no explanation) with these exact fields:
{{
    "label": "positive" or "negative" or "neutral",
    "score": a number from -1.0 (very negative) to 1.0 (very positive),
    "confidence": a number from 0.0 to 1.0 indicating how confident you are,
    "emotions": ["list", "of", "detected", "emotions"],
    "intent": "what the user is trying to accomplish",
    "urgency": "low" or "medium" or "high",
    "satisfaction": "satisfied" or "neutral" or "frustrated" or "angry"
}}

Be accurate and consider context, sarcasm, and implicit emotions."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.DEEPSEEK_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": settings.DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a sentiment analysis expert. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,  # Low temperature for consistent analysis
                "max_tokens": 200
            },
            timeout=30.0
        )

        if response.status_code != 200:
            raise Exception(f"DeepSeek API error: {response.status_code}")

        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Parse JSON response (handle potential markdown code blocks)
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        result = json.loads(content)

        # Ensure required fields exist
        return {
            "label": result.get("label", "neutral"),
            "score": float(result.get("score", 0)),
            "confidence": float(result.get("confidence", 0.8)),
            "emotions": result.get("emotions", []),
            "intent": result.get("intent", ""),
            "urgency": result.get("urgency", "low"),
            "satisfaction": result.get("satisfaction", "neutral"),
            "analysis_method": "deepseek"
        }


async def analyze_sentiment_fallback(text: str) -> Dict:
    """
    Fallback rule-based sentiment analysis when API is unavailable.
    """
    text_lower = text.lower()

    positive_words = [
        "thank", "thanks", "great", "excellent", "awesome", "perfect",
        "helpful", "appreciate", "good", "wonderful", "amazing", "love",
        "fantastic", "brilliant", "best", "happy", "pleased", "satisfied"
    ]

    negative_words = [
        "bad", "terrible", "awful", "horrible", "worst", "hate",
        "disappointed", "frustrat", "angry", "annoy", "useless",
        "wrong", "error", "problem", "issue", "fail", "broken",
        "stupid", "ridiculous", "waste", "never", "can't", "won't",
        "doesn't work", "not working", "doesn't help"
    ]

    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)

    total = positive_count + negative_count
    if total == 0:
        score = 0
        confidence = 0.3
    else:
        score = (positive_count - negative_count) / total
        confidence = min(0.9, 0.3 + (total * 0.1))

    if score > 0.2:
        label = "positive"
    elif score < -0.2:
        label = "negative"
    else:
        label = "neutral"

    return {
        "label": label,
        "score": score,
        "confidence": confidence,
        "emotions": [],
        "intent": "",
        "urgency": "low",
        "satisfaction": "neutral",
        "analysis_method": "fallback"
    }


async def analyze_conversation_sentiment(messages: List[Dict]) -> Dict:
    """
    Analyze sentiment of an entire conversation using DeepSeek.
    Provides overall sentiment and per-message breakdown.
    """
    if not messages:
        return {
            "overall_label": "neutral",
            "overall_score": 0,
            "trend": "stable",
            "key_emotions": [],
            "satisfaction_level": "neutral"
        }

    # Extract user messages
    user_messages = [m for m in messages if m.get("role") == "user"]

    if not user_messages:
        return {
            "overall_label": "neutral",
            "overall_score": 0,
            "trend": "stable",
            "key_emotions": [],
            "satisfaction_level": "neutral"
        }

    try:
        conversation_text = "\n".join([f"- {m.get('content', '')}" for m in user_messages[-10:]])

        prompt = f"""Analyze the overall sentiment of this conversation from a chatbot user.

User messages:
{conversation_text}

Respond ONLY with a JSON object:
{{
    "overall_label": "positive" or "negative" or "neutral",
    "overall_score": -1.0 to 1.0,
    "trend": "improving" or "declining" or "stable",
    "key_emotions": ["list", "of", "main", "emotions"],
    "satisfaction_level": "very_satisfied" or "satisfied" or "neutral" or "frustrated" or "angry",
    "summary": "brief one-sentence summary of user's sentiment"
}}"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a sentiment analysis expert. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 250
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise Exception(f"API error: {response.status_code}")

            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()

            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            result = json.loads(content)
            result["analysis_method"] = "deepseek"
            return result

    except Exception as e:
        print(f"Conversation sentiment analysis failed: {e}")
        # Fallback: analyze each message individually
        scores = []
        for msg in user_messages[-5:]:
            sentiment = await analyze_sentiment_fallback(msg.get("content", ""))
            scores.append(sentiment["score"])

        avg_score = sum(scores) / len(scores) if scores else 0

        return {
            "overall_label": "positive" if avg_score > 0.2 else "negative" if avg_score < -0.2 else "neutral",
            "overall_score": avg_score,
            "trend": "stable",
            "key_emotions": [],
            "satisfaction_level": "neutral",
            "analysis_method": "fallback"
        }


async def calculate_quality_score(
    query: str,
    response: str,
    context: List[Dict]
) -> Dict:
    """
    Calculate quality score for a response using heuristics.
    Returns overall score (0-10) and dimension scores.

    Dimensions:
    - relevance: How relevant is the response to the query?
    - completeness: Is the response thorough?
    - accuracy: Does it align with the source context?
    - clarity: Is it clear and well-structured?
    - source_alignment: How well does it match the retrieved sources?
    """
    scores = {}

    # 1. Relevance: Check keyword overlap between query and response
    query_words = set(query.lower().split())
    response_words = set(response.lower().split())
    common_words = query_words.intersection(response_words)
    relevance_ratio = len(common_words) / max(len(query_words), 1)
    scores["relevance"] = min(10, relevance_ratio * 15)

    # 2. Completeness: Response length relative to query complexity
    query_complexity = len(query.split())
    response_length = len(response.split())

    if query_complexity <= 5:
        # Short questions should have concise answers
        ideal_length = 50
    else:
        # Complex questions need more detail
        ideal_length = 100

    length_ratio = min(response_length / ideal_length, 2)
    if length_ratio < 0.3:
        scores["completeness"] = 3  # Too short
    elif length_ratio > 1.5:
        scores["completeness"] = 7  # Maybe too long but has content
    else:
        scores["completeness"] = 8 + (1 - abs(1 - length_ratio)) * 2

    # 3. Accuracy: Check if response doesn't contain fallback phrases
    response_lower = response.lower()
    has_fallback = any(phrase in response_lower for phrase in FALLBACK_PHRASES)
    if has_fallback:
        scores["accuracy"] = 3
    else:
        # Check context alignment
        if context:
            context_text = " ".join(c.get("content", "")[:200] for c in context).lower()
            context_words = set(context_text.split())
            response_context_overlap = len(response_words.intersection(context_words))
            scores["accuracy"] = min(10, 5 + (response_context_overlap / 10))
        else:
            scores["accuracy"] = 4  # No context to verify

    # 4. Clarity: Check for good structure indicators
    clarity_score = 7
    # Bonus for structured responses
    if "\n" in response or "- " in response or "1." in response:
        clarity_score += 1
    # Penalty for very long sentences
    sentences = response.split(".")
    avg_sentence_length = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
    if avg_sentence_length > 30:
        clarity_score -= 1
    if avg_sentence_length < 5:
        clarity_score -= 1
    scores["clarity"] = max(3, min(10, clarity_score))

    # 5. Source Alignment: Check if context was used
    if not context:
        scores["source_alignment"] = 3
    else:
        max_context_score = max(c.get("fused_score", c.get("score", 0)) for c in context)
        scores["source_alignment"] = min(10, max_context_score * 12)

    # Calculate overall score (weighted average)
    weights = {
        "relevance": 0.25,
        "completeness": 0.2,
        "accuracy": 0.25,
        "clarity": 0.15,
        "source_alignment": 0.15
    }

    overall = sum(scores[dim] * weights[dim] for dim in weights)

    return {
        "overall": round(overall, 2),
        "relevance": round(scores["relevance"], 2),
        "completeness": round(scores["completeness"], 2),
        "accuracy": round(scores["accuracy"], 2),
        "clarity": round(scores["clarity"], 2),
        "source_alignment": round(scores["source_alignment"], 2),
        "evaluated_at": datetime.utcnow(),
        "evaluation_method": "heuristic"
    }


async def track_usage_realtime(
    bot_id: str,
    session_id: str
):
    """
    Track real-time usage in Redis for analytics.
    Call this on each message.
    """
    from ..core.database import get_redis

    redis = get_redis()
    if not redis:
        return

    try:
        now = datetime.utcnow()
        hour_key = now.strftime("%Y-%m-%d-%H")
        minute_key = now.strftime("%Y-%m-%d-%H-%M")

        # Increment counters
        await redis.incr(f"analytics:{bot_id}:hourly:{hour_key}:messages")
        await redis.expire(f"analytics:{bot_id}:hourly:{hour_key}:messages", 86400)  # 24h TTL

        await redis.incr(f"analytics:{bot_id}:minute:{minute_key}:messages")
        await redis.expire(f"analytics:{bot_id}:minute:{minute_key}:messages", 3600)  # 1h TTL

        # Track active sessions (set with 30 min expiry for session items)
        await redis.sadd(f"analytics:{bot_id}:active_sessions", session_id)
        await redis.expire(f"analytics:{bot_id}:active_sessions", 1800)  # 30 min TTL

        # Track session in hourly set
        await redis.sadd(f"analytics:{bot_id}:hourly:{hour_key}:sessions", session_id)
        await redis.expire(f"analytics:{bot_id}:hourly:{hour_key}:sessions", 86400)

    except Exception as e:
        # Don't fail the request if analytics tracking fails
        print(f"Analytics tracking error: {e}")
