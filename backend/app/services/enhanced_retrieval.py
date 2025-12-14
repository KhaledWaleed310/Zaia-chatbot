"""
Enhanced Retrieval Pipeline for Aiden RAG System.

This is the world-class retrieval system that combines:
- Triple-database hybrid search (Qdrant + MongoDB + Neo4j)
- Query enhancement and rewriting
- Cross-encoder reranking
- Maximal Marginal Relevance (MMR) for diversity
- Contextual compression
- Multi-query retrieval

This is the main entry point for all retrieval operations.
"""

from typing import List, Dict, Any, Optional, Tuple
import asyncio
import logging

from .retrieval import (
    vector_search,
    fulltext_search,
    graph_search,
    reciprocal_rank_fusion
)
from .embedding import generate_embedding
from .reranker import (
    rerank_documents,
    maximal_marginal_relevance,
    hybrid_rerank_with_mmr
)
from .query_enhancer import (
    analyze_query,
    enhance_query,
    generate_hyde_document,
    decompose_complex_query
)
from .context_compressor import (
    compress_contexts,
    format_context_for_prompt,
    remove_redundant_context
)
from ..core.config import settings

logger = logging.getLogger(__name__)


async def enhanced_triple_retrieval(
    query: str,
    tenant_id: str,
    bot_id: str,
    top_k: int = 5,
    use_reranking: bool = True,
    use_query_enhancement: bool = True,
    use_mmr: bool = True,
    use_compression: bool = True,
    use_hyde: bool = False,
    use_multi_query: bool = False,
    verbose: bool = False
) -> Dict[str, Any]:
    """
    World-class enhanced retrieval pipeline.

    Pipeline stages:
    1. Query Analysis & Enhancement
    2. Parallel Triple-Database Search
    3. RRF Fusion
    4. Cross-Encoder Reranking
    5. MMR Diversity Selection
    6. Contextual Compression

    Args:
        query: User query
        tenant_id: Tenant ID for isolation
        bot_id: Chatbot ID
        top_k: Final number of contexts to return
        use_reranking: Enable cross-encoder reranking
        use_query_enhancement: Enable query rewriting
        use_mmr: Enable diversity selection
        use_compression: Enable context compression
        use_hyde: Enable hypothetical document embeddings
        use_multi_query: Enable multi-query retrieval
        verbose: Include detailed metadata in response

    Returns:
        Dict with:
        - contexts: Final compressed contexts
        - formatted_context: Ready-to-use prompt context
        - metadata: Pipeline execution details
    """
    metadata = {
        "original_query": query,
        "stages": [],
        "total_candidates": 0,
        "final_count": 0
    }

    try:
        # ==========================================
        # STAGE 1: Query Analysis & Enhancement
        # ==========================================
        enhanced = None
        search_queries = [query]

        if use_query_enhancement:
            enhanced = await enhance_query(
                query,
                use_rewrite=True,
                use_multi_query=use_multi_query,
                use_hyde=use_hyde
            )

            if enhanced["rewritten"] and enhanced["rewritten"] != query:
                search_queries = [enhanced["rewritten"]]
                metadata["rewritten_query"] = enhanced["rewritten"]

            if use_multi_query and enhanced["variations"]:
                search_queries = enhanced["variations"][:3]

            metadata["stages"].append({
                "name": "query_enhancement",
                "query_count": len(search_queries),
                "intent": enhanced["analysis"]["intent"],
                "complexity": enhanced["analysis"]["complexity"]
            })

        # ==========================================
        # STAGE 2: Parallel Triple-Database Search
        # ==========================================
        # Fetch more candidates for reranking (reduced from 4x to 2x for speed)
        fetch_k = top_k * 2 if use_reranking else top_k

        all_results = {
            "vector": [],
            "fulltext": [],
            "graph": []
        }

        # Search with all query variations
        for search_query in search_queries:
            # Run all searches in parallel
            vector_task = vector_search(search_query, tenant_id, bot_id, top_k=fetch_k)
            fulltext_task = fulltext_search(search_query, tenant_id, bot_id, top_k=fetch_k)
            graph_task = graph_search(search_query, tenant_id, bot_id, top_k=fetch_k)

            results = await asyncio.gather(
                vector_task, fulltext_task, graph_task,
                return_exceptions=True
            )

            # Collect results (handle exceptions gracefully)
            if not isinstance(results[0], Exception):
                all_results["vector"].extend(results[0])
            if not isinstance(results[1], Exception):
                all_results["fulltext"].extend(results[1])
            if not isinstance(results[2], Exception):
                all_results["graph"].extend(results[2])

        # HyDE search if enabled
        if use_hyde and enhanced and enhanced.get("hyde_document"):
            hyde_embedding = generate_embedding(enhanced["hyde_document"])
            # Search with hyde embedding directly in vector DB
            hyde_results = await vector_search(
                enhanced["hyde_document"], tenant_id, bot_id, top_k=fetch_k
            )
            all_results["vector"].extend(hyde_results)

        total_raw = sum(len(v) for v in all_results.values())
        metadata["stages"].append({
            "name": "triple_search",
            "vector_count": len(all_results["vector"]),
            "fulltext_count": len(all_results["fulltext"]),
            "graph_count": len(all_results["graph"]),
            "total_candidates": total_raw
        })
        metadata["total_candidates"] = total_raw

        # ==========================================
        # STAGE 3: RRF Fusion
        # ==========================================
        # Remove duplicates within each source first
        for source in all_results:
            seen_ids = set()
            unique = []
            for doc in all_results[source]:
                doc_id = doc.get("id", doc.get("content", "")[:50])
                if doc_id not in seen_ids:
                    seen_ids.add(doc_id)
                    unique.append(doc)
            all_results[source] = unique

        # Apply RRF fusion
        # Weights: vector search most important, then fulltext, then graph
        fused_results = reciprocal_rank_fusion(
            results_list=[all_results["vector"], all_results["fulltext"], all_results["graph"]],
            weights=[settings.VECTOR_WEIGHT, settings.MONGO_WEIGHT, settings.GRAPH_WEIGHT],
            k=60  # RRF constant
        )

        # Take top candidates for reranking
        rerank_candidates = fused_results[:fetch_k]

        metadata["stages"].append({
            "name": "rrf_fusion",
            "fused_count": len(fused_results),
            "top_candidates": len(rerank_candidates)
        })

        # ==========================================
        # STAGE 4: Cross-Encoder Reranking
        # ==========================================
        if use_reranking and len(rerank_candidates) > top_k:
            reranked = rerank_documents(
                query,
                rerank_candidates,
                top_k=top_k * 2  # Keep more for MMR
            )
            metadata["stages"].append({
                "name": "reranking",
                "input_count": len(rerank_candidates),
                "output_count": len(reranked)
            })
        else:
            reranked = rerank_candidates

        # ==========================================
        # STAGE 5: MMR Diversity Selection
        # ==========================================
        if use_mmr and len(reranked) > top_k:
            # Get embeddings for MMR
            query_embedding = generate_embedding(query)
            doc_embeddings = [
                generate_embedding(doc.get("content", "")[:500])
                for doc in reranked
            ]

            selected = maximal_marginal_relevance(
                query_embedding=query_embedding,
                documents=reranked,
                doc_embeddings=doc_embeddings,
                top_k=top_k,
                lambda_param=0.7
            )
            metadata["stages"].append({
                "name": "mmr_diversity",
                "input_count": len(reranked),
                "output_count": len(selected)
            })
        else:
            selected = reranked[:top_k]

        # ==========================================
        # STAGE 6: Contextual Compression
        # ==========================================
        if use_compression:
            compressed = await compress_contexts(
                query,
                selected,
                max_total_tokens=2000,
                use_llm=False,  # Use fast extraction
                remove_redundancy=True
            )
            metadata["stages"].append({
                "name": "compression",
                "input_count": len(selected),
                "output_count": len(compressed)
            })
        else:
            compressed = selected

        # ==========================================
        # STAGE 7: Format Output
        # ==========================================
        formatted_context = format_context_for_prompt(
            compressed,
            include_source=True,
            include_score=False
        )

        metadata["final_count"] = len(compressed)

        # Build final response
        result = {
            "contexts": compressed,
            "formatted_context": formatted_context,
            "query_analysis": enhanced["analysis"] if enhanced else analyze_query(query),
        }

        if verbose:
            result["metadata"] = metadata
            result["all_stages"] = metadata["stages"]

        return result

    except Exception as e:
        logger.error(f"Enhanced retrieval failed: {e}")
        # Fallback to basic retrieval
        from .retrieval import triple_retrieval
        basic_results = await triple_retrieval(query, tenant_id, bot_id, top_k=top_k)
        return {
            "contexts": basic_results,
            "formatted_context": format_context_for_prompt(basic_results),
            "query_analysis": analyze_query(query),
            "metadata": {"error": str(e), "fallback": True}
        }


