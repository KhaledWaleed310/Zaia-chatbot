from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DetectionMethod(str, Enum):
    LOW_CONTEXT_SCORE = "low_context_score"
    EXPLICIT_FALLBACK = "explicit_fallback"
    NO_SOURCES = "no_sources"


class SentimentLabel(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


# Unanswered Questions
class UnansweredQuestionBase(BaseModel):
    question: str
    response: str
    detection_method: DetectionMethod
    context_score: float
    sources_count: int


class UnansweredQuestionResponse(UnansweredQuestionBase):
    id: str
    bot_id: str
    session_id: str
    timestamp: datetime
    resolved: bool
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None


class UnansweredQuestionUpdate(BaseModel):
    resolved: Optional[bool] = None
    notes: Optional[str] = None


class UnansweredQuestionListResponse(BaseModel):
    items: List[UnansweredQuestionResponse]
    total: int
    page: int
    per_page: int


class UnansweredSummary(BaseModel):
    total: int
    unresolved: int
    resolved: int
    by_detection_method: Dict[str, int]
    by_day: List[Dict[str, Any]]


# Sentiment Analysis
class SentimentScore(BaseModel):
    label: SentimentLabel
    score: float
    confidence: float


class SentimentSummary(BaseModel):
    average_score: float
    positive_count: int
    neutral_count: int
    negative_count: int
    total_messages: int
    trend: float  # Change from previous period


class SentimentTimeline(BaseModel):
    timestamp: datetime
    average_score: float
    message_count: int


class SentimentTimelineResponse(BaseModel):
    data: List[SentimentTimeline]
    granularity: str


# Response Quality
class QualityDimensions(BaseModel):
    relevance: float
    completeness: float
    accuracy: float
    clarity: float
    source_alignment: float


class QualityScore(BaseModel):
    overall: float
    dimensions: QualityDimensions
    evaluated_at: datetime
    evaluation_method: str


class QualitySummary(BaseModel):
    avg_overall: float
    avg_relevance: float
    avg_completeness: float
    avg_accuracy: float
    avg_clarity: float
    total_evaluated: int
    low_quality_count: int
    high_quality_count: int
    trend: float


class QualityResponse(BaseModel):
    message_id: str
    session_id: str
    query: str
    response: str
    quality_score: QualityScore
    timestamp: datetime


class QualityListResponse(BaseModel):
    items: List[QualityResponse]
    total: int
    page: int
    per_page: int


# Usage Patterns
class HourlyUsage(BaseModel):
    hour: int
    messages: int
    sessions: int
    unique_visitors: int


class DailyUsage(BaseModel):
    date: str
    total_messages: int
    total_sessions: int
    peak_hour: int
    hourly_breakdown: List[HourlyUsage]


class UsageHeatmapCell(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    hour: int
    value: int


class UsageHeatmapResponse(BaseModel):
    data: List[UsageHeatmapCell]
    metric: str  # messages, sessions, users


class PeakHoursResponse(BaseModel):
    peak_hours: List[Dict[str, Any]]
    busiest_day: str
    quietest_day: str
    overall_peak_hour: int
    daily_patterns: List[DailyUsage]


class RealtimeUsage(BaseModel):
    active_sessions: int
    messages_last_hour: int
    messages_last_minute: int


# Topic Clustering
class TopicResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    keywords: List[str]
    message_count: int
    conversation_count: int
    sample_questions: List[str]
    is_custom: bool
    created_at: datetime


class TopicListResponse(BaseModel):
    items: List[TopicResponse]
    total: int


class TopicDistribution(BaseModel):
    topic_id: str
    topic_name: str
    percentage: float
    count: int


# Analytics Dashboard
class AnalyticsDashboard(BaseModel):
    unanswered_summary: UnansweredSummary
    sentiment_summary: SentimentSummary
    quality_summary: QualitySummary
    realtime_usage: RealtimeUsage
    topic_distribution: List[TopicDistribution]
