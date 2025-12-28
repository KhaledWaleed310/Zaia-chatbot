"""
Base classes and data types for the AIDEN learning system.

This module defines the core data structures used throughout the learning pipeline.
"""

from typing import Dict, Any, List, Optional, Literal
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid


class InteractionType(str, Enum):
    """Classification of interaction outcomes."""
    SUCCESS = "success"
    FAILURE = "failure"
    NEUTRAL = "neutral"
    HANDOFF = "handoff"
    CONVERSION = "conversion"


class PatternType(str, Enum):
    """Types of learned patterns."""
    RESPONSE_STRATEGY = "response_strategy"
    USER_BEHAVIOR = "user_behavior"
    TOPIC_HANDLING = "topic_handling"
    OBJECTION_HANDLING = "objection_handling"
    CONVERSATION_FLOW = "conversation_flow"


class KnowledgeLevel(str, Enum):
    """Hierarchy of knowledge abstraction."""
    FACT = "fact"           # Specific information
    PATTERN = "pattern"     # Repeated behaviors
    STRATEGY = "strategy"   # Response approaches
    PRINCIPLE = "principle" # Universal rules


class KnowledgeScope(str, Enum):
    """Scope of knowledge applicability."""
    BOT_SPECIFIC = "bot_specific"
    TENANT_LEVEL = "tenant_level"
    GLOBAL = "global"


@dataclass
class LearningConfig:
    """Configuration for the learning system."""

    # Crystallization settings
    crystallization_frequency: str = "daily"  # "realtime", "hourly", "daily", "weekly"
    min_quality_threshold: float = 0.7
    min_evidence_count: int = 3

    # Prompt evolution settings
    enable_shadow_testing: bool = True
    max_variants_per_bot: int = 5
    promotion_threshold: float = 0.1  # 10% improvement required

    # Experience replay settings
    replay_sample_size: int = 100
    landmark_retention_days: int = 90

    # Knowledge synthesis settings
    synthesis_min_cluster_size: int = 5
    knowledge_decay_days: int = 180

    # Global learning settings
    enable_global_learning: bool = True
    global_contribution_threshold: float = 0.8

    # Feedback settings
    enable_explicit_feedback: bool = True
    feedback_weight_explicit: float = 0.6
    feedback_weight_implicit: float = 0.4


@dataclass
class FeedbackSignals:
    """Multi-signal feedback for importance scoring."""

    # Explicit feedback (from user)
    user_rating: Optional[float] = None  # 0.0-1.0 (thumbs down to thumbs up)
    user_comment: Optional[str] = None

    # Implicit feedback (from analytics)
    quality_score: Optional[float] = None  # From existing quality scoring
    response_relevance: Optional[float] = None
    engagement_depth: Optional[float] = None  # Follow-up questions, turns
    conversation_length: Optional[int] = None

    # Outcome signals
    lead_captured: bool = False
    booking_made: bool = False
    handoff_triggered: bool = False
    handoff_resolved: bool = False

    # Sentiment
    sentiment_score: Optional[float] = None  # -1.0 to 1.0
    sentiment_trend: Optional[str] = None  # "improving", "declining", "stable"

    def compute_composite_score(self, config: LearningConfig) -> float:
        """Compute weighted composite feedback score."""
        scores = []
        weights = []

        # Explicit feedback
        if self.user_rating is not None:
            scores.append(self.user_rating)
            weights.append(config.feedback_weight_explicit)

        # Implicit feedback - quality
        if self.quality_score is not None:
            scores.append(self.quality_score)
            weights.append(config.feedback_weight_implicit * 0.4)

        # Implicit feedback - engagement
        if self.engagement_depth is not None:
            scores.append(self.engagement_depth)
            weights.append(config.feedback_weight_implicit * 0.3)

        # Outcome bonuses
        outcome_score = 0.0
        if self.lead_captured:
            outcome_score += 0.3
        if self.booking_made:
            outcome_score += 0.4
        if self.handoff_resolved:
            outcome_score += 0.2

        if outcome_score > 0:
            scores.append(min(1.0, outcome_score))
            weights.append(config.feedback_weight_implicit * 0.3)

        # Weighted average
        if not scores:
            return 0.5  # Default neutral

        total_weight = sum(weights)
        if total_weight == 0:
            return 0.5

        return sum(s * w for s, w in zip(scores, weights)) / total_weight


