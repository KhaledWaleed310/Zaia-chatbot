"""
Graph retriever using Neo4j for relationship-based retrieval.

This module implements graph-based retrieval using Neo4j. It extracts entities from
the query using spaCy and traverses the knowledge graph to find related documents.
"""

from typing import List, Optional, Set, Dict, Any
from neo4j import AsyncGraphDatabase, AsyncDriver
import spacy
from spacy.language import Language
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from .models import RetrievalResult, RetrieverConfig

logger = structlog.get_logger(__name__)


class GraphRetriever:
    """
    Retrieves documents using Neo4j graph traversal.

    This retriever extracts entities from the query, finds them in the knowledge graph,
    and traverses relationships to discover relevant document chunks. It provides
    context-aware retrieval based on the semantic relationships between entities.
    """

    def __init__(
        self,
        neo4j_driver: AsyncDriver,
        config: Optional[RetrieverConfig] = None,
    ):
        """
        Initialize the graph retriever.

        Args:
            neo4j_driver: Neo4j async driver instance
            config: Retriever configuration
        """
        self.driver = neo4j_driver
        self.config = config or RetrieverConfig()
        self.nlp: Optional[Language] = None
        logger.info(
            "GraphRetriever initialized",
            top_k=self.config.top_k,
        )

    def _get_nlp(self) -> Language:
        """
        Lazy load spaCy NLP model.

        Returns:
            spaCy Language instance
        """
        if self.nlp is None:
            try:
                logger.info("Loading spaCy model for entity extraction")
                # Try to load the model, use small English model
                try:
                    self.nlp = spacy.load("en_core_web_sm")
                except OSError:
                    logger.warning(
                        "en_core_web_sm not found, downloading..."
                    )
                    import subprocess
                    subprocess.run(
                        ["python", "-m", "spacy", "download", "en_core_web_sm"],
                        check=True,
                    )
                    self.nlp = spacy.load("en_core_web_sm")
                logger.info("spaCy model loaded successfully")
            except Exception as e:
                logger.error(
                    "Failed to load spaCy model",
                    error=str(e),
                )
                raise
        return self.nlp

    def _extract_entities(self, query: str) -> List[str]:
        """
        Extract named entities from the query using spaCy.

        Args:
            query: Query text

        Returns:
            List of entity names (normalized)
        """
        try:
            nlp = self._get_nlp()
            doc = nlp(query)

            # Extract named entities
            entities = []
            for ent in doc.ents:
                # Normalize entity text
                normalized = ent.text.lower().strip()
                if len(normalized) > 2:  # Filter very short entities
                    entities.append(normalized)

            # Also extract noun chunks as potential entities
            for chunk in doc.noun_chunks:
                normalized = chunk.text.lower().strip()
                if len(normalized) > 2 and normalized not in entities:
                    entities.append(normalized)

            logger.debug(
                "Entities extracted from query",
                query_length=len(query),
                entities_count=len(entities),
                entities=entities[:5],  # Log first 5
            )

            return entities

        except Exception as e:
            logger.error(
                "Failed to extract entities",
                error=str(e),
                query_length=len(query),
            )
            # Return empty list on failure, don't crash
            return []

    def _build_cypher_query(
        self,
        entities: List[str],
        tenant_id: str,
        kb_ids: Optional[List[str]] = None,
        max_hops: int = 2,
    ) -> tuple[str, Dict[str, Any]]:
        """
        Build Cypher query for graph traversal.

        Args:
            entities: List of entities to search for
            tenant_id: Tenant identifier
            kb_ids: Optional list of knowledge base IDs
            max_hops: Maximum number of hops in graph traversal

        Returns:
            Tuple of (cypher_query, parameters)
        """
        # Build filters
        kb_filter = ""
        if kb_ids:
            kb_filter = "AND c.kb_id IN $kb_ids"

        # Cypher query for 1-2 hop traversal
        # 1. Find entities matching query entities
        # 2. Traverse to related entities
        # 3. Find chunks connected to those entities
        cypher = f"""
        // Find entities matching query
        MATCH (e:Entity)
        WHERE toLower(e.name) IN $entities
          AND e.tenant_id = $tenant_id

        // Traverse to related entities (1-2 hops)
        MATCH path = (e)-[r*1..{max_hops}]-(related:Entity)
        WHERE related.tenant_id = $tenant_id

        // Find chunks connected to these entities
        MATCH (related)-[:MENTIONED_IN]->(c:Chunk)
        WHERE c.tenant_id = $tenant_id {kb_filter}

        // Calculate relevance score based on:
        // - Path length (shorter is better)
        // - Number of matching entities in chunk
        // - Relationship types
        WITH c, e, related, r,
             length(path) as path_length,
             size((e)-[:MENTIONED_IN]->(c)) as direct_mentions

        // Aggregate scores per chunk
        WITH c,
             collect(DISTINCT e.name) as matched_entities,
             collect(DISTINCT related.name) as related_entities,
             collect(DISTINCT [rel in r | type(rel)]) as relationship_types,
             min(path_length) as min_path_length,
             sum(direct_mentions) as total_direct_mentions

        // Calculate final score
        WITH c,
             matched_entities,
             related_entities,
             relationship_types,
             (1.0 / (min_path_length + 1)) * 0.5 +  // Path length component
             (size(matched_entities) * 0.3) +        // Matched entities component
             (total_direct_mentions * 0.2)           // Direct mentions component
             as score

        // Return results sorted by score
        RETURN c.chunk_id as chunk_id,
               c.text as text,
               c.kb_id as kb_id,
               c.metadata as metadata,
               c.entities as entities,
               matched_entities,
               related_entities,
               relationship_types,
               score
        ORDER BY score DESC
        LIMIT $limit
        """

        parameters = {
            "entities": entities,
            "tenant_id": tenant_id,
            "limit": self.config.top_k * 2,  # Fetch more for better filtering
        }

        if kb_ids:
            parameters["kb_ids"] = kb_ids

        return cypher, parameters

    def _normalize_score(self, raw_score: float) -> float:
        """
        Normalize graph score to 0-1 range.

        Args:
            raw_score: Raw score from Cypher query

        Returns:
            Normalized score between 0 and 1
        """
        # The raw score is already designed to be roughly 0-1
        # Just clamp it to be safe
        return max(0.0, min(1.0, raw_score))

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
        Retrieve relevant documents using graph traversal.

        Args:
            tenant_id: Tenant identifier for multi-tenancy
            query: Search query text
            kb_ids: Optional list of knowledge base IDs to search within
            top_k: Number of results to return (overrides config)

        Returns:
            List of RetrievalResult objects sorted by relevance

        Raises:
            Exception: If entity extraction or graph query fails after retries
        """
        k = top_k if top_k is not None else self.config.top_k

        logger.info(
            "Graph retrieval started",
            tenant_id=tenant_id,
            query_length=len(query),
            kb_count=len(kb_ids) if kb_ids else 0,
            top_k=k,
        )

        try:
            # Extract entities from query
            entities = self._extract_entities(query)

            if not entities:
                logger.warning(
                    "No entities extracted from query",
                    query=query,
                )
                return []

            # Build Cypher query
            cypher, parameters = self._build_cypher_query(
                entities,
                tenant_id,
                kb_ids,
            )

            # Execute graph query
            results = []
            async with self.driver.session() as session:
                result = await session.run(cypher, parameters)
                records = await result.data()

                # Process results
                seen_chunks: Set[str] = set()
                for idx, record in enumerate(records):
                    chunk_id = record.get("chunk_id")

                    # Skip if we've already seen this chunk
                    if chunk_id in seen_chunks:
                        continue
                    seen_chunks.add(chunk_id)

                    # Get raw score and normalize
                    raw_score = record.get("score", 0.0)
                    normalized_score = self._normalize_score(raw_score)

                    # Filter by minimum score
                    if normalized_score < self.config.min_score:
                        logger.debug(
                            "Result filtered by min_score",
                            score=normalized_score,
                            min_score=self.config.min_score,
                        )
                        continue

                    # Extract metadata
                    metadata = record.get("metadata", {})
                    if not isinstance(metadata, dict):
                        metadata = {}

                    # Build relationship metadata
                    relationships = {
                        "matched_entities": record.get("matched_entities", []),
                        "related_entities": record.get("related_entities", []),
                        "relationship_types": record.get("relationship_types", []),
                        "raw_score": raw_score,
                    }

                    result_obj = RetrievalResult(
                        text=record.get("text", ""),
                        score=normalized_score,
                        source="graph",
                        metadata={
                            "source_file": metadata.get("source_file"),
                            "source_url": metadata.get("source_url"),
                            "page_number": metadata.get("page_number"),
                            "section": metadata.get("section"),
                            "chunk_index": metadata.get("chunk_index", 0),
                            "entities": record.get("entities", []),
                        },
                        chunk_id=chunk_id,
                        kb_id=record.get("kb_id"),
                        tenant_id=tenant_id,
                        relationships=relationships,
                        rank=idx + 1,
                    )
                    results.append(result_obj)

                    # Stop if we have enough results
                    if len(results) >= k:
                        break

            logger.info(
                "Graph retrieval completed",
                results_count=len(results),
                entities_extracted=len(entities),
            )

            return results

        except Exception as e:
            logger.error(
                "Graph retrieval failed",
                error=str(e),
                tenant_id=tenant_id,
                query_length=len(query),
            )
            # Return empty list on failure for graceful degradation
            return []

    async def health_check(self) -> bool:
        """
        Check if the graph retriever is healthy.

        Returns:
            True if healthy, False otherwise
        """
        try:
            # Test Neo4j connection
            async with self.driver.session() as session:
                result = await session.run("RETURN 1 as num")
                record = await result.single()
                if record["num"] != 1:
                    return False

            # Test spaCy model
            self._get_nlp()

            return True

        except Exception as e:
            logger.error(
                "Graph retriever health check failed",
                error=str(e),
            )
            return False
