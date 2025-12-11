"""
Qdrant vector store for semantic similarity search.

Handles storage and retrieval of document embeddings for vector similarity search.
"""

import logging
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class QdrantStore:
    """
    Vector store implementation using Qdrant.

    Manages storage and retrieval of document embeddings for semantic search.
    Supports multi-tenancy with tenant-based collection isolation.
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6333,
        api_key: Optional[str] = None,
        prefer_grpc: bool = False,
    ):
        """
        Initialize Qdrant store.

        Args:
            host: Qdrant host
            port: Qdrant port
            api_key: API key for authentication
            prefer_grpc: Use gRPC instead of HTTP
        """
        self.host = host
        self.port = port
        self.api_key = api_key
        self.prefer_grpc = prefer_grpc
        self.client = None

    async def initialize(self):
        """Initialize Qdrant client."""
        if self.client is None:
            try:
                from qdrant_client import QdrantClient
                from qdrant_client.models import Distance, VectorParams

                logger.info(f"Connecting to Qdrant at {self.host}:{self.port}")

                # Create client in thread pool
                self.client = await asyncio.to_thread(
                    QdrantClient,
                    host=self.host,
                    port=self.port,
                    api_key=self.api_key,
                    prefer_grpc=self.prefer_grpc,
                )

                # Store model references for later use
                self.Distance = Distance
                self.VectorParams = VectorParams

                logger.info("Qdrant client initialized successfully")

            except ImportError:
                logger.error(
                    "qdrant-client not installed. Install with: pip install qdrant-client"
                )
                raise
            except Exception as e:
                logger.error(f"Failed to initialize Qdrant client: {e}")
                raise

    async def close(self):
        """Close Qdrant connection."""
        if self.client:
            try:
                await asyncio.to_thread(self.client.close)
                logger.info("Qdrant connection closed")
            except Exception as e:
                logger.error(f"Error closing Qdrant connection: {e}")

    def _get_collection_name(self, tenant_id: str, kb_id: str) -> str:
        """
        Get collection name for tenant and KB.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier

        Returns:
            Collection name
        """
        # Use tenant_id and kb_id to create unique collection
        return f"zaia_{tenant_id}_{kb_id}"

    async def _ensure_collection(
        self,
        collection_name: str,
        vector_size: int = 384,
    ):
        """
        Ensure collection exists, create if not.

        Args:
            collection_name: Name of collection
            vector_size: Dimension of vectors
        """
        try:
            # Check if collection exists
            exists = await asyncio.to_thread(
                self.client.collection_exists,
                collection_name=collection_name,
            )

            if not exists:
                logger.info(f"Creating Qdrant collection: {collection_name}")

                # Create collection
                await asyncio.to_thread(
                    self.client.create_collection,
                    collection_name=collection_name,
                    vectors_config=self.VectorParams(
                        size=vector_size,
                        distance=self.Distance.COSINE,
                    ),
                )

                logger.info(f"Collection created: {collection_name}")

        except Exception as e:
            logger.error(f"Error ensuring collection: {e}")
            raise

    async def upsert(
        self,
        tenant_id: str,
        kb_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: Optional[List[List[float]]] = None,
    ):
        """
        Upsert chunks and embeddings into Qdrant.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            chunks: List of chunk dictionaries
            embeddings: List of embedding vectors (if None, chunks should have 'embedding' field)

        Raises:
            ValueError: If no embeddings provided
        """
        if self.client is None:
            await self.initialize()

        try:
            if not chunks:
                logger.warning("No chunks to upsert")
                return

            collection_name = self._get_collection_name(tenant_id, kb_id)

            # Determine vector size from first embedding
            if embeddings:
                vector_size = len(embeddings[0])
            elif chunks[0].get("embedding"):
                vector_size = len(chunks[0]["embedding"])
            else:
                raise ValueError("No embeddings provided")

            # Ensure collection exists
            await self._ensure_collection(collection_name, vector_size)

            # Prepare points for Qdrant
            from qdrant_client.models import PointStruct

            points = []
            for i, chunk in enumerate(chunks):
                # Get embedding
                if embeddings:
                    vector = embeddings[i]
                else:
                    vector = chunk.get("embedding")
                    if not vector:
                        logger.warning(f"Chunk {i} has no embedding, skipping")
                        continue

                # Generate unique ID
                point_id = str(uuid.uuid4())

                # Prepare payload
                payload = {
                    "tenant_id": tenant_id,
                    "kb_id": kb_id,
                    "text": chunk["text"],
                    "metadata": chunk.get("metadata", {}),
                    "entities": chunk.get("entities", []),
                    "chunk_index": chunk.get("metadata", {}).get("chunk_index", i),
                    "created_at": datetime.utcnow().isoformat(),
                }

                # Create point
                point = PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload,
                )
                points.append(point)

            if not points:
                logger.warning("No valid points to upsert")
                return

            # Upsert in batches for better performance
            batch_size = 100
            for i in range(0, len(points), batch_size):
                batch = points[i:i + batch_size]
                await asyncio.to_thread(
                    self.client.upsert,
                    collection_name=collection_name,
                    points=batch,
                )

            logger.info(
                f"Upserted {len(points)} points to collection {collection_name}"
            )

        except Exception as e:
            logger.error(f"Error upserting to Qdrant: {e}")
            raise

    async def search(
        self,
        tenant_id: str,
        kb_id: str,
        query_vector: List[float],
        limit: int = 10,
        score_threshold: Optional[float] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            query_vector: Query embedding vector
            limit: Maximum number of results
            score_threshold: Minimum similarity score
            filters: Additional filters for search

        Returns:
            List of matching results with scores
        """
        if self.client is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)

            # Check if collection exists
            exists = await asyncio.to_thread(
                self.client.collection_exists,
                collection_name=collection_name,
            )

            if not exists:
                logger.warning(f"Collection {collection_name} does not exist")
                return []

            # Prepare query filter
            from qdrant_client.models import Filter, FieldCondition, MatchValue

            query_filter = None
            if filters:
                conditions = []
                for key, value in filters.items():
                    conditions.append(
                        FieldCondition(
                            key=key,
                            match=MatchValue(value=value),
                        )
                    )
                if conditions:
                    query_filter = Filter(must=conditions)

            # Perform search
            search_result = await asyncio.to_thread(
                self.client.search,
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
                query_filter=query_filter,
            )

            # Format results
            results = []
            for hit in search_result:
                results.append({
                    "id": hit.id,
                    "score": hit.score,
                    "text": hit.payload.get("text"),
                    "metadata": hit.payload.get("metadata", {}),
                    "entities": hit.payload.get("entities", []),
                })

            logger.info(f"Found {len(results)} results for query")
            return results

        except Exception as e:
            logger.error(f"Error searching Qdrant: {e}")
            raise

    async def delete(self, tenant_id: str, kb_id: str):
        """
        Delete all data for a knowledge base.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
        """
        if self.client is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)

            # Check if collection exists
            exists = await asyncio.to_thread(
                self.client.collection_exists,
                collection_name=collection_name,
            )

            if exists:
                # Delete collection
                await asyncio.to_thread(
                    self.client.delete_collection,
                    collection_name=collection_name,
                )
                logger.info(f"Deleted collection: {collection_name}")
            else:
                logger.warning(f"Collection {collection_name} does not exist")

        except Exception as e:
            logger.error(f"Error deleting from Qdrant: {e}")
            raise

    async def get_collection_info(self, tenant_id: str, kb_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a collection.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier

        Returns:
            Collection info or None if doesn't exist
        """
        if self.client is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)

            exists = await asyncio.to_thread(
                self.client.collection_exists,
                collection_name=collection_name,
            )

            if not exists:
                return None

            info = await asyncio.to_thread(
                self.client.get_collection,
                collection_name=collection_name,
            )

            return {
                "name": collection_name,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status,
            }

        except Exception as e:
            logger.error(f"Error getting collection info: {e}")
            return None