async def adaptive_retrieval(
    query: str,
    tenant_id: str,
    bot_id: str,
    min_confidence: float = 0.5
) -> Dict[str, Any]:
    """
    Adaptive retrieval that adjusts strategy based on query complexity.

    - Simple queries: Fast path with minimal processing
    - Medium queries: Standard enhanced retrieval
    - Complex queries: Full pipeline with multi-query and HyDE
    """
    # Analyze query first
    analysis = analyze_query(query)
    complexity = analysis["complexity"]

    logger.info(f"Adaptive retrieval: complexity={complexity}, intent={analysis['intent']}")

    if complexity == "simple":
        # Fast path: minimal processing
        return await enhanced_triple_retrieval(
            query, tenant_id, bot_id,
            top_k=3,
            use_reranking=False,
            use_query_enhancement=False,
            use_mmr=False,
            use_compression=False
        )

    elif complexity == "medium":
        # Standard path
        return await enhanced_triple_retrieval(
            query, tenant_id, bot_id,
            top_k=5,
            use_reranking=True,
            use_query_enhancement=True,
            use_mmr=True,
            use_compression=True
        )

    else:  # complex
        # Full pipeline with all enhancements
        result = await enhanced_triple_retrieval(
            query, tenant_id, bot_id,
            top_k=7,
            use_reranking=True,
            use_query_enhancement=True,
            use_mmr=True,
            use_compression=True,
            use_hyde=True,
            use_multi_query=True,
            verbose=True
        )

        # Check if we got good results
        if result["contexts"]:
            top_score = max(
                c.get("reranker_score", c.get("fused_score", 0))
                for c in result["contexts"]
            )
            if top_score < min_confidence:
                # Low confidence - try decomposing query
                sub_queries = decompose_complex_query(query)
                if len(sub_queries) > 1:
                    # Retrieve for each sub-query and merge
                    all_contexts = []
                    for sq in sub_queries:
                        sub_result = await enhanced_triple_retrieval(
                            sq, tenant_id, bot_id,
                            top_k=3,
                            use_reranking=True,
                            use_query_enhancement=False
                        )
                        all_contexts.extend(sub_result["contexts"])

                    # Deduplicate and rerank merged results
                    unique_contexts = remove_redundant_context(all_contexts)
                    if unique_contexts:
                        reranked = rerank_documents(query, unique_contexts, top_k=7)
                        result["contexts"] = reranked
                        result["formatted_context"] = format_context_for_prompt(reranked)
                        result["metadata"]["decomposed"] = True

        return result


# Convenience function for backward compatibility
async def retrieve_context(
    query: str,
    tenant_id: str,
    bot_id: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Simple interface for context retrieval.

    Returns list of contexts (backward compatible with original triple_retrieval).
    """
    result = await enhanced_triple_retrieval(
        query, tenant_id, bot_id,
        top_k=top_k,
        use_reranking=True,
        use_query_enhancement=True,
        use_mmr=True,
        use_compression=True
    )
    return result["contexts"]
