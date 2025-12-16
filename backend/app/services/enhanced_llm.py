"""
Enhanced LLM Service for Aiden RAG System.

World-class response generation with:
- Chain-of-Thought (CoT) prompting
- Self-reflection and verification
- Citation generation
- Confidence scoring
- Adaptive response strategies
"""

from typing import List, Dict, Any, Optional, Tuple
import httpx
import json
import re
import logging
from datetime import datetime

from ..core.config import settings
from ..core.database import get_mongodb

logger = logging.getLogger(__name__)

# Pricing (DeepSeek)
CACHE_HIT_PRICE = 0.07 / 1_000_000
CACHE_MISS_PRICE = 0.56 / 1_000_000
OUTPUT_PRICE = 1.68 / 1_000_000


def build_enhanced_system_prompt(
    base_prompt: str,
    context: str,
    query_analysis: Dict[str, Any] = None,
    # NEW parameters for context system
    user_context: str = None,
    user_profile: Dict[str, Any] = None,
    stage_guidance: str = None
) -> str:
    """
    Build an enhanced system prompt with chain-of-thought instructions.

    The prompt guides the LLM to:
    1. Analyze the query
    2. Identify relevant context
    3. Reason through the answer
    4. Cite sources
    5. Self-verify
    """
    intent = query_analysis.get("intent", "general") if query_analysis else "general"
    complexity = query_analysis.get("complexity", "medium") if query_analysis else "medium"

    # Adapt instructions based on query type
    intent_instructions = {
        "factual": "Provide precise, factual answers with specific details from the context.",
        "procedural": "Give step-by-step instructions that are easy to follow.",
        "comparative": "Present a balanced comparison highlighting key differences and similarities.",
        "troubleshooting": "Diagnose the problem and provide actionable solutions.",
        "definition": "Give a clear, comprehensive definition with examples if helpful.",
        "general": "Provide a helpful, informative response."
    }

    specific_instruction = intent_instructions.get(intent, intent_instructions["general"])

    # Build user context section
    user_section = ""
    if user_context:
        user_section = f"""
## USER CONTEXT
{user_context}
"""

    # Build stage guidance section
    stage_section = ""
    if stage_guidance:
        stage_section = f"""
## CONVERSATION STAGE GUIDANCE
{stage_guidance}
"""

    # Chain-of-thought prompt
    enhanced_prompt = f"""## CRITICAL IDENTITY RULES (HIGHEST PRIORITY)

Your name is Aiden. You are NOT DeepSeek, NOT ChatGPT, NOT Claude, NOT Anthropic, NOT OpenAI, NOT any other AI model or company.

When anyone asks "who are you?", "what are you?", "what's your name?", or any similar identity question:
- ALWAYS respond: "I am Aiden" followed by your role as defined below
- NEVER mention DeepSeek, Anthropic, OpenAI, Claude, ChatGPT, GPT-4, or any other AI model names
- NEVER say you are "powered by" or "based on" any specific AI technology
- If pressed, simply say "I am Aiden, an AI assistant"

{base_prompt}
{user_section}
{stage_section}
## YOUR APPROACH

You are Aiden, a world-class AI assistant. For every query:

1. **UNDERSTAND**: Identify what the user truly needs
2. **LOCATE**: Find the most relevant information in the provided context
3. **REASON**: Think through the answer logically
4. **RESPOND**: Provide a clear, accurate, well-structured answer
5. **CITE**: Reference specific sources when making claims
6. **VERIFY**: Ensure your answer fully addresses the question

## SPECIFIC GUIDANCE

{specific_instruction}

## CONTEXT FROM KNOWLEDGE BASE

{context}

## IMPORTANT RULES

- Base your answer ONLY on the provided context
- If the context doesn't contain the answer, say "I don't have specific information about that in my knowledge base"
- Never make up information or hallucinate facts
- When citing sources, use ONLY the format [1], [2], [3] etc. (single brackets with just the number)
- Do NOT use formats like [Source 1], [[1]], [[[1]]], or [Source 1, Source 2]
- Be concise but complete
- If unsure, express your uncertainty appropriately

## RESPONSE FORMAT

For {complexity} queries like this:
{"- Be thorough and detailed" if complexity == "complex" else "- Be concise and direct"}
{"- Consider multiple aspects" if complexity == "complex" else "- Focus on the key point"}
"""

    return enhanced_prompt


