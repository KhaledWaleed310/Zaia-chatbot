"""
Query Enhancement Service for Aiden RAG System.

This module provides advanced query processing including:
- Query analysis and intent detection
- Query rewriting and expansion
- Multi-query generation
- Hypothetical Document Embeddings (HyDE)
"""

from typing import List, Dict, Any, Optional, Tuple
import httpx
import json
import re
import spacy
from functools import lru_cache
import logging

from ..core.config import settings

logger = logging.getLogger(__name__)

# Load spaCy model for NLP
try:
    nlp = spacy.load("en_core_web_sm")
except:
    nlp = None
    logger.warning("SpaCy model not loaded, some features disabled")


# Query intent categories
INTENT_CATEGORIES = {
    "factual": ["what is", "what are", "who is", "when did", "where is", "how many", "how much"],
    "procedural": ["how to", "how do i", "how can i", "steps to", "guide to", "way to"],
    "comparative": ["difference between", "compare", "vs", "versus", "better", "best"],
    "troubleshooting": ["not working", "error", "problem", "issue", "fix", "solve", "why doesn't"],
    "definition": ["define", "meaning of", "what does", "explain"],
    "opinion": ["should i", "recommend", "suggest", "opinion", "think about"],
}


@lru_cache(maxsize=100)
def analyze_query(query: str) -> Dict[str, Any]:
    """
    Analyze query to understand intent, entities, and complexity.
    Results are cached for repeated queries.

    Returns:
        Dict with:
        - intent: Query intent category
        - entities: Extracted named entities
        - keywords: Key terms
        - complexity: simple/medium/complex
        - is_question: Boolean
        - requires_reasoning: Boolean
    """
    query_lower = query.lower().strip()

    # Detect intent
    intent = "general"
    for category, patterns in INTENT_CATEGORIES.items():
        if any(pattern in query_lower for pattern in patterns):
            intent = category
            break

    # Extract entities using spaCy
    entities = []
    keywords = []
    if nlp:
        doc = nlp(query)
        entities = [
            {"text": ent.text, "label": ent.label_}
            for ent in doc.ents
        ]
        # Extract noun chunks as keywords
        keywords = [chunk.text for chunk in doc.noun_chunks]

    # If no spaCy, fallback to simple keyword extraction
    if not keywords:
        # Remove stopwords and extract significant words
        stopwords = {"a", "an", "the", "is", "are", "was", "were", "be", "been",
                    "being", "have", "has", "had", "do", "does", "did", "will",
                    "would", "could", "should", "may", "might", "can", "to", "of",
                    "in", "for", "on", "with", "at", "by", "from", "as", "into",
                    "through", "during", "before", "after", "above", "below",
                    "between", "under", "again", "further", "then", "once", "i",
                    "me", "my", "myself", "we", "our", "you", "your", "he", "she",
                    "it", "they", "them", "what", "which", "who", "whom", "this",
                    "that", "these", "those", "am", "how", "why", "when", "where"}
        words = re.findall(r'\b[a-zA-Z]+\b', query_lower)
        keywords = [w for w in words if w not in stopwords and len(w) > 2]

    # Determine complexity
    word_count = len(query.split())
    has_multiple_questions = query.count("?") > 1
    has_conjunctions = any(c in query_lower for c in [" and ", " or ", " but ", " also "])

    if word_count > 20 or has_multiple_questions or (has_conjunctions and word_count > 10):
        complexity = "complex"
    elif word_count > 8 or has_conjunctions:
        complexity = "medium"
    else:
        complexity = "simple"

    # Check if it requires multi-hop reasoning
    requires_reasoning = (
        complexity == "complex" or
        intent == "comparative" or
        any(w in query_lower for w in ["because", "therefore", "reason", "why", "relationship"])
    )

    return {
        "intent": intent,
        "entities": entities,
        "keywords": keywords,
        "complexity": complexity,
        "is_question": "?" in query,
        "requires_reasoning": requires_reasoning,
        "word_count": word_count
    }


async def rewrite_query(query: str, context: Optional[str] = None) -> str:
    """
    Rewrite query for better retrieval using LLM.

    Improves retrieval by:
    - Expanding abbreviations
    - Adding domain context
    - Clarifying ambiguous terms
    """
    if not settings.DEEPSEEK_API_KEY:
        logger.warning("No API key, returning original query")
        return query

    prompt = f"""Rewrite this search query to improve document retrieval.
Make it clearer and more specific while preserving the original meaning.
Expand abbreviations and add relevant context terms.
Return ONLY the rewritten query, nothing else.

Original query: {query}
{f'Context: {context}' if context else ''}

Rewritten query:"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 100
                },
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                rewritten = data["choices"][0]["message"]["content"].strip()
                # Clean up any quotes or extra formatting
                rewritten = rewritten.strip('"\'')
                logger.debug(f"Query rewritten: '{query}' → '{rewritten}'")
                return rewritten

    except Exception as e:
        logger.error(f"Query rewrite failed: {e}")

    return query


async def generate_multi_queries(query: str, num_queries: int = 3) -> List[str]:
    """
    Generate multiple query variations for comprehensive retrieval.

    Different phrasings help find documents that might use different terminology.
    """
    queries = [query]  # Always include original

    if not settings.DEEPSEEK_API_KEY:
        return queries

    prompt = f"""Generate {num_queries} different phrasings of this search query.
Each should mean the same thing but use different words/structure.
Return only the queries, one per line.

Original: {query}

Variations:"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 200
                },
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                # Parse variations
                variations = [
                    line.strip().lstrip("0123456789.-) ")
                    for line in content.split("\n")
                    if line.strip() and len(line.strip()) > 5
                ]
                queries.extend(variations[:num_queries])
                logger.debug(f"Generated {len(variations)} query variations")

    except Exception as e:
        logger.error(f"Multi-query generation failed: {e}")

    return queries[:num_queries + 1]  # Original + variations


