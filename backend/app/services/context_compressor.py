"""
Contextual Compression Service for Aiden RAG System.

This module provides intelligent compression of retrieved context:
- Extract only relevant sentences from chunks
- Summarize long documents
- Remove redundant information
- Maintain source attribution for citations
"""

from typing import List, Dict, Any, Optional
import httpx
import re
import logging
from functools import lru_cache

from ..core.config import settings

logger = logging.getLogger(__name__)


def split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences.

    Uses simple regex-based splitting with common abbreviation handling.
    """
    # Handle common abbreviations
    text = re.sub(r'\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\.',
                  r'\1<PERIOD>', text)

    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)

    # Restore periods in abbreviations
    sentences = [s.replace('<PERIOD>', '.') for s in sentences]

    # Filter empty sentences
    return [s.strip() for s in sentences if s.strip()]


def extract_relevant_sentences(
    query: str,
    text: str,
    max_sentences: int = 5,
    min_relevance: float = 0.3
) -> str:
    """
    Extract sentences most relevant to the query.

    Uses keyword overlap scoring for fast relevance estimation.
    """
    sentences = split_into_sentences(text)

    if len(sentences) <= max_sentences:
        return text

    # Extract query keywords
    query_words = set(
        word.lower()
        for word in re.findall(r'\b\w+\b', query)
        if len(word) > 2
    )

    # Score sentences by keyword overlap
    scored_sentences = []
    for sent in sentences:
        sent_words = set(
            word.lower()
            for word in re.findall(r'\b\w+\b', sent)
            if len(word) > 2
        )

        if not sent_words:
            continue

        # Jaccard-like overlap score
        overlap = len(query_words & sent_words)
        score = overlap / (len(query_words) + 0.1)  # Avoid division by zero

        # Boost for longer sentences (likely more informative)
        length_bonus = min(len(sent_words) / 20, 0.3)
        score += length_bonus

        if score >= min_relevance or overlap >= 2:
            scored_sentences.append((sent, score))

    # Sort by relevance and take top sentences
    scored_sentences.sort(key=lambda x: x[1], reverse=True)
    top_sentences = [s[0] for s in scored_sentences[:max_sentences]]

    # Maintain original order for readability
    original_order = []
    for sent in sentences:
        if sent in top_sentences:
            original_order.append(sent)
            if len(original_order) >= max_sentences:
                break

    return " ".join(original_order) if original_order else text[:500]


async def llm_compress_context(
    query: str,
    context: str,
    max_tokens: int = 300
) -> str:
    """
    Use LLM to intelligently compress context.

    Extracts only information relevant to answering the query.
    """
    if not settings.DEEPSEEK_API_KEY:
        return extract_relevant_sentences(query, context)

    if len(context.split()) < 100:
        return context  # Already short enough

    prompt = f"""Extract only the information relevant to answering this question.
Keep key facts, numbers, and details. Remove irrelevant information.
Maintain attribution if source is mentioned.

Question: {query}

Full Context:
{context}

Relevant Information (be concise):"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": max_tokens
                },
                timeout=15.0
            )

            if response.status_code == 200:
                data = response.json()
                compressed = data["choices"][0]["message"]["content"].strip()
                logger.debug(f"Compressed context from {len(context)} to {len(compressed)} chars")
                return compressed

    except Exception as e:
        logger.error(f"LLM compression failed: {e}")

    return extract_relevant_sentences(query, context)


def remove_redundant_context(
    contexts: List[Dict[str, Any]],
    similarity_threshold: float = 0.8
) -> List[Dict[str, Any]]:
    """
    Remove near-duplicate contexts to reduce redundancy.

    Uses n-gram overlap for fast similarity estimation.
    """
    if len(contexts) <= 1:
        return contexts

    def get_ngrams(text: str, n: int = 3) -> set:
        """Generate character n-grams for similarity comparison."""
        text = text.lower()
        return set(text[i:i+n] for i in range(len(text) - n + 1))

    unique_contexts = []
    seen_ngrams = []

    for ctx in contexts:
        content = ctx.get("content", "")
        ngrams = get_ngrams(content)

        # Check similarity with already selected contexts
        is_duplicate = False
        for seen in seen_ngrams:
            if not ngrams or not seen:
                continue
            overlap = len(ngrams & seen) / max(len(ngrams), len(seen))
            if overlap > similarity_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            unique_contexts.append(ctx)
            seen_ngrams.append(ngrams)

    logger.debug(f"Removed {len(contexts) - len(unique_contexts)} redundant contexts")
    return unique_contexts