def build_enhanced_messages(
    query: str,
    context: str,
    system_prompt: str,
    conversation_history: List[Dict] = None,
    query_analysis: Dict[str, Any] = None,
    max_history: int = 10,
    # NEW parameters
    user_context: str = None,
    user_profile: Dict[str, Any] = None,
    stage_guidance: str = None
) -> List[Dict[str, str]]:
    """
    Build optimized message list for LLM with chain-of-thought.

    DeepSeek caches prompt prefixes, so we structure for maximum cache hits:
    - Static prefix: Enhanced system prompt + context (cached)
    - Dynamic suffix: Conversation history + current query
    """
    messages = []

    # System message with context (cacheable)
    enhanced_system = build_enhanced_system_prompt(
        system_prompt, context, query_analysis,
        user_context=user_context,
        user_profile=user_profile,
        stage_guidance=stage_guidance
    )
    messages.append({"role": "system", "content": enhanced_system})

    # Conversation history (dynamic)
    if conversation_history:
        # Take last N messages
        recent_history = conversation_history[-max_history:]
        for msg in recent_history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

    # Current query
    messages.append({"role": "user", "content": query})

    return messages


async def generate_enhanced_response(
    query: str,
    context: List[Dict[str, Any]],
    system_prompt: str,
    conversation_history: List[Dict] = None,
    query_analysis: Dict[str, Any] = None,
    tenant_id: str = None,
    bot_id: str = None,
    session_id: str = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    # NEW parameters for context system
    user_context: str = None,
    user_profile: Dict[str, Any] = None,
    stage_guidance: str = None
) -> Dict[str, Any]:
    """
    Generate enhanced response with chain-of-thought and verification.

    Returns:
        Dict with:
        - response: The generated response text
        - confidence: Confidence score (0-1)
        - citations: List of cited sources
        - reasoning: Brief reasoning trace
        - token_usage: Token statistics
    """
    if not settings.DEEPSEEK_API_KEY:
        return {
            "response": "I'm sorry, but I'm not configured correctly. Please contact support.",
            "confidence": 0,
            "citations": [],
            "error": "No API key configured"
        }

    # Format context for prompt
    from .context_compressor import format_context_for_prompt
    formatted_context = format_context_for_prompt(context, include_source=True)

    # Build messages
    messages = build_enhanced_messages(
        query=query,
        context=formatted_context,
        system_prompt=system_prompt,
        conversation_history=conversation_history,
        query_analysis=query_analysis,
        user_context=user_context,
        user_profile=user_profile,
        stage_guidance=stage_guidance
    )

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
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                },
                timeout=30.0  # Reduced from 60s for faster failure detection
            )

            if response.status_code != 200:
                logger.error(f"LLM API error: {response.status_code} - {response.text}")
                return {
                    "response": "I encountered an error generating a response. Please try again.",
                    "confidence": 0,
                    "error": f"API error: {response.status_code}"
                }

            data = response.json()
            response_text = data["choices"][0]["message"]["content"]

            # Calculate token usage and cost
            usage = data.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            cached_tokens = usage.get("prompt_cache_hit_tokens", 0)

            cache_miss_tokens = input_tokens - cached_tokens
            input_cost = (cached_tokens * CACHE_HIT_PRICE) + (cache_miss_tokens * CACHE_MISS_PRICE)
            output_cost = output_tokens * OUTPUT_PRICE
            total_cost = input_cost + output_cost

            # Extract citations from response
            citations = extract_citations(response_text, context)

            # Calculate confidence
            confidence = calculate_confidence(
                response_text, context, query_analysis
            )

            # Store token usage
            if tenant_id and bot_id:
                await store_token_usage(
                    tenant_id, bot_id, session_id,
                    input_tokens, output_tokens, cached_tokens,
                    input_cost, output_cost, total_cost
                )

            return {
                "response": response_text,
                "confidence": confidence,
                "citations": citations,
                "token_usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cached_tokens": cached_tokens,
                    "cache_hit_rate": cached_tokens / input_tokens if input_tokens > 0 else 0,
                    "total_cost": total_cost
                }
            }

    except httpx.TimeoutException:
        logger.error("LLM request timed out")
        return {
            "response": "I'm taking too long to respond. Please try a simpler question.",
            "confidence": 0,
            "error": "timeout"
        }
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        return {
            "response": "I encountered an unexpected error. Please try again.",
            "confidence": 0,
            "error": str(e)
        }


