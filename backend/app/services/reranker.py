"""
Cross-Encoder Reranking Service for Aiden RAG System.

This module provides sophisticated reranking of retrieved documents using
cross-encoder models for significantly improved relevance scoring.
"""

from typing import List, Dict, Any, Optional
from sentence_transformers import CrossEncoder
import numpy as np
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

# Cross-encoder model for reranking
# Options:
# - "cross-encoder/ms-marco-MiniLM-L-6-v2" (fast, good quality)
# - "BAAI/bge-reranker-large" (slower, best quality)
# - "BAAI/bge-reranker-base" (balanced)
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

_reranker_model = None


def get_reranker() -> CrossEncoder:
    """Get or initialize the cross-encoder reranker model."""
    global _reranker_model
    if _reranker_model is None:
        logger.info(f"Loading cross-encoder reranker: {RERANKER_MODEL}")
        _reranker_model = CrossEncoder(RERANKER_MODEL)
        logger.info("Cross-encoder reranker loaded successfully")
    return _reranker_model


def rerank_documents(
    query: str,
    documents: List[Dict[str, Any]],
    top_k: int = 10,
    score_threshold: float = 0.0
) -> List[Dict[str, Any]]:
    """
    Rerank documents using cross-encoder model.

    Cross-encoders jointly encode (query, document) pairs for more accurate
    relevance scoring compared to bi-encoders which encode separately.

    Args:
        query: The user's query
        documents: List of documents with 'content' field
        top_k: Number of top documents to return
        score_threshold: Minimum reranker score to include

    Returns:
        Reranked documents sorted by cross-encoder score
    """
    if not documents:
        return []

    try:
        reranker = get_reranker()

        # Prepare query-document pairs for cross-encoder
        pairs = [(query, doc.get("content", "")[:1000]) for doc in documents]

        # Get cross-encoder scores
        scores = reranker.predict(pairs)

        # Add reranker scores to documents
        for i, doc in enumerate(documents):
            doc["reranker_score"] = float(scores[i])
            # Keep original score for reference
            doc["original_score"] = doc.get("fused_score", doc.get("score", 0))

        # Filter by threshold and sort by reranker score
        reranked = [
            doc for doc in documents
            if doc["reranker_score"] >= score_threshold
        ]
        reranked.sort(key=lambda x: x["reranker_score"], reverse=True)

        logger.debug(f"Reranked {len(documents)} docs, returning top {top_k}")

        return reranked[:top_k]

    except Exception as e:
        logger.error(f"Reranking failed: {e}, returning original order")
        return documents[:top_k]


def maximal_marginal_relevance(
    query_embedding: List[float],
    documents: List[Dict[str, Any]],
    doc_embeddings: List[List[float]],
    top_k: int = 5,
    lambda_param: float = 0.7
) -> List[Dict[str, Any]]:
    """
    Select documents using Maximal Marginal Relevance (MMR).

    MMR balances relevance to the query with diversity among selected documents.
    This prevents returning near-duplicate chunks.

    Formula: MMR = λ * Sim(doc, query) - (1-λ) * max(Sim(doc, selected_docs))

    Args:
        query_embedding: Query vector
        documents: List of candidate documents
        doc_embeddings: Embeddings for each document
        top_k: Number of documents to select
        lambda_param: Balance between relevance (1.0) and diversity (0.0)

    Returns:
        Selected documents with diversity
    """
    if not documents or len(documents) <= top_k:
        return documents

    try:
        query_embedding = np.array(query_embedding)
        doc_embeddings = np.array(doc_embeddings)

        # Normalize embeddings for cosine similarity
        query_norm = query_embedding / np.linalg.norm(query_embedding)
        doc_norms = doc_embeddings / np.linalg.norm(doc_embeddings, axis=1, keepdims=True)

        # Query-document similarities
        query_similarities = np.dot(doc_norms, query_norm)

        # Document-document similarities
        doc_similarities = np.dot(doc_norms, doc_norms.T)

        selected_indices = []
        remaining_indices = list(range(len(documents)))

        for _ in range(min(top_k, len(documents))):
            if not remaining_indices:
                break

            mmr_scores = []
            for idx in remaining_indices:
                relevance = query_similarities[idx]

                if selected_indices:
                    # Max similarity to already selected docs
                    redundancy = max(doc_similarities[idx][sel_idx]
                                   for sel_idx in selected_indices)
                else:
                    redundancy = 0

                mmr = lambda_param * relevance - (1 - lambda_param) * redundancy
                mmr_scores.append((idx, mmr))

            # Select document with highest MMR score
            best_idx = max(mmr_scores, key=lambda x: x[1])[0]
            selected_indices.append(best_idx)
            remaining_indices.remove(best_idx)

        # Return selected documents in order
        selected_docs = [documents[i] for i in selected_indices]

        # Add MMR info
        for i, doc in enumerate(selected_docs):
            doc["mmr_rank"] = i + 1
            doc["mmr_selected"] = True

        logger.debug(f"MMR selected {len(selected_docs)} diverse documents")

        return selected_docs

    except Exception as e:
        logger.error(f"MMR selection failed: {e}, returning top documents")
        return documents[:top_k]


def hybrid_rerank_with_mmr(
    query: str,
    query_embedding: List[float],
    documents: List[Dict[str, Any]],
    doc_embeddings: List[List[float]],
    rerank_top_k: int = 15,
    final_top_k: int = 5,
    lambda_param: float = 0.7,
    use_reranker: bool = True
) -> List[Dict[str, Any]]:
    """
    Combined reranking pipeline: Cross-encoder → MMR.

    1. Cross-encoder reranks for relevance
    2. MMR selects diverse subset

    Args:
        query: User query text
        query_embedding: Query vector
        documents: Retrieved documents
        doc_embeddings: Document embeddings
        rerank_top_k: Documents to keep after cross-encoder
        final_top_k: Final documents after MMR
        lambda_param: MMR relevance vs diversity balance
        use_reranker: Whether to use cross-encoder (can disable for speed)

    Returns:
        Final selected documents
    """
    if not documents:
        return []

    # Step 1: Cross-encoder reranking (if enabled)
    if use_reranker and len(documents) > rerank_top_k:
        reranked = rerank_documents(query, documents, top_k=rerank_top_k)
        # Get corresponding embeddings for reranked docs
        doc_id_to_embedding = {
            doc.get("id", i): emb
            for i, (doc, emb) in enumerate(zip(documents, doc_embeddings))
        }
        reranked_embeddings = [
            doc_id_to_embedding.get(doc.get("id"), doc_embeddings[0])
            for doc in reranked
        ]
    else:
        reranked = documents[:rerank_top_k]
        reranked_embeddings = doc_embeddings[:rerank_top_k]

    # Step 2: MMR for diversity
    if len(reranked) > final_top_k:
        final_docs = maximal_marginal_relevance(
            query_embedding=query_embedding,
            documents=reranked,
            doc_embeddings=reranked_embeddings,
            top_k=final_top_k,
            lambda_param=lambda_param
        )
    else:
        final_docs = reranked

    return final_docs


# Batch reranking for efficiency
def batch_rerank(
    queries: List[str],
    document_lists: List[List[Dict[str, Any]]],
    top_k: int = 5
) -> List[List[Dict[str, Any]]]:
    """
    Batch rerank multiple query-document sets.

    More efficient than individual reranking for multiple queries.
    """
    if not queries or not document_lists:
        return []

    results = []
    for query, docs in zip(queries, document_lists):
        reranked = rerank_documents(query, docs, top_k=top_k)
        results.append(reranked)

    return results
