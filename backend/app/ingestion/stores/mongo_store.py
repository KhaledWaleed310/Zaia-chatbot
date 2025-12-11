"""
MongoDB store for full-text search and metadata storage.

Handles storage of document chunks with full-text search capabilities.
"""

import logging
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class MongoStore:
    """
    MongoDB store for document chunks and metadata.

    Provides full-text search, metadata storage, and document management.
    Supports multi-tenancy with tenant-based data isolation.
    """

    def __init__(
        self,
        uri: str = "mongodb://localhost:27017",
        database: str = "zaia_chatbot",
    ):
        """
        Initialize MongoDB store.

        Args:
            uri: MongoDB connection URI
            database: Database name
        """
        self.uri = uri
        self.database_name = database
        self.client = None
        self.db = None

    async def initialize(self):
        """Initialize MongoDB connection."""
        if self.client is None:
            try:
                from motor.motor_asyncio import AsyncIOMotorClient

                logger.info(f"Connecting to MongoDB at {self.uri}")

                self.client = AsyncIOMotorClient(self.uri)
                self.db = self.client[self.database_name]

                # Test connection
                await self.client.admin.command("ping")

                logger.info("MongoDB connection initialized successfully")

                # Ensure indexes
                await self._ensure_indexes()

            except ImportError:
                logger.error(
                    "motor not installed. Install with: pip install motor"
                )
                raise
            except Exception as e:
                logger.error(f"Failed to initialize MongoDB: {e}")
                raise

    async def close(self):
        """Close MongoDB connection."""
        if self.client:
            try:
                self.client.close()
                logger.info("MongoDB connection closed")
            except Exception as e:
                logger.error(f"Error closing MongoDB connection: {e}")

    def _get_collection_name(self, tenant_id: str, kb_id: str) -> str:
        """
        Get collection name for tenant and KB.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier

        Returns:
            Collection name
        """
        return f"chunks_{tenant_id}_{kb_id}"

    async def _ensure_indexes(self):
        """Create necessary indexes for performance."""
        try:
            # We'll create indexes per collection when needed
            # This is a placeholder for global indexes if needed
            pass
        except Exception as e:
            logger.error(f"Error ensuring indexes: {e}")

    async def _create_collection_indexes(self, collection_name: str):
        """
        Create indexes for a specific collection.

        Args:
            collection_name: Name of collection
        """
        try:
            collection = self.db[collection_name]

            # Text index for full-text search
            await collection.create_index([("text", "text")])

            # Compound indexes for common queries
            await collection.create_index([("tenant_id", 1), ("kb_id", 1)])
            await collection.create_index([("created_at", -1)])
            await collection.create_index([("metadata.chunk_index", 1)])

            # Index for entity searches
            await collection.create_index([("entities.text", 1)])

            logger.debug(f"Created indexes for collection: {collection_name}")

        except Exception as e:
            logger.warning(f"Error creating collection indexes: {e}")

    async def upsert(
        self,
        tenant_id: str,
        kb_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: Optional[List[List[float]]] = None,
    ):
        """
        Upsert chunks into MongoDB.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            chunks: List of chunk dictionaries
            embeddings: Optional embeddings (not stored in MongoDB by default)
        """
        if self.db is None:
            await self.initialize()

        try:
            if not chunks:
                logger.warning("No chunks to upsert")
                return

            collection_name = self._get_collection_name(tenant_id, kb_id)
            collection = self.db[collection_name]

            # Ensure indexes exist
            await self._create_collection_indexes(collection_name)

            # Prepare documents
            documents = []
            for i, chunk in enumerate(chunks):
                doc = {
                    "_id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "kb_id": kb_id,
                    "text": chunk["text"],
                    "metadata": chunk.get("metadata", {}),
                    "entities": chunk.get("entities", []),
                    "chunk_index": chunk.get("metadata", {}).get("chunk_index", i),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }

                # Add token count if available
                if "token_count" in chunk.get("metadata", {}):
                    doc["token_count"] = chunk["metadata"]["token_count"]

                documents.append(doc)

            # Insert in batches
            batch_size = 100
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                await collection.insert_many(batch, ordered=False)

            logger.info(
                f"Upserted {len(documents)} documents to collection {collection_name}"
            )

        except Exception as e:
            logger.error(f"Error upserting to MongoDB: {e}")
            raise

    async def search_text(
        self,
        tenant_id: str,
        kb_id: str,
        query: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Perform full-text search.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            query: Search query
            limit: Maximum number of results

        Returns:
            List of matching documents
        """
        if self.db is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)
            collection = self.db[collection_name]

            # Perform text search
            cursor = collection.find(
                {
                    "$text": {"$search": query},
                    "tenant_id": tenant_id,
                    "kb_id": kb_id,
                },
                {"score": {"$meta": "textScore"}}
            ).sort(
                [("score", {"$meta": "textScore"})]
            ).limit(limit)

            results = await cursor.to_list(length=limit)

            logger.info(f"Found {len(results)} results for text search")
            return results

        except Exception as e:
            logger.error(f"Error in text search: {e}")
            return []

    async def search_entities(
        self,
        tenant_id: str,
        kb_id: str,
        entity_text: str,
        entity_type: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Search for chunks containing specific entities.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            entity_text: Entity text to search for
            entity_type: Optional entity type filter
            limit: Maximum number of results

        Returns:
            List of matching documents
        """
        if self.db is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)
            collection = self.db[collection_name]

            # Build query
            query = {
                "tenant_id": tenant_id,
                "kb_id": kb_id,
                "entities": {
                    "$elemMatch": {
                        "text": {"$regex": entity_text, "$options": "i"}
                    }
                }
            }

            if entity_type:
                query["entities"]["$elemMatch"]["type"] = entity_type

            cursor = collection.find(query).limit(limit)
            results = await cursor.to_list(length=limit)

            logger.info(f"Found {len(results)} results for entity search")
            return results

        except Exception as e:
            logger.error(f"Error in entity search: {e}")
            return []

    async def get_by_metadata(
        self,
        tenant_id: str,
        kb_id: str,
        metadata_filters: Dict[str, Any],
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get chunks by metadata filters.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            metadata_filters: Dictionary of metadata field filters
            limit: Maximum number of results

        Returns:
            List of matching documents
        """
        if self.db is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)
            collection = self.db[collection_name]

            # Build query with metadata filters
            query = {
                "tenant_id": tenant_id,
                "kb_id": kb_id,
            }

            for key, value in metadata_filters.items():
                query[f"metadata.{key}"] = value

            cursor = collection.find(query).limit(limit)
            results = await cursor.to_list(length=limit)

            logger.info(f"Found {len(results)} results for metadata query")
            return results

        except Exception as e:
            logger.error(f"Error querying by metadata: {e}")
            return []

    async def get_stats(
        self,
        tenant_id: str,
        kb_id: str,
    ) -> Dict[str, Any]:
        """
        Get statistics for a knowledge base.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier

        Returns:
            Dictionary with statistics
        """
        if self.db is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)
            collection = self.db[collection_name]

            # Count total documents
            total_chunks = await collection.count_documents({
                "tenant_id": tenant_id,
                "kb_id": kb_id,
            })

            # Aggregate statistics
            pipeline = [
                {"$match": {"tenant_id": tenant_id, "kb_id": kb_id}},
                {
                    "$group": {
                        "_id": None,
                        "total_tokens": {"$sum": "$token_count"},
                        "total_entities": {"$sum": {"$size": "$entities"}},
                    }
                }
            ]

            result = await collection.aggregate(pipeline).to_list(length=1)

            stats = {
                "total_chunks": total_chunks,
                "total_tokens": result[0]["total_tokens"] if result else 0,
                "total_entities": result[0]["total_entities"] if result else 0,
            }

            return stats

        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {
                "total_chunks": 0,
                "total_tokens": 0,
                "total_entities": 0,
            }

    async def delete(self, tenant_id: str, kb_id: str):
        """
        Delete all data for a knowledge base.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
        """
        if self.db is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)
            collection = self.db[collection_name]

            # Delete all documents for this KB
            result = await collection.delete_many({
                "tenant_id": tenant_id,
                "kb_id": kb_id,
            })

            logger.info(
                f"Deleted {result.deleted_count} documents from collection {collection_name}"
            )

            # Drop collection if empty
            count = await collection.count_documents({})
            if count == 0:
                await collection.drop()
                logger.info(f"Dropped empty collection: {collection_name}")

        except Exception as e:
            logger.error(f"Error deleting from MongoDB: {e}")
            raise

    async def update_metadata(
        self,
        tenant_id: str,
        kb_id: str,
        chunk_id: str,
        metadata_updates: Dict[str, Any],
    ):
        """
        Update metadata for a specific chunk.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            chunk_id: Chunk document ID
            metadata_updates: Dictionary of metadata fields to update
        """
        if self.db is None:
            await self.initialize()

        try:
            collection_name = self._get_collection_name(tenant_id, kb_id)
            collection = self.db[collection_name]

            # Build update
            update = {
                "$set": {
                    f"metadata.{key}": value
                    for key, value in metadata_updates.items()
                }
            }
            update["$set"]["updated_at"] = datetime.utcnow()

            # Update document
            result = await collection.update_one(
                {"_id": chunk_id, "tenant_id": tenant_id, "kb_id": kb_id},
                update,
            )

            if result.modified_count > 0:
                logger.info(f"Updated metadata for chunk {chunk_id}")
            else:
                logger.warning(f"Chunk {chunk_id} not found or not modified")

        except Exception as e:
            logger.error(f"Error updating metadata: {e}")
            raise
