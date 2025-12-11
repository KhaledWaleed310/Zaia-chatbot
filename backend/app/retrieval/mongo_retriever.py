"""
MongoDB retriever using full-text search.

This module implements keyword-based retrieval using MongoDB's full-text search
with BM25-like scoring. It complements vector search by finding exact keyword matches.
"""

from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from .models import RetrievalResult, RetrieverConfig

logger = structlog.get_logger(__name__)


class MongoRetriever:
    """
    Retrieves documents using MongoDB full-text search.

    This retriever uses MongoDB's text search capabilities with textScore-based ranking,
    providing a BM25-like scoring mechanism for keyword-based retrieval.
    """

    def __init__(
        self,
        mongo_db: AsyncIOMotorDatabase,
        collection_name: str = "knowledge_chunks",
        config: Optional[RetrieverConfig] = None,
    ):
        """
        Initialize the MongoDB retriever.

        Args:
            mongo_db: MongoDB database instance
            collection_name: Name of the collection to search
            config: Retriever configuration
        """
        self.db = mongo_db
        self.collection_name = collection_name
        self.collection = mongo_db[collection_name]
        self.config = config or RetrieverConfig()
        logger.info(
            "MongoRetriever initialized",
            collection=collection_name,
            top_k=self.config.top_k,
        )

    async def _ensure_text_index(self) -> None:
        """
        Ensure that a text index exists on the text field.

        Creates a text index if it doesn't exist. This is idempotent.
        """
        try:
            # Check if text index exists
            indexes = await self.collection.list_indexes().to_list(length=None)
            has_text_index = any(
                idx.get("key", {}).get("_fts") == "text"
                for idx in indexes
            )

            if not has_text_index:
                logger.info("Creating text index on 'text' field")
                await self.collection.create_index(
                    [("text", "text")],
                    name="text_search_idx",
                    default_language="english",
                    weights={"text": 10},
                )
                logger.info("Text index created successfully")

        except Exception as e:
            logger.warning(
                "Failed to ensure text index",
                error=str(e),
            )

    def _build_query(
        self,
        query: str,
        tenant_id: str,
        kb_ids: Optional[List[str]] = None,
    ) -> dict:
        """
        Build MongoDB query with text search and filters.

        Args:
            query: Search query text
            tenant_id: Tenant identifier
            kb_ids: Optional list of knowledge base IDs

        Returns:
            MongoDB query dict
        """
        mongo_query = {
            "$text": {"$search": query},
            "tenant_id": tenant_id,
        }

        if kb_ids:
            mongo_query["kb_id"] = {"$in": kb_ids}

        return mongo_query

    def _normalize_score(self, text_score: float, text_length: int) -> float:
        """
        Normalize MongoDB text score to 0-1 range.

        MongoDB's textScore can vary widely based on document length and term frequency.
        This normalizes it to a comparable 0-1 range.

        Args:
            text_score: Raw MongoDB textScore
            text_length: Length of the text in characters

        Returns:
            Normalized score between 0 and 1
        """
        # Adjust for document length (longer docs tend to have higher scores)
        length_factor = min(1.0, 1000.0 / max(text_length, 100))
        adjusted_score = text_score * length_factor

        # Apply log normalization to compress the range
        import math
        normalized = math.log(adjusted_score + 1) / math.log(10)

        # Clamp to 0-1 range
        return max(0.0, min(1.0, normalized))

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
        Retrieve relevant documents using MongoDB full-text search.

        Args:
            tenant_id: Tenant identifier for multi-tenancy
            query: Search query text
            kb_ids: Optional list of knowledge base IDs to search within
            top_k: Number of results to return (overrides config)

        Returns:
            List of RetrievalResult objects sorted by text score

        Raises:
            Exception: If search fails after retries
        """
        k = top_k if top_k is not None else self.config.top_k

        logger.info(
            "MongoDB retrieval started",
            tenant_id=tenant_id,
            query_length=len(query),
            kb_count=len(kb_ids) if kb_ids else 0,
            top_k=k,
        )

        try:
            # Ensure text index exists
            await self._ensure_text_index()

            # Build query
            mongo_query = self._build_query(query, tenant_id, kb_ids)

            # Projection to include textScore
            projection = {
                "text": 1,
                "metadata": 1,
                "kb_id": 1,
                "tenant_id": 1,
                "chunk_id": 1,
                "entities": 1,
                "token_count": 1,
                "score": {"$meta": "textScore"},
            }

            # Execute search with textScore sorting
            cursor = self.collection.find(
                mongo_query,
                projection,
            ).sort([("score", {"$meta": "textScore"})]).limit(k)

            # Convert results
            results = []
            idx = 0
            async for doc in cursor:
                text_score = doc.get("score", 0.0)
                text = doc.get("text", "")

                # Normalize score
                normalized_score = self._normalize_score(
                    text_score,
                    len(text),
                )

                # Filter by minimum score
                if normalized_score < self.config.min_score:
                    logger.debug(
                        "Result filtered by min_score",
                        score=normalized_score,
                        min_score=self.config.min_score,
                    )
                    continue

                # Extract metadata
                metadata = doc.get("metadata", {})
                if not isinstance(metadata, dict):
                    metadata = {}

                result = RetrievalResult(
                    text=text,
                    score=normalized_score,
                    source="mongo",
                    metadata={
                        "source_file": metadata.get("source_file"),
                        "source_url": metadata.get("source_url"),
                        "page_number": metadata.get("page_number"),
                        "section": metadata.get("section"),
                        "chunk_index": metadata.get("chunk_index", 0),
                        "token_count": doc.get("token_count", 0),
                        "entities": doc.get("entities", []),
                        "raw_text_score": text_score,
                    },
                    chunk_id=doc.get("chunk_id", str(doc.get("_id"))),
                    kb_id=doc.get("kb_id"),
                    tenant_id=doc.get("tenant_id"),
                    rank=idx + 1,
                )
                results.append(result)
                idx += 1

            logger.info(
                "MongoDB retrieval completed",
                results_count=len(results),
            )

            return results

        except Exception as e:
            logger.error(
                "MongoDB retrieval failed",
                error=str(e),
                tenant_id=tenant_id,
                query_length=len(query),
            )
            raise

    async def health_check(self) -> bool:
        """
        Check if the MongoDB retriever is healthy.

        Returns:
            True if healthy, False otherwise
        """
        try:
            # Test connection
            await self.db.command("ping")

            # Check if collection exists
            collections = await self.db.list_collection_names()
            if self.collection_name not in collections:
                logger.warning(
                    "Collection does not exist",
                    collection=self.collection_name,
                )
                return False

            # Check for text index
            indexes = await self.collection.list_indexes().to_list(length=None)
            has_text_index = any(
                idx.get("key", {}).get("_fts") == "text"
                for idx in indexes
            )

            if not has_text_index:
                logger.warning(
                    "Text index does not exist",
                    collection=self.collection_name,
                )
                # Try to create it
                await self._ensure_text_index()

            return True

        except Exception as e:
            logger.error(
                "MongoDB retriever health check failed",
                error=str(e),
            )
            return False
