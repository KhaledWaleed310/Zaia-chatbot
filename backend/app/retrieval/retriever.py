"""
Main triple retriever orchestrating all retrieval methods.

This module provides the main TripleRetriever class that orchestrates vector,
MongoDB, and graph retrievers, running them in parallel and fusing their results.
"""

import asyncio
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from qdrant_client import QdrantClient
from neo4j import AsyncDriver
import structlog
from datetime import datetime

from .models import RetrievalResult, RetrieverConfig, FusionConfig
from .vector_retriever import VectorRetriever
from .mongo_retriever import MongoRetriever
from .graph_retriever import GraphRetriever
from .fusion import FusionEngine

logger = structlog.get_logger(__name__)


class TripleRetriever:
    """
    Orchestrates all three retrieval methods and fuses their results.

    This is the main retrieval class that should be used by the application.
    It runs vector, MongoDB, and graph retrievers in parallel and combines
    their results using the fusion engine.
    """

    def __init__(
        self,
        qdrant_client: QdrantClient,
        mongo_db: AsyncIOMotorDatabase,
        neo4j_driver: AsyncDriver,
        retriever_config: Optional[RetrieverConfig] = None,
        fusion_config: Optional[FusionConfig] = None,
        enable_vector: bool = True,
        enable_mongo: bool = True,
        enable_graph: bool = True,
    ):
        """
        Initialize the triple retriever.

        Args:
            qdrant_client: Qdrant client for vector search
            mongo_db: MongoDB database for full-text search
            neo4j_driver: Neo4j driver for graph search
            retriever_config: Configuration for individual retrievers
            fusion_config: Configuration for fusion engine
            enable_vector: Enable vector retriever
            enable_mongo: Enable MongoDB retriever
            enable_graph: Enable graph retriever
        """
        self.retriever_config = retriever_config or RetrieverConfig()
        self.fusion_config = fusion_config or FusionConfig()

        # Initialize retrievers
        self.vector_retriever = VectorRetriever(
            qdrant_client=qdrant_client,
            config=self.retriever_config,
        ) if enable_vector else None

        self.mongo_retriever = MongoRetriever(
            mongo_db=mongo_db,
            config=self.retriever_config,
        ) if enable_mongo else None

        self.graph_retriever = GraphRetriever(
            neo4j_driver=neo4j_driver,
            config=self.retriever_config,
        ) if enable_graph else None

        # Initialize fusion engine
        self.fusion_engine = FusionEngine(config=self.fusion_config)

        # Track enabled retrievers
        self.enabled_retrievers = {
            "vector": enable_vector,
            "mongo": enable_mongo,
            "graph": enable_graph,
        }

        logger.info(
            "TripleRetriever initialized",
            enabled_retrievers=self.enabled_retrievers,
            retriever_config=self.retriever_config.__dict__,
            fusion_config=self.fusion_config.__dict__,
        )

    async def _retrieve_with_timeout(
        self,
        retriever,
        retriever_name: str,
        tenant_id: str,
        query: str,
        kb_ids: Optional[List[str]],
        top_k: int,
    ) -> List[RetrievalResult]:
        """
        Run a retriever with timeout handling.

        Args:
            retriever: Retriever instance
            retriever_name: Name of the retriever (for logging)
            tenant_id: Tenant identifier
            query: Search query
            kb_ids: Knowledge base IDs
            top_k: Number of results

        Returns:
            List of results (empty on timeout or error)
        """
        try:
            # Run with timeout
            results = await asyncio.wait_for(
                retriever.retrieve(
                    tenant_id=tenant_id,
                    query=query,
                    kb_ids=kb_ids,
                    top_k=top_k,
                ),
                timeout=self.retriever_config.timeout_seconds,
            )

            logger.info(
                f"{retriever_name} retrieval successful",
                results_count=len(results),
            )

            return results

        except asyncio.TimeoutError:
            logger.warning(
                f"{retriever_name} retrieval timed out",
                timeout=self.retriever_config.timeout_seconds,
            )
            return []

        except Exception as e:
            logger.error(
                f"{retriever_name} retrieval failed",
                error=str(e),
                error_type=type(e).__name__,
            )
            return []

    async def retrieve(
        self,
        tenant_id: str,
        query: str,
        kb_ids: Optional[List[str]] = None,
        top_k: int = 5,
        enable_reranking: Optional[bool] = None,
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant documents using all enabled retrievers and fusion.

        This is the main retrieval method. It:
        1. Runs all enabled retrievers in parallel
        2. Fuses results using RRF
        3. Optionally applies cross-encoder reranking
        4. Returns top-k results

        Args:
            tenant_id: Tenant identifier for multi-tenancy
            query: Search query text
            kb_ids: Optional list of knowledge base IDs to search within
            top_k: Number of final results to return
            enable_reranking: Override fusion config for reranking

        Returns:
            List of top-k RetrievalResult objects

        Raises:
            ValueError: If no retrievers are enabled
        """
        start_time = datetime.utcnow()

        logger.info(
            "Triple retrieval started",
            tenant_id=tenant_id,
            query_length=len(query),
            kb_count=len(kb_ids) if kb_ids else 0,
            top_k=top_k,
        )

        # Check if at least one retriever is enabled
        if not any(self.enabled_retrievers.values()):
            raise ValueError("At least one retriever must be enabled")

        # Prepare retrieval tasks
        tasks = []
        retriever_names = []

        # Retrieve from all enabled retrievers in parallel
        if self.enabled_retrievers["vector"] and self.vector_retriever:
            tasks.append(
                self._retrieve_with_timeout(
                    self.vector_retriever,
                    "Vector",
                    tenant_id,
                    query,
                    kb_ids,
                    self.retriever_config.top_k,
                )
            )
            retriever_names.append("vector")

        if self.enabled_retrievers["mongo"] and self.mongo_retriever:
            tasks.append(
                self._retrieve_with_timeout(
                    self.mongo_retriever,
                    "MongoDB",
                    tenant_id,
                    query,
                    kb_ids,
                    self.retriever_config.top_k,
                )
            )
            retriever_names.append("mongo")

        if self.enabled_retrievers["graph"] and self.graph_retriever:
            tasks.append(
                self._retrieve_with_timeout(
                    self.graph_retriever,
                    "Graph",
                    tenant_id,
                    query,
                    kb_ids,
                    self.retriever_config.top_k,
                )
            )
            retriever_names.append("graph")

        # Run all retrievers in parallel
        logger.info(
            "Running retrievers in parallel",
            retrievers=retriever_names,
        )

        results_list = await asyncio.gather(*tasks)

        # Log individual retriever results
        for name, results in zip(retriever_names, results_list):
            logger.info(
                f"{name} retriever results",
                count=len(results),
                avg_score=sum(r.score for r in results) / len(results) if results else 0.0,
            )

        # Override fusion config if specified
        original_reranking = self.fusion_config.enable_cross_encoder
        if enable_reranking is not None:
            self.fusion_config.enable_cross_encoder = enable_reranking

        try:
            # Fuse and rerank results
            final_results = await self.fusion_engine.fuse_and_rerank(
                query=query,
                results_list=results_list,
                top_k=top_k,
            )
        finally:
            # Restore original config
            if enable_reranking is not None:
                self.fusion_config.enable_cross_encoder = original_reranking

        # Calculate retrieval time
        end_time = datetime.utcnow()
        retrieval_time = (end_time - start_time).total_seconds()

        # Get fusion stats
        fusion_stats = self.fusion_engine.get_fusion_stats(final_results)

        logger.info(
            "Triple retrieval completed",
            final_count=len(final_results),
            retrieval_time_seconds=retrieval_time,
            fusion_stats=fusion_stats,
        )

        return final_results

    async def retrieve_by_source(
        self,
        source: str,
        tenant_id: str,
        query: str,
        kb_ids: Optional[List[str]] = None,
        top_k: int = 10,
    ) -> List[RetrievalResult]:
        """
        Retrieve using a specific retriever only.

        Useful for debugging or comparing retrievers.

        Args:
            source: Retriever source ("vector", "mongo", or "graph")
            tenant_id: Tenant identifier
            query: Search query
            kb_ids: Knowledge base IDs
            top_k: Number of results

        Returns:
            List of results from the specified retriever

        Raises:
            ValueError: If source is invalid or retriever is not enabled
        """
        logger.info(
            "Single source retrieval started",
            source=source,
            tenant_id=tenant_id,
            query_length=len(query),
        )

        if source == "vector":
            if not self.enabled_retrievers["vector"] or not self.vector_retriever:
                raise ValueError("Vector retriever is not enabled")
            return await self.vector_retriever.retrieve(
                tenant_id, query, kb_ids, top_k
            )

        elif source == "mongo":
            if not self.enabled_retrievers["mongo"] or not self.mongo_retriever:
                raise ValueError("MongoDB retriever is not enabled")
            return await self.mongo_retriever.retrieve(
                tenant_id, query, kb_ids, top_k
            )

        elif source == "graph":
            if not self.enabled_retrievers["graph"] or not self.graph_retriever:
                raise ValueError("Graph retriever is not enabled")
            return await self.graph_retriever.retrieve(
                tenant_id, query, kb_ids, top_k
            )

        else:
            raise ValueError(
                f"Invalid source: {source}. Must be 'vector', 'mongo', or 'graph'"
            )

    async def health_check(self) -> Dict[str, bool]:
        """
        Check health of all enabled retrievers.

        Returns:
            Dictionary with health status for each retriever
        """
        health_status = {}

        # Check each enabled retriever
        if self.enabled_retrievers["vector"] and self.vector_retriever:
            health_status["vector"] = await self.vector_retriever.health_check()

        if self.enabled_retrievers["mongo"] and self.mongo_retriever:
            health_status["mongo"] = await self.mongo_retriever.health_check()

        if self.enabled_retrievers["graph"] and self.graph_retriever:
            health_status["graph"] = await self.graph_retriever.health_check()

        # Overall health
        health_status["overall"] = all(health_status.values())

        logger.info(
            "Health check completed",
            status=health_status,
        )

        return health_status

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the triple retriever configuration.

        Returns:
            Dictionary with configuration and status information
        """
        return {
            "enabled_retrievers": self.enabled_retrievers,
            "retriever_config": {
                "top_k": self.retriever_config.top_k,
                "min_score": self.retriever_config.min_score,
                "timeout_seconds": self.retriever_config.timeout_seconds,
            },
            "fusion_config": {
                "weights": self.fusion_config.weights,
                "rrf_k": self.fusion_config.rrf_k,
                "cross_encoder_enabled": self.fusion_config.enable_cross_encoder,
                "deduplication_threshold": self.fusion_config.deduplication_threshold,
            },
        }