@dataclass
class LearningExperience:
    """A single learning experience from a conversation."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    bot_id: str = ""
    tenant_id: str = ""
    session_id: str = ""

    # Interaction details
    interaction_type: InteractionType = InteractionType.NEUTRAL
    user_message: str = ""
    assistant_response: str = ""
    context_used: List[Dict[str, Any]] = field(default_factory=list)

    # Scoring
    importance_score: float = 0.5
    feedback_signals: FeedbackSignals = field(default_factory=FeedbackSignals)

    # Context snapshot
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    extracted_facts: Dict[str, Any] = field(default_factory=dict)
    detected_intent: Optional[str] = None
    conversation_stage: Optional[str] = None

    # Processing state
    crystallized: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database storage."""
        return {
            "_id": self.id,
            "bot_id": self.bot_id,
            "tenant_id": self.tenant_id,
            "session_id": self.session_id,
            "interaction_type": self.interaction_type.value,
            "user_message": self.user_message,
            "assistant_response": self.assistant_response,
            "context_used": self.context_used,
            "importance_score": self.importance_score,
            "feedback_signals": {
                "user_rating": self.feedback_signals.user_rating,
                "quality_score": self.feedback_signals.quality_score,
                "response_relevance": self.feedback_signals.response_relevance,
                "engagement_depth": self.feedback_signals.engagement_depth,
                "lead_captured": self.feedback_signals.lead_captured,
                "booking_made": self.feedback_signals.booking_made,
                "handoff_triggered": self.feedback_signals.handoff_triggered,
                "sentiment_score": self.feedback_signals.sentiment_score,
            },
            "conversation_history": self.conversation_history,
            "extracted_facts": self.extracted_facts,
            "detected_intent": self.detected_intent,
            "conversation_stage": self.conversation_stage,
            "crystallized": self.crystallized,
            "created_at": self.created_at,
            "processed_at": self.processed_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearningExperience":
        """Create from dictionary."""
        feedback_data = data.get("feedback_signals", {})
        return cls(
            id=data.get("_id", str(uuid.uuid4())),
            bot_id=data.get("bot_id", ""),
            tenant_id=data.get("tenant_id", ""),
            session_id=data.get("session_id", ""),
            interaction_type=InteractionType(data.get("interaction_type", "neutral")),
            user_message=data.get("user_message", ""),
            assistant_response=data.get("assistant_response", ""),
            context_used=data.get("context_used", []),
            importance_score=data.get("importance_score", 0.5),
            feedback_signals=FeedbackSignals(
                user_rating=feedback_data.get("user_rating"),
                quality_score=feedback_data.get("quality_score"),
                response_relevance=feedback_data.get("response_relevance"),
                engagement_depth=feedback_data.get("engagement_depth"),
                lead_captured=feedback_data.get("lead_captured", False),
                booking_made=feedback_data.get("booking_made", False),
                handoff_triggered=feedback_data.get("handoff_triggered", False),
                sentiment_score=feedback_data.get("sentiment_score"),
            ),
            conversation_history=data.get("conversation_history", []),
            extracted_facts=data.get("extracted_facts", {}),
            detected_intent=data.get("detected_intent"),
            conversation_stage=data.get("conversation_stage"),
            crystallized=data.get("crystallized", False),
            created_at=data.get("created_at", datetime.utcnow()),
            processed_at=data.get("processed_at"),
        )


@dataclass
class LearnedPattern:
    """A pattern extracted from multiple experiences."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    bot_id: Optional[str] = None  # None for global patterns
    tenant_id: Optional[str] = None  # None for global patterns
    scope: KnowledgeScope = KnowledgeScope.BOT_SPECIFIC

    pattern_type: PatternType = PatternType.RESPONSE_STRATEGY
    pattern_description: str = ""

    # Trigger conditions
    trigger_conditions: List[Dict[str, Any]] = field(default_factory=list)
    trigger_intents: List[str] = field(default_factory=list)
    trigger_keywords: List[str] = field(default_factory=list)

    # Recommended actions
    recommended_actions: List[str] = field(default_factory=list)
    example_responses: List[str] = field(default_factory=list)

    # Confidence and evidence
    confidence: float = 0.5
    evidence_count: int = 0
    evidence_ids: List[str] = field(default_factory=list)

    # Lifecycle
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_validated: datetime = field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None
    use_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database storage."""
        return {
            "_id": self.id,
            "bot_id": self.bot_id,
            "tenant_id": self.tenant_id,
            "scope": self.scope.value,
            "pattern_type": self.pattern_type.value,
            "pattern_description": self.pattern_description,
            "trigger_conditions": self.trigger_conditions,
            "trigger_intents": self.trigger_intents,
            "trigger_keywords": self.trigger_keywords,
            "recommended_actions": self.recommended_actions,
            "example_responses": self.example_responses,
            "confidence": self.confidence,
            "evidence_count": self.evidence_count,
            "evidence_ids": self.evidence_ids,
            "created_at": self.created_at,
            "last_validated": self.last_validated,
            "last_used": self.last_used,
            "use_count": self.use_count,
        }


@dataclass
class CrystallizedKnowledge:
    """High-level crystallized knowledge (strategies and principles)."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    scope: KnowledgeScope = KnowledgeScope.GLOBAL
    level: KnowledgeLevel = KnowledgeLevel.STRATEGY

    description: str = ""
    rationale: str = ""  # Why this knowledge works

    # Application guidance
    when_to_apply: List[str] = field(default_factory=list)
    how_to_apply: str = ""
    example_applications: List[Dict[str, str]] = field(default_factory=list)

    # Confidence and evidence
    confidence: float = 0.5
    supporting_patterns: List[str] = field(default_factory=list)  # Pattern IDs
    evidence_count: int = 0

    # Lifecycle
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_validated: datetime = field(default_factory=datetime.utcnow)
    validation_success_rate: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database storage."""
        return {
            "_id": self.id,
            "scope": self.scope.value,
            "level": self.level.value,
            "description": self.description,
            "rationale": self.rationale,
            "when_to_apply": self.when_to_apply,
            "how_to_apply": self.how_to_apply,
            "example_applications": self.example_applications,
            "confidence": self.confidence,
            "supporting_patterns": self.supporting_patterns,
            "evidence_count": self.evidence_count,
            "created_at": self.created_at,
            "last_validated": self.last_validated,
            "validation_success_rate": self.validation_success_rate,
        }


@dataclass
class ReflectionResult:
    """Result of meta-cognitive reflection on a conversation."""

    session_id: str = ""
    bot_id: str = ""

    # Self-critique
    critique_summary: str = ""
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)

    # Hypotheses for improvement
    hypotheses: List[Dict[str, Any]] = field(default_factory=list)

    # Confidence
    confidence: float = 0.5

    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "session_id": self.session_id,
            "bot_id": self.bot_id,
            "critique_summary": self.critique_summary,
            "strengths": self.strengths,
            "weaknesses": self.weaknesses,
            "hypotheses": self.hypotheses,
            "confidence": self.confidence,
            "created_at": self.created_at,
        }


@dataclass
class LearningOutcome:
    """Outcome of a learning operation."""

    success: bool = True
    operation: str = ""  # "crystallization", "prompt_evolution", "replay", etc.

    # Metrics
    items_processed: int = 0
    items_learned: int = 0
    patterns_created: int = 0
    patterns_updated: int = 0

    # Details
    details: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)

    # Timing
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "operation": self.operation,
            "items_processed": self.items_processed,
            "items_learned": self.items_learned,
            "patterns_created": self.patterns_created,
            "patterns_updated": self.patterns_updated,
            "details": self.details,
            "errors": self.errors,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "duration_seconds": self.duration_seconds,
        }
