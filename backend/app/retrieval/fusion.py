"""
Fusion engine for combining retrieval results.

This module implements Reciprocal Rank Fusion (RRF) and optional cross-encoder reranking
to combine results from multiple retrievers into a single ranked list.
"""

import asyncio
from typing import List, Dict, Set, Optional
from collections import defaultdict
import hashlib
import structlog

from .models import RetrievalResult, FusionConfig

logger = structlog.get_logger(__name__)


class FusionEngine:
    """
    Combines and reranks results from multiple retrievers.

    This engine uses Reciprocal Rank Fusion (RRF) to merge results from different
    retrieval sources, with optional cross-encoder reranking for improved precision.
    """

    def __init__(self, config: Optional[FusionConfig] = None):
        """
        Initialize the fusion engine.

        Args:
            config: Fusion configuration with weights and parameters
        """
        self.config = config or FusionConfig()
        self.cross_encoder = None  # Lazy loaded if needed
        logger.info(
            "FusionEngine initialized",
            weights=self.config.weights,
            rrf_k=self.config.rrf_k,
            cross_encoder_enabled=self.config.enable_cross_encoder,
        )

    def _get_text_hash(self, text: str) -> str:
        """
        Get a hash of text content for deduplication.

        Args:
            text: Text to hash

        Returns:
            Hash string
        """
        # Normalize text: lowercase, strip whitespace
        normalized = " ".join(text.lower().split())
        # Take first 200 chars for fuzzy matching
        normalized = normalized[:200]
        return hashlib.md5(normalized.encode()).hexdigest()

    def _deduplicate_results(
        self,
        results: List[RetrievalResult],
    ) -> List[RetrievalResult]:
        """
        Remove duplicate results based on chunk_id and text similarity.

        Args:
            results: List of results to deduplicate

        Returns:
            Deduplicated list of results
        """
        seen_chunks: Set[str] = set()
        seen_text_hashes: Set[str] = set()
        deduplicated = []

        for result in results:
            # Check chunk_id first (exact match)
            if result.chunk_id in seen_chunks:
                logger.debug(
                    "Duplicate chunk_id found",
                    chunk_id=result.chunk_id,
                )
                continue

            # Check text hash for fuzzy deduplication
            text_hash = self._get_text_hash(result.text)
            if text_hash in seen_text_hashes:
                logger.debug(
                    "Duplicate text hash found",
                    chunk_id=result.chunk_id,
                )
                continue

            seen_chunks.add(result.chunk_id)
            seen_text_hashes.add(text_hash)
            deduplicated.append(result)

        if len(deduplicated) < len(results):
            logger.info(
                "Results deduplicated",
                original_count=len(results),
                deduplicated_count=len(deduplicated),
                duplicates_removed=len(results) - len(deduplicated),
            )

        return deduplicated

    def reciprocal_rank_fusion(
        self,
        results_list: List[List[RetrievalResult]],
        k: Optional[int] = None,
    ) -> List[RetrievalResult]:
        """
        Combine multiple result lists using Reciprocal Rank Fusion (RRF).

        RRF Formula: score(d) = sum over all sources of 1 / (k + rank(d, source))

        Args:
            results_list: List of result lists from different retrievers
            k: RRF constant (default from config)

        Returns:
            Fused and sorted list of results
        """
        k_param = k if k is not None else self.config.rrf_k

        logger.info(
            "Starting RRF fusion",
            num_sources=len(results_list),
            k=k_param,
        )

        # Map chunk_id to result and RRF scores
        chunk_map: Dict[str, RetrievalResult] = {}
        rrf_scores: Dict[str, float] = defaultdict(float)
        source_ranks: Dict[str, Dict[str, int]] = defaultdict(dict)

        # Calculate RRF scores
        for source_idx, results in enumerate(results_list):
            if not results:
                continue

            source_name = results[0].source if results else f"source_{source_idx}"
            source_weight = self.config.weights.get(source_name, 1.0 / len(results_list))

            for rank, result in enumerate(results, start=1):
                chunk_id = result.chunk_id

                # Store the result (prefer earlier sources)
                if chunk_id not in chunk_map:
                    chunk_map[chunk_id] = result

                # Calculate RRF score with source weight
                rrf_score = source_weight / (k_param + rank)
                rrf_scores[chunk_id] += rrf_score

                # Track source and rank
                source_ranks[chunk_id][source_name] = rank

                logger.debug(
                    "RRF score calculated",
                    chunk_id=chunk_id,
                    source=source_name,
                    rank=rank,
                    rrf_score=rrf_score,
                    cumulative_score=rrf_scores[chunk_id],
                )

        # Create fused results with RRF scores
        fused_results = []
        for chunk_id, result in chunk_map.items():
            # Update result with fused score
            result.score = rrf_scores[chunk_id]
            result.source = "fusion"

            # Add source information to metadata
            result.metadata["source_ranks"] = source_ranks[chunk_id]
            result.metadata["rrf_score"] = rrf_scores[chunk_id]

            fused_results.append(result)

        # Sort by RRF score
        fused_results.sort(key=lambda x: x.score, reverse=True)

        # Update ranks
        for rank, result in enumerate(fused_results, start=1):
            result.rank = rank

        logger.info(
            "RRF fusion completed",
            fused_count=len(fused_results),
        )

        return fused_results

    def _load_cross_encoder(self):
        """
        Lazy load the cross-encoder model for reranking.

        Returns:
            Cross-encoder model
        """
        if self.cross_encoder is None:
            try:
                from sentence_transformers import CrossEncoder

                logger.info("Loading cross-encoder model for reranking")
                self.cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
                logger.info("Cross-encoder model loaded successfully")
            except ImportError:
                logger.error(
                    "sentence-transformers not installed, cannot use cross-encoder"
                )
                raise
            except Exception as e:
                logger.error(
                    "Failed to load cross-encoder model",
                    error=str(e),
                )
                raise

        return self.cross_encoder

    async def _rerank_with_cross_encoder(
        self,
        query: str,
        results: List[RetrievalResult],
        top_k: int,
    ) -> List[RetrievalResult]:
        """
        Rerank results using a cross-encoder model.

        Args:
            query: Original search query
            results: Results to rerank
            top_k: Number of top results to return

        Returns:
            Reranked results
        """
        if not results:
            return results

        try:
            # Load cross-encoder model
            cross_encoder = self._load_cross_encoder()

            # Prepare query-document pairs
            pairs = [(query, result.text) for result in results]

            # Get cross-encoder scores (CPU-intensive, run in thread pool)
            loop = asyncio.get_event_loop()
            ce_scores = await loop.run_in_executor(
                None,
                cross_encoder.predict,
                pairs,
            )

            # Update scores (blend with RRF score)
            for result, ce_score in zip(results, ce_scores):
                # Normalize cross-encoder score to 0-1
                normalized_ce = 1 / (1 + abs(ce_score))  # Sigmoid-like normalization

                # Blend with RRF score (60% cross-encoder, 40% RRF)
                result.metadata["rrf_score"] = result.score
                result.metadata["cross_encoder_score"] = float(ce_score)
                result.score = (normalized_ce * 0.6) + (result.score * 0.4)

            # Sort by blended score
            results.sort(key=lambda x: x.score, reverse=True)

            # Update ranks
            for rank, result in enumerate(results[:top_k], start=1):
                result.rank = rank

            logger.info(
                "Cross-encoder reranking completed",
                results_count=len(results),
                top_k=top_k,
            )

            return results[:top_k]

        except Exception as e:
            logger.error(
                "Cross-encoder reranking failed",
                error=str(e),
            )
            # Fall back to non-reranked results
            return results[:top_k]

    async def fuse_and_rerank(
        self,
        query: str,
        results_list: List[List[RetrievalResult]],
        top_k: int = 5,
    ) -> List[RetrievalResult]:
        """
        Fuse multiple result lists and optionally rerank with cross-encoder.

        This is the main entry point for the fusion engine. It:
        1. Applies Reciprocal Rank Fusion to combine results
        2. Deduplicates results
        3. Optionally reranks with cross-encoder
        4. Returns top-k results

        Args:
            query: Original search query
            results_list: List of result lists from different retrievers
            top_k: Number of final results to return

        Returns:
            Fused, deduplicated, and potentially reranked results
        """
        logger.info(
            "Starting fusion and reranking",
            num_sources=len(results_list),
            top_k=top_k,
            cross_encoder_enabled=self.config.enable_cross_encoder,
        )

        # Step 1: Apply RRF
        fused_results = self.reciprocal_rank_fusion(results_list)

        # Step 2: Deduplicate
        fused_results = self._deduplicate_results(fused_results)

        # Step 3: Apply cross-encoder reranking if enabled
        if self.config.enable_cross_encoder and fused_results:
            fused_results = await self._rerank_with_cross_encoder(
                query,
                fused_results,
                top_k,
            )
        else:
            # Just take top-k
            fused_results = fused_results[:top_k]

        # Final rank update
        for rank, result in enumerate(fused_results, start=1):
            result.rank = rank

        logger.info(
            "Fusion and reranking completed",
            final_count=len(fused_results),
        )

        return fused_results

    def get_fusion_stats(
        self,
        results: List[RetrievalResult],
    ) -> Dict[str, any]:
        """
        Get statistics about the fusion results.

        Args:
            results: Fused results

        Returns:
            Dictionary with fusion statistics
        """
        stats = {
            "total_results": len(results),
            "sources": defaultdict(int),
            "avg_score": 0.0,
            "score_distribution": {
                "high": 0,  # score >= 0.7
                "medium": 0,  # 0.4 <= score < 0.7
                "low": 0,  # score < 0.4
            },
        }

        if not results:
            return stats

        total_score = 0.0
        for result in results:
            # Count source contributions
            if "source_ranks" in result.metadata:
                for source in result.metadata["source_ranks"].keys():
                    stats["sources"][source] += 1

            # Accumulate score
            total_score += result.score

            # Score distribution
            if result.score >= 0.7:
                stats["score_distribution"]["high"] += 1
            elif result.score >= 0.4:
                stats["score_distribution"]["medium"] += 1
            else:
                stats["score_distribution"]["low"] += 1

        stats["avg_score"] = total_score / len(results)

        return dict(stats)
