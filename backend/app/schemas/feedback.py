from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class FeedbackType(str, Enum):
    THUMBS_UP = "thumbs_up"
    THUMBS_DOWN = "thumbs_down"
    RATING = "rating"
    COMMENT = "comment"


class FeedbackCreate(BaseModel):
    message_id: str
    session_id: str
    feedback_type: FeedbackType
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    bot_id: str
    message_id: str
    session_id: str
    query: str
    response: str
    feedback_type: FeedbackType
    rating: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime


class FeedbackListResponse(BaseModel):
    items: List[FeedbackResponse]
    total: int
    page: int
    per_page: int
    pages: int


class FeedbackStats(BaseModel):
    total_feedback: int = 0
    thumbs_up: int = 0
    thumbs_down: int = 0
    average_rating: float = 0
    positive_rate: float = 0
    feedback_rate: float = 0  # % of messages that received feedback


class TrainingPairCreate(BaseModel):
    query: str
    ideal_response: str
    tags: List[str] = []
    source: str = "feedback"  # feedback, manual, import


class TrainingPairResponse(BaseModel):
    id: str
    bot_id: str
    query: str
    ideal_response: str
    tags: List[str] = []
    source: str
    approved: bool = False
    created_at: datetime


class TrainingPairListResponse(BaseModel):
    items: List[TrainingPairResponse]
    total: int
    page: int
    per_page: int
    pages: int


class TrainingExportFormat(str, Enum):
    JSON = "json"
    JSONL = "jsonl"
    CSV = "csv"
