"""
Neo4j graph store for knowledge graph relationships.

Handles storage of entities and their relationships as a knowledge graph.
"""

import logging
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class Neo4jStore:
    """
    Neo4j graph store for knowledge graph.

    Stores entities and their relationships as nodes and edges in a graph database.
    Enables relationship-based queries and graph traversals.
    """

    def __init__(
        self,
        uri: str = "bolt://localhost:7687",
        user: str = "neo4j",
        password: str = "password",
    ):
        """
        Initialize Neo4j store.

        Args:
            uri: Neo4j connection URI
            user: Username
            password: Password
        """
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None

    async def initialize(self):
        """Initialize Neo4j driver."""
        if self.driver is None:
            try:
                from neo4j import AsyncGraphDatabase

                logger.info(f"Connecting to Neo4j at {self.uri}")

                self.driver = AsyncGraphDatabase.driver(
                    self.uri,
                    auth=(self.user, self.password),
                )

                # Test connection
                async with self.driver.session() as session:
                    result = await session.run("RETURN 1")
                    await result.consume()

                logger.info("Neo4j connection initialized successfully")

                # Ensure indexes and constraints
                await self._ensure_schema()

            except ImportError:
                logger.error(
                    "neo4j not installed. Install with: pip install neo4j"
                )
                raise
            except Exception as e:
                logger.error(f"Failed to initialize Neo4j: {e}")
                raise

    async def close(self):
        """Close Neo4j connection."""
        if self.driver:
            try:
                await self.driver.close()
                logger.info("Neo4j connection closed")
            except Exception as e:
                logger.error(f"Error closing Neo4j connection: {e}")

    async def _ensure_schema(self):
        """Create indexes and constraints."""
        try:
            async with self.driver.session() as session:
                # Create constraint on Chunk ID
                await session.run(
                    "CREATE CONSTRAINT chunk_id IF NOT EXISTS "
                    "FOR (c:Chunk) REQUIRE c.id IS UNIQUE"
                )

                # Create constraint on Entity text + type
                await session.run(
                    "CREATE CONSTRAINT entity_unique IF NOT EXISTS "
                    "FOR (e:Entity) REQUIRE (e.text, e.type, e.tenant_id) IS UNIQUE"
                )

                # Create indexes for common queries
                await session.run(
                    "CREATE INDEX chunk_tenant_kb IF NOT EXISTS "
                    "FOR (c:Chunk) ON (c.tenant_id, c.kb_id)"
                )

                await session.run(
                    "CREATE INDEX entity_text IF NOT EXISTS "
                    "FOR (e:Entity) ON e.text"
                )

                logger.debug("Neo4j schema ensured")

        except Exception as e:
            logger.warning(f"Error ensuring Neo4j schema: {e}")

    async def upsert(
        self,
        tenant_id: str,
        kb_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: Optional[List[List[float]]] = None,
    ):
        """
        Upsert chunks and entities into Neo4j graph.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            chunks: List of chunk dictionaries
            embeddings: Optional embeddings (not stored in Neo4j)
        """
        if self.driver is None:
            await self.initialize()

        try:
            if not chunks:
                logger.warning("No chunks to upsert")
                return

            async with self.driver.session() as session:
                for chunk in chunks:
                    await self._upsert_chunk(session, tenant_id, kb_id, chunk)

            logger.info(f"Upserted {len(chunks)} chunks to Neo4j")

        except Exception as e:
            logger.error(f"Error upserting to Neo4j: {e}")
            raise

    async def _upsert_chunk(
        self,
        session,
        tenant_id: str,
        kb_id: str,
        chunk: Dict[str, Any],
    ):
        """
        Upsert a single chunk and its entities.

        Args:
            session: Neo4j session
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            chunk: Chunk dictionary
        """
        try:
            chunk_id = str(uuid.uuid4())
            metadata = chunk.get("metadata", {})
            entities = chunk.get("entities", [])

            # Create or merge chunk node
            chunk_query = """
            MERGE (c:Chunk {id: $chunk_id})
            SET c.tenant_id = $tenant_id,
                c.kb_id = $kb_id,
                c.text = $text,
                c.chunk_index = $chunk_index,
                c.token_count = $token_count,
                c.created_at = $created_at,
                c.source_file = $source_file,
                c.source_url = $source_url
            RETURN c
            """

            await session.run(
                chunk_query,
                chunk_id=chunk_id,
                tenant_id=tenant_id,
                kb_id=kb_id,
                text=chunk["text"][:1000],  # Limit text size in graph
                chunk_index=metadata.get("chunk_index", 0),
                token_count=metadata.get("token_count", 0),
                created_at=datetime.utcnow().isoformat(),
                source_file=metadata.get("source_file", ""),
                source_url=metadata.get("source_url", ""),
            )

            # Create entity nodes and relationships
            if entities:
                await self._upsert_entities(
                    session, tenant_id, kb_id, chunk_id, entities
                )

        except Exception as e:
            logger.error(f"Error upserting chunk to Neo4j: {e}")
            raise

    async def _upsert_entities(
        self,
        session,
        tenant_id: str,
        kb_id: str,
        chunk_id: str,
        entities: List[Dict[str, Any]],
    ):
        """
        Upsert entities and create relationships to chunk.

        Args:
            session: Neo4j session
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            chunk_id: Chunk identifier
            entities: List of entity dictionaries
        """
        try:
            for entity in entities:
                entity_text = entity.get("text", "")
                entity_type = entity.get("type", "UNKNOWN")

                # Create or merge entity node
                entity_query = """
                MERGE (e:Entity {text: $text, type: $type, tenant_id: $tenant_id})
                SET e.kb_id = $kb_id
                WITH e
                MATCH (c:Chunk {id: $chunk_id})
                MERGE (c)-[r:CONTAINS_ENTITY]->(e)
                SET r.created_at = $created_at
                """

                await session.run(
                    entity_query,
                    text=entity_text,
                    type=entity_type,
                    tenant_id=tenant_id,
                    kb_id=kb_id,
                    chunk_id=chunk_id,
                    created_at=datetime.utcnow().isoformat(),
                )

            # Create co-occurrence relationships between entities
            if len(entities) > 1:
                await self._create_cooccurrence_relationships(
                    session, tenant_id, entities
                )

        except Exception as e:
            logger.error(f"Error upserting entities: {e}")

    async def _create_cooccurrence_relationships(
        self,
        session,
        tenant_id: str,
        entities: List[Dict[str, Any]],
    ):
        """
        Create co-occurrence relationships between entities.

        Args:
            session: Neo4j session
            tenant_id: Tenant identifier
            entities: List of entities
        """
        try:
            # Create relationships between entities that co-occur
            for i, entity1 in enumerate(entities):
                for entity2 in entities[i + 1:]:
                    query = """
                    MATCH (e1:Entity {text: $text1, type: $type1, tenant_id: $tenant_id})
                    MATCH (e2:Entity {text: $text2, type: $type2, tenant_id: $tenant_id})
                    MERGE (e1)-[r:CO_OCCURS_WITH]-(e2)
                    ON CREATE SET r.count = 1
                    ON MATCH SET r.count = r.count + 1
                    """

                    await session.run(
                        query,
                        text1=entity1.get("text", ""),
                        type1=entity1.get("type", "UNKNOWN"),
                        text2=entity2.get("text", ""),
                        type2=entity2.get("type", "UNKNOWN"),
                        tenant_id=tenant_id,
                    )

        except Exception as e:
            logger.debug(f"Error creating co-occurrence relationships: {e}")

    async def find_related_entities(
        self,
        tenant_id: str,
        kb_id: str,
        entity_text: str,
        max_depth: int = 2,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Find entities related to a given entity.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            entity_text: Entity text to search from
            max_depth: Maximum relationship depth
            limit: Maximum number of results

        Returns:
            List of related entities with relationship info
        """
        if self.driver is None:
            await self.initialize()

        try:
            async with self.driver.session() as session:
                query = """
                MATCH path = (e1:Entity {text: $entity_text, tenant_id: $tenant_id})-[*1..$max_depth]-(e2:Entity)
                WHERE e1 <> e2 AND e2.tenant_id = $tenant_id
                RETURN DISTINCT e2.text AS text,
                       e2.type AS type,
                       length(path) AS distance,
                       [r in relationships(path) | type(r)] AS relationship_types
                ORDER BY distance, e2.text
                LIMIT $limit
                """

                result = await session.run(
                    query,
                    entity_text=entity_text,
                    tenant_id=tenant_id,
                    max_depth=max_depth,
                    limit=limit,
                )

                entities = []
                async for record in result:
                    entities.append({
                        "text": record["text"],
                        "type": record["type"],
                        "distance": record["distance"],
                        "relationship_types": record["relationship_types"],
                    })

                logger.info(f"Found {len(entities)} related entities")
                return entities

        except Exception as e:
            logger.error(f"Error finding related entities: {e}")
            return []

    async def get_entity_graph(
        self,
        tenant_id: str,
        kb_id: str,
        entity_types: Optional[List[str]] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """
        Get entity graph for visualization.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            entity_types: Filter by entity types
            limit: Maximum number of nodes

        Returns:
            Graph dictionary with nodes and edges
        """
        if self.driver is None:
            await self.initialize()

        try:
            async with self.driver.session() as session:
                # Build query based on filters
                type_filter = ""
                if entity_types:
                    type_list = ", ".join([f"'{t}'" for t in entity_types])
                    type_filter = f"AND e.type IN [{type_list}]"

                query = f"""
                MATCH (e:Entity {{tenant_id: $tenant_id, kb_id: $kb_id}})
                WHERE true {type_filter}
                WITH e LIMIT $limit
                OPTIONAL MATCH (e)-[r:CO_OCCURS_WITH]-(e2:Entity {{tenant_id: $tenant_id}})
                RETURN e.text AS source_text,
                       e.type AS source_type,
                       e2.text AS target_text,
                       e2.type AS target_type,
                       r.count AS weight
                """

                result = await session.run(
                    query,
                    tenant_id=tenant_id,
                    kb_id=kb_id,
                    limit=limit,
                )

                # Build nodes and edges
                nodes = {}
                edges = []

                async for record in result:
                    source_text = record["source_text"]
                    source_type = record["source_type"]

                    # Add source node
                    if source_text not in nodes:
                        nodes[source_text] = {
                            "id": source_text,
                            "label": source_text,
                            "type": source_type,
                        }

                    # Add target node and edge if exists
                    if record["target_text"]:
                        target_text = record["target_text"]
                        target_type = record["target_type"]

                        if target_text not in nodes:
                            nodes[target_text] = {
                                "id": target_text,
                                "label": target_text,
                                "type": target_type,
                            }

                        edges.append({
                            "source": source_text,
                            "target": target_text,
                            "weight": record["weight"] or 1,
                        })

                return {
                    "nodes": list(nodes.values()),
                    "edges": edges,
                }

        except Exception as e:
            logger.error(f"Error getting entity graph: {e}")
            return {"nodes": [], "edges": []}

    async def delete(self, tenant_id: str, kb_id: str):
        """
        Delete all data for a knowledge base.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
        """
        if self.driver is None:
            await self.initialize()

        try:
            async with self.driver.session() as session:
                # Delete all chunks and their relationships
                chunk_query = """
                MATCH (c:Chunk {tenant_id: $tenant_id, kb_id: $kb_id})
                DETACH DELETE c
                """

                result = await session.run(
                    chunk_query,
                    tenant_id=tenant_id,
                    kb_id=kb_id,
                )
                summary = await result.consume()

                logger.info(
                    f"Deleted {summary.counters.nodes_deleted} chunk nodes "
                    f"and {summary.counters.relationships_deleted} relationships"
                )

                # Delete orphaned entities (entities with no chunks)
                entity_query = """
                MATCH (e:Entity {tenant_id: $tenant_id, kb_id: $kb_id})
                WHERE NOT (e)<-[:CONTAINS_ENTITY]-(:Chunk)
                DETACH DELETE e
                """

                result = await session.run(
                    entity_query,
                    tenant_id=tenant_id,
                    kb_id=kb_id,
                )
                summary = await result.consume()

                logger.info(
                    f"Deleted {summary.counters.nodes_deleted} orphaned entity nodes"
                )

        except Exception as e:
            logger.error(f"Error deleting from Neo4j: {e}")
            raise

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
        if self.driver is None:
            await self.initialize()

        try:
            async with self.driver.session() as session:
                query = """
                MATCH (c:Chunk {tenant_id: $tenant_id, kb_id: $kb_id})
                OPTIONAL MATCH (c)-[:CONTAINS_ENTITY]->(e:Entity)
                RETURN count(DISTINCT c) AS chunk_count,
                       count(DISTINCT e) AS entity_count
                """

                result = await session.run(
                    query,
                    tenant_id=tenant_id,
                    kb_id=kb_id,
                )

                record = await result.single()

                return {
                    "chunk_count": record["chunk_count"],
                    "entity_count": record["entity_count"],
                }

        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {
                "chunk_count": 0,
                "entity_count": 0,
            }
