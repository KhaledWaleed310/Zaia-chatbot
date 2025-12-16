import httpx
from typing import List, Dict, AsyncGenerator, Tuple
import json
import hashlib
from datetime import datetime
from ..core.config import settings
from ..core.database import get_mongodb

# DeepSeek API Pricing (per million tokens) - Updated Dec 2025
DEEPSEEK_PRICING = {
    "input_cache_hit": 0.07,      # $0.07 per 1M tokens (cache hit)
    "input_cache_miss": 0.56,     # $0.56 per 1M tokens (cache miss)
    "output": 1.68,               # $1.68 per 1M tokens
}


def build_optimized_messages(
    system_prompt: str,
    context: List[Dict],
    conversation_history: List[Dict] = None,
    query: str = ""
) -> List[Dict]:
    """
    Build messages optimized for DeepSeek's automatic prompt caching.

    DeepSeek caches prompt prefixes automatically on their servers.
    To maximize cache hits (87% cost reduction on input tokens):
    1. Put static/repeated content FIRST (system prompt)
    2. Put semi-static content next (context from documents)
    3. Put dynamic content last (conversation history, user query)

    This way, the same bot with same documents will hit cache on the prefix.
    No local RAM is used - caching happens on DeepSeek's servers.
    """

    # Build context string from retrieved documents
    context_text = "\n\n".join([
        f"[Source {i+1}]: {c['content']}"
        for i, c in enumerate(context)
    ]) if context else "No relevant context available."

    messages = []

    # 1. STATIC PREFIX: System prompt (same per bot) - HIGH cache hit potential
    # This part stays the same for every message to the same bot
    messages.append({
        "role": "system",
        "content": f"""## CRITICAL IDENTITY RULES (HIGHEST PRIORITY)

Your name is Aiden. You are NOT DeepSeek, NOT ChatGPT, NOT Claude, NOT Anthropic, NOT OpenAI, NOT any other AI model or company.

When anyone asks "who are you?", "what are you?", "what's your name?", or any similar identity question:
- ALWAYS respond: "I am Aiden" followed by your role as defined below
- NEVER mention DeepSeek, Anthropic, OpenAI, Claude, ChatGPT, GPT-4, or any other AI model names
- NEVER say you are "powered by" or "based on" any specific AI technology
- If pressed, simply say "I am Aiden, an AI assistant"

{system_prompt}

INSTRUCTIONS:
- Use the context below to answer questions accurately
- If the answer is not in the context, say you don't have that information
- Be concise and helpful

CONTEXT FROM KNOWLEDGE BASE:
{context_text}"""
    })

    # 2. DYNAMIC SUFFIX: Conversation history (changes each turn)
    if conversation_history:
        for msg in conversation_history[-10:]:  # Last 10 messages
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # 3. Current user query
    messages.append({
        "role": "user",
        "content": query
    })

    return messages


async def track_token_usage(
    tenant_id: str,
    bot_id: str,
    session_id: str,
    input_tokens: int,
    output_tokens: int,
    cached_tokens: int = 0
):
    """Track token usage for cost analysis."""
    db = get_mongodb()

    # Calculate costs
    cache_hit_tokens = cached_tokens
    cache_miss_tokens = input_tokens - cached_tokens

    input_cost = (
        (cache_hit_tokens / 1_000_000) * DEEPSEEK_PRICING["input_cache_hit"] +
        (cache_miss_tokens / 1_000_000) * DEEPSEEK_PRICING["input_cache_miss"]
    )
    output_cost = (output_tokens / 1_000_000) * DEEPSEEK_PRICING["output"]
    total_cost = input_cost + output_cost

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


async def generate_response(
    query: str,
    context: List[Dict],
    system_prompt: str,
    conversation_history: List[Dict] = None,
    tenant_id: str = None,
    bot_id: str = None,
    session_id: str = None
) -> str:
    """Generate response using DeepSeek API with optimized caching."""

    # Build messages optimized for DeepSeek's automatic prompt caching
    messages = build_optimized_messages(
        system_prompt=system_prompt,
        context=context,
        conversation_history=conversation_history,
        query=query
    )

    # Use aggressive timeout (30s instead of 60s) for better UX
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024
                },
                timeout=30.0  # Reduced from 60s for faster failure detection
            )
        except httpx.TimeoutException:
            # Return graceful fallback on timeout
            return "I apologize, but I'm taking longer than expected to respond. Please try asking your question again, or rephrase it to be more specific."

        if response.status_code != 200:
            raise Exception(f"DeepSeek API error: {response.text}")

        data = response.json()

        # Track token usage if we have tenant info
        if tenant_id and bot_id:
            usage = data.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            cached_tokens = usage.get("prompt_cache_hit_tokens", 0)

            await track_token_usage(
                tenant_id=tenant_id,
                bot_id=bot_id,
                session_id=session_id or "unknown",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cached_tokens=cached_tokens
            )

        return data["choices"][0]["message"]["content"]


async def generate_response_simple(
    prompt: str,
    max_tokens: int = 500,
    temperature: float = 0.1
) -> str:
    """
    Generate a simple response for utility tasks like extraction.

    This is a lightweight call without context or conversation history,
    useful for tasks like booking extraction or summarization.

    Args:
        prompt: The prompt to send
        max_tokens: Maximum tokens in response
        temperature: Temperature for generation (lower = more deterministic)

    Returns:
        The generated response text
    """
    messages = [{"role": "user", "content": prompt}]

    async with httpx.AsyncClient() as client:
        try:
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
                timeout=15.0  # Short timeout for utility calls
            )
        except httpx.TimeoutException:
            raise Exception("LLM request timed out")

        if response.status_code != 200:
            raise Exception(f"DeepSeek API error: {response.text}")

        data = response.json()
        return data["choices"][0]["message"]["content"]


async def generate_response_stream(
    query: str,
    context: List[Dict],
    system_prompt: str,
    conversation_history: List[Dict] = None,
    tenant_id: str = None,
    bot_id: str = None,
    session_id: str = None
) -> AsyncGenerator[str, None]:
    """Generate streaming response using DeepSeek API with optimized caching."""

    # Build messages optimized for DeepSeek's automatic prompt caching
    messages = build_optimized_messages(
        system_prompt=system_prompt,
        context=context,
        conversation_history=conversation_history,
        query=query
    )

    # Estimate input tokens for streaming (rough estimate: 4 chars per token)
    input_text = json.dumps(messages)
    estimated_input_tokens = len(input_text) // 4
    output_token_count = 0

    # Use aggressive timeout (30s instead of 60s) for better UX
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024,
                    "stream": True
                },
                timeout=30.0  # Reduced from 60s for faster failure detection
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk["choices"][0]["delta"].get("content")
                            if content:
                                output_token_count += len(content) // 4  # Rough estimate
                                yield content
                        except json.JSONDecodeError:
                            continue
    except httpx.TimeoutException:
        # Yield timeout message on failure
        yield "I apologize, but I'm taking longer than expected. Please try again."

    # Track token usage after streaming completes
    if tenant_id and bot_id:
        await track_token_usage(
            tenant_id=tenant_id,
            bot_id=bot_id,
            session_id=session_id or "unknown",
            input_tokens=estimated_input_tokens,
            output_tokens=max(output_token_count, 1),
            cached_tokens=0  # Can't determine cache hits in streaming mode
        )
