"""
Vector retriever using Qdrant for semantic search.

This module implements semantic search using dense vector embeddings stored in Qdrant.
It converts queries to vectors using sentence transformers and retrieves similar chunks.
"""

import asyncio
from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
    SearchParams,
)
from sentence_transformers import SentenceTransformer
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from .models import RetrievalResult, RetrieverConfig
from ..config import settings

logger = structlog.get_logger(__name__)


class VectorRetriever:
    """
    Retrieves documents using semantic vector search with Qdrant.

    This retriever converts the user query into a dense embedding vector and finds
    the most similar document chunks in the vector database using cosine similarity.
    """

    def __init__(
        self,
        qdrant_client: QdrantClient,
        collection_name: str = "knowledge_chunks",
        config: Optional[RetrieverConfig] = None,
    ):
        """
        Initialize the vector retriever.

        Args:
            qdrant_client: Qdrant client instance
            collection_name: Name of the Qdrant collection to search
            config: Retriever configuration
        """
        self.client = qdrant_client
        self.collection_name = collection_name
        self.config = config or RetrieverConfig()
        self.embedder: Optional[SentenceTransformer] = None
        logger.info(
            "VectorRetriever initialized",
            collection=collection_name,
            top_k=self.config.top_k,
        )

    def _get_embedder(self) -> SentenceTransformer:
        """
        Lazy load the sentence transformer model.

        Returns:
            SentenceTransformer instance
        """
        if self.embedder is None:
            logger.info(
                "Loading embedding model",
                model=settings.embedding_model,
            )
            self.embedder = SentenceTransformer(settings.embedding_model)
            logger.info("Embedding model loaded successfully")
        return self.embedder

    def _embed_query(self, query: str) -> List[float]:
        """
        Convert query text to embedding vector.

        Args:
            query: Query text

        Returns:
            Embedding vector as list of floats
        """
        try:
            embedder = self._get_embedder()
            # Run embedding in thread pool to avoid blocking
            embedding = embedder.encode(query, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(
                "Failed to embed query",
                error=str(e),
                query_length=len(query),
            )
            raise

    def _build_filter(
        self,
        tenant_id: str,
        kb_ids: Optional[List[str]] = None,
    ) -> Filter:
        """
        Build Qdrant filter for tenant and knowledge base filtering.

        Args:
            tenant_id: Tenant identifier
            kb_ids: Optional list of knowledge base IDs to filter by

        Returns:
            Qdrant Filter object
        """
        conditions = [
            FieldCondition(
                key="tenant_id",
                match=MatchValue(value=tenant_id),
            )
        ]

        if kb_ids:
            conditions.append(
                FieldCondition(
                    key="kb_id",
                    match=MatchAny(any=kb_ids),
                )
            )

        return Filter(must=conditions)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def retrieve(
        self,
        tenant_id: str,
        query: str,
        kb_ids: Optional[List[str]] = None,
        top_k: Optional[int] = None,
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant documents using vector similarity search.

        Args:
            tenant_id: Tenant identifier for multi-tenancy
            query: Search query text
            kb_ids: Optional list of knowledge base IDs to search within
            top_k: Number of results to return (overrides config)

        Returns:
            List of RetrievalResult objects sorted by relevance

        Raises:
            Exception: If embedding or search fails after retries
        """
        k = top_k if top_k is not None else self.config.top_k

        logger.info(
            "Vector retrieval started",
            tenant_id=tenant_id,
            query_length=len(query),
            kb_count=len(kb_ids) if kb_ids else 0,
            top_k=k,
        )

        try:
            # Embed query in thread pool (CPU-bound operation)
            loop = asyncio.get_event_loop()
            query_vector = await loop.run_in_executor(
                None,
                self._embed_query,
                query,
            )

            # Build filter
            search_filter = self._build_filter(tenant_id, kb_ids)

            # Search in Qdrant
            search_results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=search_filter,
                limit=k,
                with_payload=True,
                search_params=SearchParams(
                    hnsw_ef=128,  # Higher ef for better recall
                    exact=False,
                ),
            )

            # Convert to RetrievalResult objects
            results = []
            for idx, hit in enumerate(search_results):
                payload = hit.payload or {}

                # Filter by minimum score
                if hit.score < self.config.min_score:
                    logger.debug(
                        "Result filtered by min_score",
                        score=hit.score,
                        min_score=self.config.min_score,
                    )
                    continue

                result = RetrievalResult(
                    text=payload.get("text", ""),
                    score=float(hit.score),
                    source="vector",
                    metadata={
                        "source_file": payload.get("source_file"),
                        "source_url": payload.get("source_url"),
                        "page_number": payload.get("page_number"),
                        "section": payload.get("section"),
                        "chunk_index": payload.get("chunk_index", 0),
                        "token_count": payload.get("token_count", 0),
                        "entities": payload.get("entities", []),
                    },
                    chunk_id=str(hit.id),
                    kb_id=payload.get("kb_id"),
                    tenant_id=payload.get("tenant_id"),
                    rank=idx + 1,
                )
                results.append(result)

            logger.info(
                "Vector retrieval completed",
                results_count=len(results),
                filtered_count=len(search_results) - len(results),
            )

            return results

        except Exception as e:
            logger.error(
                "Vector retrieval failed",
                error=str(e),
                tenant_id=tenant_id,
                query_length=len(query),
            )
            raise

    async def health_check(self) -> bool:
        """
        Check if the vector retriever is healthy.

        Returns:
            True if healthy, False otherwise
        """
        try:
            # Check if collection exists
            collections = self.client.get_collections()
            collection_names = [c.name for c in collections.collections]

            if self.collection_name not in collection_names:
                logger.warning(
                    "Collection does not exist",
                    collection=self.collection_name,
                )
                return False

            # Check embedder
            self._get_embedder()

            return True

        except Exception as e:
            logger.error(
                "Vector retriever health check failed",
                error=str(e),
            )
            return False
