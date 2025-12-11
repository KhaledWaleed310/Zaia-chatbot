from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class FeedbackType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"


class SourceReference(BaseModel):
    """Reference to source material."""
    text: str
    kb_id: str
    chunk_id: Optional[str] = None
    source_type: str = "vector"  # vector, mongo, graph
    score: float = 0.0
    metadata: dict = {}


class Message(BaseModel):
    """Chat message model."""
    id: Optional[str] = None
    role: MessageRole
    content: str
    sources: List[SourceReference] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    feedback: Optional[FeedbackType] = None
    tokens_used: int = 0


class MessageCreate(BaseModel):
    """Schema for creating a message."""
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: Optional[str] = None


class Conversation(BaseModel):
    """Conversation model."""
    id: Optional[str] = None
    tenant_id: str
    bot_id: str
    session_id: str
    messages: List[Message] = []
    metadata: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class ConversationInDB(Conversation):
    """Conversation as stored in database."""
    total_messages: int = 0
    total_tokens: int = 0
    has_feedback: bool = False
