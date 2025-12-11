from openai import AsyncOpenAI
from typing import List, Optional, AsyncGenerator
import structlog

from ..config import settings
from ..models import ChatbotConfig

logger = structlog.get_logger()


class RetrievalResult:
    """Result from retrieval system."""
    def __init__(self, text: str, score: float, source: str, metadata: dict = None, chunk_id: str = None):
        self.text = text
        self.score = score
        self.source = source
        self.metadata = metadata or {}
        self.chunk_id = chunk_id


class ResponseGenerator:
    """LLM response generator using DeepSeek API."""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key or "dummy-key",
            base_url=settings.deepseek_base_url
        )
        self.model = "deepseek-chat"

    def _build_system_prompt(self, config: ChatbotConfig) -> str:
        """Build the system prompt from chatbot configuration."""
        base = config.system_prompt or "You are a helpful assistant."

        parts = [base]

        if config.personality:
            parts.append(f"\nPersonality: {config.personality}")

        if config.language:
            parts.append(f"Language: Respond in {config.language}")

        if config.company_name:
            parts.append(f"You represent: {config.company_name}")

        parts.append("""
When answering:
- Base your response ONLY on the provided context
- If the answer is not in the context, say "I don't have information about that in my knowledge base"
- Cite sources using [1], [2], etc. when referencing specific information
- Be concise, helpful, and accurate
- Maintain a friendly, professional tone""")

        return "\n".join(parts)

    def _format_context(self, chunks: List[RetrievalResult]) -> str:
        """Format retrieval results as context string."""
        if not chunks:
            return "No relevant context found."

        formatted = []
        for i, chunk in enumerate(chunks, 1):
            source_info = f"[Source: {chunk.source}]"
            if chunk.metadata.get("source_file"):
                source_info += f" (File: {chunk.metadata['source_file']})"
            formatted.append(f"[{i}] {chunk.text}\n{source_info}")

        return "\n\n".join(formatted)

    async def generate(
        self,
        query: str,
        context_chunks: List[RetrievalResult],
        chatbot_config: ChatbotConfig,
        conversation_history: List[dict] = None
    ) -> dict:
        """Generate a response using the LLM."""
        system_prompt = self._build_system_prompt(chatbot_config)
        context = self._format_context(context_chunks)

        user_message = f"""Answer based on the following context:

<context>
{context}
</context>

Question: {query}"""

        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history[-10:])  # Last 10 messages

        messages.append({"role": "user", "content": user_message})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=chatbot_config.temperature,
                max_tokens=chatbot_config.max_tokens,
            )

            answer = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else 0

            logger.info(
                "Generated response",
                query_preview=query[:50],
                tokens=tokens_used,
                chunks_used=len(context_chunks)
            )

            return {
                "answer": answer,
                "sources": [
                    {
                        "text": c.text[:200],
                        "source": c.source,
                        "score": c.score
                    }
                    for c in context_chunks
                ],
                "tokens_used": tokens_used
            }

        except Exception as e:
            logger.error("LLM generation failed", error=str(e))
            # Return a fallback response
            return {
                "answer": "I apologize, but I'm having trouble processing your request right now. Please try again.",
                "sources": [],
                "tokens_used": 0,
                "error": str(e)
            }

    async def generate_stream(
        self,
        query: str,
        context_chunks: List[RetrievalResult],
        chatbot_config: ChatbotConfig,
        conversation_history: List[dict] = None
    ) -> AsyncGenerator[str, None]:
        """Stream a response using the LLM."""
        system_prompt = self._build_system_prompt(chatbot_config)
        context = self._format_context(context_chunks)

        user_message = f"""Answer based on the following context:

<context>
{context}
</context>

Question: {query}"""

        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            messages.extend(conversation_history[-10:])

        messages.append({"role": "user", "content": user_message})

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=chatbot_config.temperature,
                max_tokens=chatbot_config.max_tokens,
                stream=True
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error("LLM streaming failed", error=str(e))
            yield "I apologize, but I'm having trouble processing your request right now."
