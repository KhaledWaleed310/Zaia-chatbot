from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    sources: List[dict] = []


class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime


class AnalyticsResponse(BaseModel):
    total_conversations: int
    total_messages: int
    avg_messages_per_conversation: float
    popular_topics: List[dict]
    daily_usage: List[dict]


class ConversationListItem(BaseModel):
    id: str
    session_id: str
    title: Optional[str] = "New Conversation"
    created_at: datetime
    updated_at: datetime
    message_count: int


class ConversationListResponse(BaseModel):
    conversations: List[ConversationListItem]
    total: int


class ConversationUpdateRequest(BaseModel):
    title: Optional[str] = None


class ConversationDetailResponse(BaseModel):
    id: str
    session_id: str
    title: Optional[str]
    messages: List[dict]
    created_at: datetime
    updated_at: datetime
