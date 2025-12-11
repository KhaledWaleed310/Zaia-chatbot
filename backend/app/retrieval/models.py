"""
Data models for the retrieval system.

This module defines the core data structures used across all retrieval components.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from datetime import datetime


@dataclass
class RetrievalResult:
    """
    Represents a single retrieval result from any retriever.

    Attributes:
        text: The retrieved text content (document chunk)
        score: Relevance score (0.0 to 1.0, higher is better)
        source: Source identifier (vector, mongo, graph, fusion)
        metadata: Additional metadata including file source, page numbers, etc.
        chunk_id: Unique identifier for the chunk
        kb_id: Knowledge base identifier
        tenant_id: Tenant identifier for multi-tenancy
        relationships: Optional relationship information (for graph retrieval)
        rank: Ranking position (set during fusion)
        timestamp: When the result was retrieved
    """

    text: str
    score: float
    source: str
    metadata: Dict[str, Any]
    chunk_id: str
    kb_id: Optional[str] = None
    tenant_id: Optional[str] = None
    relationships: Optional[Dict[str, Any]] = None
    rank: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        """Validate and normalize the result after initialization."""
        # Ensure score is between 0 and 1
        self.score = max(0.0, min(1.0, self.score))

        # Ensure metadata is never None
        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert the result to a dictionary for JSON serialization."""
        return {
            "text": self.text,
            "score": self.score,
            "source": self.source,
            "metadata": self.metadata,
            "chunk_id": self.chunk_id,
            "kb_id": self.kb_id,
            "tenant_id": self.tenant_id,
            "relationships": self.relationships,
            "rank": self.rank,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

    def __hash__(self):
        """
        Make the result hashable for deduplication.
        Uses chunk_id as the primary identifier.
        """
        return hash(self.chunk_id)

    def __eq__(self, other):
        """
        Check equality based on chunk_id.
        Two results are considered equal if they refer to the same chunk.
        """
        if not isinstance(other, RetrievalResult):
            return False
        return self.chunk_id == other.chunk_id

    def get_text_hash(self) -> str:
        """
        Get a hash of the text content for fuzzy deduplication.
        Returns the first 100 characters of normalized text.
        """
        normalized = self.text.strip().lower()[:100]
        return normalized

    def merge_scores(self, other_score: float, weight: float = 0.5) -> None:
        """
        Merge another score into this result's score using weighted average.

        Args:
            other_score: The other score to merge
            weight: Weight for the other score (0.0 to 1.0)
        """
        self.score = (self.score * (1 - weight)) + (other_score * weight)
        self.score = max(0.0, min(1.0, self.score))  # Keep in valid range

    def add_source_info(self, source: str, score: float) -> None:
        """
        Add information about an additional source that retrieved this result.

        Args:
            source: The source identifier (e.g., "vector", "mongo", "graph")
            score: The score from that source
        """
        if "sources" not in self.metadata:
            self.metadata["sources"] = {}
        self.metadata["sources"][source] = score


@dataclass
class RetrieverConfig:
    """
    Configuration for a retriever.

    Attributes:
        top_k: Number of results to retrieve
        min_score: Minimum score threshold (0.0 to 1.0)
        enable_reranking: Whether to apply reranking
        timeout_seconds: Maximum time to wait for results
    """

    top_k: int = 10
    min_score: float = 0.0
    enable_reranking: bool = False
    timeout_seconds: float = 30.0

    def __post_init__(self):
        """Validate configuration values."""
        if self.top_k <= 0:
            raise ValueError("top_k must be positive")
        if not 0.0 <= self.min_score <= 1.0:
            raise ValueError("min_score must be between 0.0 and 1.0")
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")


@dataclass
class FusionConfig:
    """
    Configuration for the fusion engine.

    Attributes:
        weights: Weight for each retriever (must sum to 1.0)
        rrf_k: Constant for Reciprocal Rank Fusion
        enable_cross_encoder: Whether to use cross-encoder reranking
        deduplication_threshold: Text similarity threshold for deduplication (0.0 to 1.0)
    """

    weights: Dict[str, float] = field(default_factory=lambda: {
        "vector": 0.5,
        "mongo": 0.3,
        "graph": 0.2
    })
    rrf_k: int = 60
    enable_cross_encoder: bool = False
    deduplication_threshold: float = 0.95

    def __post_init__(self):
        """Validate configuration values."""
        total_weight = sum(self.weights.values())
        if not 0.99 <= total_weight <= 1.01:  # Allow small floating point error
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")

        if self.rrf_k <= 0:
            raise ValueError("rrf_k must be positive")

        if not 0.0 <= self.deduplication_threshold <= 1.0:
            raise ValueError("deduplication_threshold must be between 0.0 and 1.0")
