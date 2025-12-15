"""
Title Generator for Personal Chatbot Mode.
Generates concise conversation titles from first user message.
"""

import httpx
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)


async def generate_title(message: str, max_length: int = 50) -> str:
    """
    Generate a concise title from the first user message.

    Args:
        message: First user message
        max_length: Maximum title length

    Returns:
        Concise title (2-6 words)
    """
    if not settings.DEEPSEEK_API_KEY:
        return truncate_message(message, max_length)

    prompt = f'''Generate a very short title (2-5 words) for a chat conversation that starts with this message:

"{message}"

Rules:
- Maximum 5 words
- No quotes or punctuation
- Descriptive and clear
- Examples: "API Integration Help", "Pricing Question", "Account Setup"

Title:'''

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
                    "temperature": 0.7,
                    "max_tokens": 20
                },
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                title = data["choices"][0]["message"]["content"].strip()
                title = title.strip('"\'').strip()

                if len(title) > max_length or len(title) < 2:
                    return truncate_message(message, max_length)

                return title
            else:
                logger.warning(f"Title API error: {response.status_code}")
                return truncate_message(message, max_length)

    except Exception as e:
        logger.error(f"Title generation error: {e}")
        return truncate_message(message, max_length)


def truncate_message(text: str, max_length: int) -> str:
    """Truncate message to max_length with ellipsis."""
    text = text.strip()
    if len(text) <= max_length:
        return text
    return text[:max_length-3].strip() + "..."
