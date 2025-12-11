"""
Triple retrieval system for ZAIA RAG Chatbot Platform.

This module implements a sophisticated retrieval system that combines three complementary
approaches for enhanced retrieval accuracy:

1. Vector Retrieval (Semantic Search): Uses Qdrant for similarity-based retrieval
2. MongoDB Full-Text Search: Uses BM25-like scoring for keyword matching
3. Graph Retrieval: Uses Neo4j for relationship-based retrieval

The fusion engine combines results from all three retrievers using Reciprocal Rank Fusion (RRF)
and optional cross-encoder reranking for optimal precision.
"""

from .models import RetrievalResult
from .vector_retriever import VectorRetriever
from .mongo_retriever import MongoRetriever
from .graph_retriever import GraphRetriever
from .fusion import FusionEngine
from .retriever import TripleRetriever

__all__ = [
    "RetrievalResult",
    "VectorRetriever",
    "MongoRetriever",
    "GraphRetriever",
    "FusionEngine",
    "TripleRetriever",
]
