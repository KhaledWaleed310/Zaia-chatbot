from typing import List, Dict, Tuple
from collections import defaultdict
import asyncio
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from ..core.config import settings
from ..core.database import get_mongodb, get_qdrant, get_neo4j
from .embedding import generate_embedding


async def vector_search(query: str, tenant_id: str, bot_id: str, top_k: int = 10) -> List[Dict]:
    """Search Qdrant for similar vectors."""
    qdrant = get_qdrant()
    query_embedding = generate_embedding(query)

    results = qdrant.search(
        collection_name=settings.QDRANT_COLLECTION,
        query_vector=query_embedding,
        query_filter=Filter(
            must=[
                FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id)),
                FieldCondition(key="bot_id", match=MatchValue(value=bot_id))
            ]
        ),
        limit=top_k
    )

    return [
        {
            "id": str(hit.id),
            "content": hit.payload.get("content", ""),
            "score": hit.score,
            "source": "vector",
            "metadata": hit.payload
        }
        for hit in results
    ]


async def fulltext_search(query: str, tenant_id: str, bot_id: str, top_k: int = 10) -> List[Dict]:
    """Search MongoDB using full-text search."""
    db = get_mongodb()

    cursor = db.chunks.find(
        {
            "$text": {"$search": query},
            "tenant_id": tenant_id,
            "bot_id": bot_id
        },
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"})]).limit(top_k)

    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "content": doc.get("content", ""),
            "score": doc.get("score", 0),
            "source": "fulltext",
            "metadata": {
                "document_id": doc.get("document_id"),
                "chunk_index": doc.get("chunk_index")
            }
        })

    return results


async def graph_search(query: str, tenant_id: str, bot_id: str, top_k: int = 10) -> List[Dict]:
    """Search Neo4j knowledge graph for related entities and context."""
    neo4j_driver = get_neo4j()

    # Extract entities from query
    from .entity_extractor import extract_entities
    query_entities = extract_entities(query)
    entity_names = [e["text"].lower() for e in query_entities]

    if not entity_names:
        # If no entities found, search by keywords
        keywords = query.lower().split()[:5]  # Use first 5 words
        entity_names = keywords

    results = []

    async with neo4j_driver.session() as session:
        # Find entities and their related chunks
        cypher = """
        MATCH (e:Entity {tenant_id: $tenant_id, bot_id: $bot_id})
        WHERE toLower(e.name) IN $entity_names OR ANY(name IN $entity_names WHERE toLower(e.name) CONTAINS name)
        OPTIONAL MATCH (e)-[r:CO_OCCURS_WITH]-(related:Entity)
        WITH e, COLLECT(DISTINCT related.name) AS related_entities
        MATCH (e)-[:APPEARS_IN]->(c:Chunk)
        RETURN e.name AS entity, e.label AS entity_label,
               c.content AS content, c.chunk_id AS chunk_id,
               related_entities,
               SIZE(related_entities) AS relevance_score
        ORDER BY relevance_score DESC
        LIMIT $top_k
        """

        result = await session.run(
            cypher,
            tenant_id=tenant_id,
            bot_id=bot_id,
            entity_names=entity_names,
            top_k=top_k
        )

        async for record in result:
            results.append({
                "id": record["chunk_id"] or "",
                "content": record["content"] or "",
                "score": record["relevance_score"] / 10.0,  # Normalize score
                "source": "graph",
                "metadata": {
                    "entity": record["entity"],
                    "entity_label": record["entity_label"],
                    "related_entities": record["related_entities"]
                }
            })

    return results


def reciprocal_rank_fusion(
    results_list: List[List[Dict]],
    weights: List[float],
    k: int = 60
) -> List[Dict]:
    """
    Combine results from multiple sources using Reciprocal Rank Fusion.

    RRF score = sum(weight_i / (k + rank_i)) for each source

    Args:
        results_list: List of result lists from different sources
        weights: Weight for each source (should match results_list length)
        k: RRF constant (default 60)

    Returns:
        Fused and sorted results
    """
    scores = defaultdict(float)
    content_map = {}

    for source_idx, results in enumerate(results_list):
        weight = weights[source_idx] if source_idx < len(weights) else 1.0

        for rank, result in enumerate(results, 1):
            # Use content as key for deduplication
            content_key = result["content"][:200]  # Use first 200 chars as key

            # RRF scoring
            rrf_score = weight / (k + rank)
            scores[content_key] += rrf_score

            # Keep the result with highest individual score
            if content_key not in content_map or result["score"] > content_map[content_key]["score"]:
                content_map[content_key] = result

    # Sort by fused score
    sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    fused_results = []
    for key in sorted_keys:
        result = content_map[key].copy()
        result["fused_score"] = scores[key]
        fused_results.append(result)

    return fused_results


async def triple_retrieval(
    query: str,
    tenant_id: str,
    bot_id: str,
    top_k: int = 5
) -> List[Dict]:
    """
    Perform triple retrieval from all three databases and fuse results.
    """
    # Run all searches in parallel
    vector_results, fulltext_results, graph_results = await asyncio.gather(
        vector_search(query, tenant_id, bot_id, top_k=top_k * 2),
        fulltext_search(query, tenant_id, bot_id, top_k=top_k * 2),
        graph_search(query, tenant_id, bot_id, top_k=top_k * 2)
    )

    # Fuse results using RRF
    weights = [settings.VECTOR_WEIGHT, settings.MONGO_WEIGHT, settings.GRAPH_WEIGHT]
    fused = reciprocal_rank_fusion(
        [vector_results, fulltext_results, graph_results],
        weights
    )

    return fused[:top_k]