async def generate_hyde_document(query: str) -> Optional[str]:
    """
    Generate a Hypothetical Document Embedding (HyDE).

    HyDE creates a hypothetical answer to the query, which is then
    embedded and used to find similar real documents.
    This bridges the vocabulary gap between queries and documents.
    """
    if not settings.DEEPSEEK_API_KEY:
        return None

    prompt = f"""Write a short, factual paragraph that would answer this question.
Write as if you're an expert writing documentation.
Be specific and informative.

Question: {query}

Answer:"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5,
                    "max_tokens": 200
                },
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                hyde_doc = data["choices"][0]["message"]["content"].strip()
                logger.debug(f"Generated HyDE document: {hyde_doc[:100]}...")
                return hyde_doc

    except Exception as e:
        logger.error(f"HyDE generation failed: {e}")

    return None


def expand_query_with_synonyms(query: str) -> str:
    """
    Expand query with synonyms for broader matching.

    Simple rule-based expansion for common terms.
    """
    # Common synonym mappings (expandable)
    synonyms = {
        "fix": "(fix OR repair OR resolve OR solve)",
        "error": "(error OR bug OR issue OR problem)",
        "install": "(install OR setup OR configure)",
        "remove": "(remove OR delete OR uninstall)",
        "create": "(create OR make OR build OR generate)",
        "update": "(update OR modify OR change OR edit)",
        "show": "(show OR display OR view OR see)",
        "get": "(get OR retrieve OR fetch OR obtain)",
        "fast": "(fast OR quick OR rapid OR speedy)",
        "slow": "(slow OR sluggish OR delayed)",
    }

    expanded = query.lower()
    for term, expansion in synonyms.items():
        if term in expanded.split():
            expanded = expanded.replace(term, expansion)

    return expanded if expanded != query.lower() else query


async def enhance_query(
    query: str,
    use_rewrite: bool = True,
    use_multi_query: bool = False,
    use_hyde: bool = False,
    use_expansion: bool = True
) -> Dict[str, Any]:
    """
    Full query enhancement pipeline.

    Args:
        query: Original user query
        use_rewrite: Apply LLM-based rewriting
        use_multi_query: Generate query variations
        use_hyde: Generate hypothetical document
        use_expansion: Apply synonym expansion

    Returns:
        Dict with:
        - original: Original query
        - analysis: Query analysis results
        - rewritten: Rewritten query (if enabled)
        - variations: Query variations (if enabled)
        - hyde_document: Hypothetical document (if enabled)
        - expanded: Synonym-expanded query (if enabled)
        - enhanced_query: Best single query to use
    """
    result = {
        "original": query,
        "analysis": analyze_query(query),
        "rewritten": None,
        "variations": [query],
        "hyde_document": None,
        "expanded": None,
        "enhanced_query": query
    }

    # Apply enhancements based on query complexity
    complexity = result["analysis"]["complexity"]

    # Rewrite for clarity
    if use_rewrite:
        result["rewritten"] = await rewrite_query(query)
        result["enhanced_query"] = result["rewritten"]

    # Multi-query for complex queries
    if use_multi_query or complexity == "complex":
        result["variations"] = await generate_multi_queries(query)

    # HyDE for factual/definition queries
    if use_hyde or result["analysis"]["intent"] in ["factual", "definition"]:
        result["hyde_document"] = await generate_hyde_document(query)

    # Synonym expansion for simple keyword matching
    if use_expansion:
        result["expanded"] = expand_query_with_synonyms(query)

    return result


def decompose_complex_query(query: str) -> List[str]:
    """
    Decompose a complex query into sub-questions.

    For multi-hop reasoning queries, break into simpler parts.
    """
    # Simple heuristic decomposition
    sub_queries = []

    # Split on conjunctions
    parts = re.split(r'\s+(?:and|also|additionally|furthermore)\s+', query, flags=re.IGNORECASE)

    for part in parts:
        part = part.strip()
        if part and len(part) > 10:
            # Ensure it's a complete question
            if not part.endswith("?"):
                part = part + "?"
            sub_queries.append(part)

    # If no decomposition happened, return original
    if len(sub_queries) <= 1:
        return [query]

    return sub_queries


def extract_filters_from_query(query: str) -> Tuple[str, Dict[str, Any]]:
    """
    Extract metadata filters from natural language query.

    E.g., "documents from last month" → filter: {date: "last_month"}
    """
    filters = {}
    cleaned_query = query

    # Time-based filters
    time_patterns = {
        r'\b(last|past)\s+(week|month|year)\b': lambda m: {"time_range": m.group(0)},
        r'\bfrom\s+(\d{4})\b': lambda m: {"year": m.group(1)},
        r'\b(today|yesterday|this week)\b': lambda m: {"time_range": m.group(0)},
    }

    for pattern, extractor in time_patterns.items():
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            filters.update(extractor(match))
            cleaned_query = re.sub(pattern, "", cleaned_query, flags=re.IGNORECASE)

    # Document type filters
    type_patterns = {
        r'\b(pdf|document|doc|file)s?\b': {"doc_type": "document"},
        r'\b(email|mail)s?\b': {"doc_type": "email"},
        r'\b(presentation|slides?|ppt)\b': {"doc_type": "presentation"},
    }

    for pattern, filter_val in type_patterns.items():
        if re.search(pattern, query, re.IGNORECASE):
            filters.update(filter_val)

    # Clean up extra spaces
    cleaned_query = " ".join(cleaned_query.split())

    return cleaned_query, filters
