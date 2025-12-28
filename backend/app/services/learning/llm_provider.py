"""
LLM Provider Abstraction Layer

Enables the learning system to work with any LLM API (DeepSeek, OpenAI, Claude, etc.)
by providing a unified interface.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx
import json
import logging
from enum import Enum

from ...core.config import settings

logger = logging.getLogger(__name__)


class LLMCapability(str, Enum):
    """Capabilities that an LLM provider may support."""
    CHAT = "chat"
    STREAMING = "streaming"
    JSON_MODE = "json_mode"
    FUNCTION_CALLING = "function_calling"
    EMBEDDINGS = "embeddings"


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    name: str = "base"
    capabilities: List[LLMCapability] = []

    @abstractmethod
    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        json_mode: bool = False,
        **kwargs
    ) -> str:
        """Generate a response from the LLM."""
        pass

    @abstractmethod
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response from the LLM."""
        pass

    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Generate embeddings for text."""
        pass

    def supports(self, capability: LLMCapability) -> bool:
        """Check if provider supports a capability."""
        return capability in self.capabilities


class DeepSeekProvider(LLMProvider):
    """DeepSeek API provider."""

    name = "deepseek"
    capabilities = [
        LLMCapability.CHAT,
        LLMCapability.STREAMING,
        LLMCapability.JSON_MODE,
    ]

    def __init__(self):
        self.api_base = settings.DEEPSEEK_API_BASE
        self.api_key = settings.DEEPSEEK_API_KEY
        self.model = settings.DEEPSEEK_MODEL
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with connection pooling."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(60.0, connect=10.0),
                limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
                http2=True
            )
        return self._client

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        json_mode: bool = False,
        **kwargs
    ) -> str:
        """Generate a response from DeepSeek."""
        client = await self._get_client()

        request_body = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if json_mode:
            request_body["response_format"] = {"type": "json_object"}

        try:
            response = await client.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json=request_body
            )

            if response.status_code != 200:
                logger.error(f"DeepSeek API error: {response.status_code} - {response.text}")
                raise Exception(f"DeepSeek API error: {response.text}")

            data = response.json()
            return data["choices"][0]["message"]["content"]

        except httpx.TimeoutException:
            logger.error("DeepSeek API timeout")
            raise Exception("LLM request timed out")
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            raise

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response from DeepSeek."""
        client = await self._get_client()

        try:
            async with client.stream(
                "POST",
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True
                }
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
                                yield content
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"DeepSeek streaming error: {e}")
            raise

    async def embed(self, text: str) -> List[float]:
        """Generate embeddings using the embedding service."""
        # DeepSeek doesn't have an embedding API, use the embedding service
        from ..embedding import get_embedding
        return await get_embedding(text)


class OpenAIProvider(LLMProvider):
    """OpenAI API provider (for future use or fallback)."""

    name = "openai"
    capabilities = [
        LLMCapability.CHAT,
        LLMCapability.STREAMING,
        LLMCapability.JSON_MODE,
        LLMCapability.FUNCTION_CALLING,
        LLMCapability.EMBEDDINGS,
    ]

    def __init__(self, api_key: str = None, model: str = "gpt-4"):
        self.api_key = api_key or getattr(settings, 'OPENAI_API_KEY', None)
        self.model = model
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(60.0, connect=10.0),
                limits=httpx.Limits(max_connections=20),
            )
        return self._client

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        json_mode: bool = False,
        **kwargs
    ) -> str:
        """Generate a response from OpenAI."""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        client = await self._get_client()

        request_body = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if json_mode:
            request_body["response_format"] = {"type": "json_object"}

        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json=request_body
            )

            if response.status_code != 200:
                raise Exception(f"OpenAI API error: {response.text}")

            data = response.json()
            return data["choices"][0]["message"]["content"]

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response from OpenAI."""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        client = await self._get_client()

        try:
            async with client.stream(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True
                }
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
                                yield content
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            raise

    async def embed(self, text: str) -> List[float]:
        """Generate embeddings from OpenAI."""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        client = await self._get_client()

        response = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "text-embedding-3-small",
                "input": text
            }
        )

        if response.status_code != 200:
            raise Exception(f"OpenAI Embeddings API error: {response.text}")

        data = response.json()
        return data["data"][0]["embedding"]


# Provider registry
_providers: Dict[str, LLMProvider] = {}
_default_provider: Optional[LLMProvider] = None


def register_provider(provider: LLMProvider) -> None:
    """Register an LLM provider."""
    _providers[provider.name] = provider


def get_llm_provider(name: str = None) -> LLMProvider:
    """
    Get an LLM provider by name.

    If no name is provided, returns the default provider (DeepSeek).
    """
    global _default_provider

    if name:
        if name not in _providers:
            raise ValueError(f"Unknown LLM provider: {name}")
        return _providers[name]

    # Return default provider
    if _default_provider is None:
        _default_provider = DeepSeekProvider()
        register_provider(_default_provider)

    return _default_provider


def set_default_provider(provider: LLMProvider) -> None:
    """Set the default LLM provider."""
    global _default_provider
    _default_provider = provider
    register_provider(provider)


# Auto-register default providers
register_provider(DeepSeekProvider())


# Convenience functions
async def generate_with_provider(
    prompt: str,
    system_prompt: str = None,
    provider: str = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    json_mode: bool = False,
) -> str:
    """
    Generate a response using the specified or default provider.

    Args:
        prompt: The user prompt
        system_prompt: Optional system prompt
        provider: Provider name (default: DeepSeek)
        temperature: Generation temperature
        max_tokens: Maximum tokens to generate
        json_mode: Whether to request JSON output

    Returns:
        Generated response text
    """
    llm = get_llm_provider(provider)

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    return await llm.generate(
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=json_mode
    )


async def generate_json_with_provider(
    prompt: str,
    system_prompt: str = None,
    provider: str = None,
    temperature: float = 0.3,
) -> Dict[str, Any]:
    """
    Generate a JSON response using the specified provider.

    Args:
        prompt: The user prompt
        system_prompt: Optional system prompt
        provider: Provider name

    Returns:
        Parsed JSON response
    """
    response = await generate_with_provider(
        prompt=prompt,
        system_prompt=system_prompt,
        provider=provider,
        temperature=temperature,
        json_mode=True
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse JSON response: {response[:200]}")
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        raise ValueError("Could not parse JSON from response")