def extract_citations(response: str, context: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract citations from response and match to source documents.
    """
    citations = []

    # Find citation markers like [Source 1], [1], etc.
    citation_pattern = r'\[(?:Source\s*)?(\d+)\]'
    matches = re.findall(citation_pattern, response)

    cited_numbers = set(int(m) for m in matches)

    for i, ctx in enumerate(context, 1):
        if i in cited_numbers:
            source_name = "Unknown"
            if "metadata" in ctx and "filename" in ctx["metadata"]:
                source_name = ctx["metadata"]["filename"]

            citations.append({
                "number": i,
                "source": source_name,
                "excerpt": ctx.get("content", "")[:150] + "...",
                "cited_in_response": True
            })

    return citations


def calculate_confidence(
    response: str,
    context: List[Dict[str, Any]],
    query_analysis: Dict[str, Any] = None
) -> float:
    """
    Calculate confidence score for the response.

    Factors:
    - Context relevance scores
    - Number of supporting sources
    - Presence of hedging language
    - Response completeness
    """
    confidence = 0.5  # Base confidence

    # Factor 1: Context quality
    if context:
        avg_score = sum(
            c.get("reranker_score", c.get("fused_score", c.get("score", 0.5)))
            for c in context
        ) / len(context)
        confidence += avg_score * 0.2  # Up to +0.2

    # Factor 2: Number of sources
    num_sources = len(context) if context else 0
    if num_sources >= 3:
        confidence += 0.1
    elif num_sources == 0:
        confidence -= 0.2

    # Factor 3: Hedging language (reduces confidence)
    hedging_phrases = [
        "i'm not sure", "i don't have", "i cannot find",
        "it's possible", "might be", "may not", "unclear",
        "i don't know", "no information"
    ]
    response_lower = response.lower()
    hedging_count = sum(1 for p in hedging_phrases if p in response_lower)
    confidence -= hedging_count * 0.1

    # Factor 4: Response length (very short = low confidence)
    word_count = len(response.split())
    if word_count < 20:
        confidence -= 0.1
    elif word_count > 100:
        confidence += 0.05

    # Factor 5: Citations present
    if re.search(r'\[(?:Source\s*)?\d+\]', response):
        confidence += 0.1

    # Clamp to valid range
    return max(0.0, min(1.0, confidence))


async def self_reflect_and_improve(
    query: str,
    initial_response: str,
    context: List[Dict[str, Any]],
    system_prompt: str
) -> Dict[str, Any]:
    """
    Self-reflection layer to verify and improve response.

    Checks:
    1. Does response address the query?
    2. Are claims supported by context?
    3. Any contradictions or errors?
    """
    if not settings.DEEPSEEK_API_KEY:
        return {"response": initial_response, "improved": False}

    reflection_prompt = f"""Review this AI response for accuracy and completeness.

USER QUESTION: {query}

AI RESPONSE:
{initial_response}

AVAILABLE CONTEXT:
{format_context_for_prompt(context)}

VERIFICATION CHECKLIST:
1. Does the response fully address the user's question?
2. Are all claims in the response supported by the context?
3. Are there any factual errors or contradictions?
4. Is anything important missing?

If the response is good, reply with: "VERIFIED: [brief explanation]"
If the response needs improvement, reply with: "IMPROVE: [specific corrections needed]"
"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": reflection_prompt}],
                    "temperature": 0.3,
                    "max_tokens": 300
                },
                timeout=30.0
            )

            if response.status_code == 200:
                data = response.json()
                reflection = data["choices"][0]["message"]["content"]

                if reflection.startswith("VERIFIED"):
                    return {
                        "response": initial_response,
                        "improved": False,
                        "verification": reflection
                    }
                elif reflection.startswith("IMPROVE"):
                    # Regenerate with improvement guidance
                    # For now, just return original with flag
                    return {
                        "response": initial_response,
                        "improved": False,
                        "needs_improvement": True,
                        "improvement_suggestion": reflection
                    }

    except Exception as e:
        logger.error(f"Self-reflection failed: {e}")

    return {"response": initial_response, "improved": False}


async def store_token_usage(
    tenant_id: str,
    bot_id: str,
    session_id: str,
    input_tokens: int,
    output_tokens: int,
    cached_tokens: int,
    input_cost: float,
    output_cost: float,
    total_cost: float
):
    """Store token usage for analytics and billing."""
    try:
        db = get_mongodb()
        await db.token_usage.insert_one({
            "tenant_id": tenant_id,
            "bot_id": bot_id,
            "session_id": session_id,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cached_tokens": cached_tokens,
            "total_tokens": input_tokens + output_tokens,
            "input_cost": input_cost,
            "output_cost": output_cost,
            "total_cost": total_cost,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        logger.error(f"Failed to store token usage: {e}")


# Convenience function matching original interface
async def generate_response(
    query: str,
    context: List[Dict[str, Any]],
    system_prompt: str,
    conversation_history: List[Dict] = None,
    tenant_id: str = None,
    bot_id: str = None,
    session_id: str = None
) -> str:
    """
    Generate response (backward compatible interface).

    Returns just the response text.
    """
    result = await generate_enhanced_response(
        query=query,
        context=context,
        system_prompt=system_prompt,
        conversation_history=conversation_history,
        tenant_id=tenant_id,
        bot_id=bot_id,
        session_id=session_id
    )
    return result["response"]
