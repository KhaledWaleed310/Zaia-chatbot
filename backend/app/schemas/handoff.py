from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class HandoffStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    ACTIVE = "active"
    RESOLVED = "resolved"
    ABANDONED = "abandoned"


class HandoffPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class HandoffTrigger(str, Enum):
    USER_REQUEST = "user_request"
    KEYWORD = "keyword"
    SENTIMENT = "sentiment"
    UNANSWERED = "unanswered"
    MANUAL = "manual"


class HandoffConfig(BaseModel):
    enabled: Optional[bool] = None
    keywords: Optional[List[str]] = None
    sentiment_threshold: Optional[float] = None  # Trigger on negative sentiment
    unanswered_count_threshold: Optional[int] = None  # After X unanswered questions
    auto_assign: Optional[bool] = None  # Auto-assign to available agents
    notification_email: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None  # {start: "09:00", end: "17:00", timezone: "UTC"}
    offline_message: Optional[str] = None


class HandoffRequest(BaseModel):
    session_id: str
    reason: Optional[str] = None
    trigger: HandoffTrigger = HandoffTrigger.USER_REQUEST


class HandoffCreate(BaseModel):
    session_id: str
    bot_id: str
    trigger: HandoffTrigger = HandoffTrigger.USER_REQUEST
    trigger_reason: Optional[str] = None
    priority: HandoffPriority = HandoffPriority.MEDIUM
    visitor_info: Dict[str, Any] = {}


class HandoffUpdate(BaseModel):
    status: Optional[HandoffStatus] = None
    assigned_to: Optional[str] = None
    priority: Optional[HandoffPriority] = None
    notes: Optional[str] = None
    resolution: Optional[str] = None


class HandoffMessage(BaseModel):
    content: str
    sender_type: str = "agent"  # agent or visitor


class HandoffResponse(BaseModel):
    id: str
    session_id: str
    bot_id: str
    tenant_id: str
    status: HandoffStatus
    priority: HandoffPriority
    trigger: HandoffTrigger
    trigger_reason: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    visitor_info: Dict[str, Any] = {}
    messages: List[Dict[str, Any]] = []
    conversation_context: List[Dict[str, Any]] = []  # Bot conversation before handoff
    notes: Optional[str] = None
    resolution: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    wait_time_seconds: Optional[int] = None
    handle_time_seconds: Optional[int] = None


class HandoffListResponse(BaseModel):
    items: List[HandoffResponse]
    total: int
    page: int
    per_page: int
    pages: int


class AgentStatus(str, Enum):
    ONLINE = "online"
    BUSY = "busy"
    AWAY = "away"
    OFFLINE = "offline"


class AgentPresence(BaseModel):
    user_id: str
    status: AgentStatus = AgentStatus.OFFLINE
    active_handoffs: int = 0
    max_concurrent: int = 5
    last_seen: Optional[datetime] = None


class HandoffStats(BaseModel):
    total_handoffs: int = 0
    pending: int = 0
    active: int = 0
    resolved_today: int = 0
    avg_wait_time_seconds: float = 0
    avg_handle_time_seconds: float = 0
    by_trigger: Dict[str, int] = {}
    by_priority: Dict[str, int] = {}