async def compress_contexts(
    query: str,
    contexts: List[Dict[str, Any]],
    max_total_tokens: int = 2000,
    use_llm: bool = False,
    remove_redundancy: bool = True
) -> List[Dict[str, Any]]:
    """
    Full context compression pipeline.

    Args:
        query: User query for relevance scoring
        contexts: List of retrieved context documents
        max_total_tokens: Maximum total tokens across all contexts
        use_llm: Use LLM for intelligent compression
        remove_redundancy: Remove near-duplicate contexts

    Returns:
        Compressed contexts maintaining source attribution
    """
    if not contexts:
        return []

    # Step 1: Remove redundancy
    if remove_redundancy:
        contexts = remove_redundant_context(contexts)

    # Step 2: Estimate current token count
    def estimate_tokens(text: str) -> int:
        return len(text.split()) * 1.3  # Rough estimate

    total_tokens = sum(estimate_tokens(c.get("content", "")) for c in contexts)

    # If already within budget, return as-is
    if total_tokens <= max_total_tokens:
        return contexts

    # Step 3: Compress individual contexts
    compressed_contexts = []
    tokens_per_context = max_total_tokens // len(contexts)

    for ctx in contexts:
        content = ctx.get("content", "")
        current_tokens = estimate_tokens(content)

        if current_tokens > tokens_per_context:
            # Needs compression
            if use_llm:
                compressed_content = await llm_compress_context(
                    query, content,
                    max_tokens=tokens_per_context
                )
            else:
                # Sentence extraction based on query relevance
                target_sentences = max(3, tokens_per_context // 30)
                compressed_content = extract_relevant_sentences(
                    query, content,
                    max_sentences=target_sentences
                )

            compressed_ctx = {**ctx, "content": compressed_content, "compressed": True}
        else:
            compressed_ctx = {**ctx, "compressed": False}

        compressed_contexts.append(compressed_ctx)

    return compressed_contexts


def format_context_for_prompt(
    contexts: List[Dict[str, Any]],
    include_source: bool = True,
    include_score: bool = False
) -> str:
    """
    Format compressed contexts for LLM prompt.

    Creates a well-structured context section with source attribution.
    """
    if not contexts:
        return "No relevant context found."

    formatted_parts = []

    for i, ctx in enumerate(contexts, 1):
        content = ctx.get("content", "")
        source = ctx.get("source", "document")

        # Build source info
        source_info = []
        if include_source:
            if "metadata" in ctx and "filename" in ctx["metadata"]:
                source_info.append(ctx["metadata"]["filename"])
            else:
                source_info.append(f"Source {i}")

        if include_score:
            score = ctx.get("reranker_score", ctx.get("fused_score", ctx.get("score", 0)))
            source_info.append(f"relevance: {score:.2f}")

        source_str = f"[{', '.join(source_info)}]" if source_info else f"[Source {i}]"

        formatted_parts.append(f"{source_str}\n{content}")

    return "\n\n---\n\n".join(formatted_parts)


def create_citations(
    response: str,
    contexts: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Add citation markers to response and create citation list.

    Maps claims in response to source documents.
    """
    citations = []

    for i, ctx in enumerate(contexts, 1):
        content = ctx.get("content", "")
        source_name = "Unknown"

        if "metadata" in ctx and "filename" in ctx["metadata"]:
            source_name = ctx["metadata"]["filename"]

        citations.append({
            "number": i,
            "source": source_name,
            "excerpt": content[:200] + "..." if len(content) > 200 else content
        })

    return {
        "response": response,
        "citations": citations,
        "citation_format": "Use [1], [2], etc. to reference sources"
    }
