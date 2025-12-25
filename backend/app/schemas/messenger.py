"""Schemas for Facebook Messenger integration."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MessengerConnectionStatus(str, Enum):
    CONNECTED = "connected"
    ERROR = "error"
    TOKEN_EXPIRED = "token_expired"
    DISCONNECTED = "disconnected"


class AuthUrlResponse(BaseModel):
    """Response containing OAuth authorization URL."""
    auth_url: str


class FacebookPage(BaseModel):
    """A Facebook Page that can be connected."""
    id: str
    name: str
    category: Optional[str] = None
    picture_url: Optional[str] = None


class PagesListResponse(BaseModel):
    """Response containing list of available pages."""
    pages: List[FacebookPage]


class ConnectPageRequest(BaseModel):
    """Request to connect a Facebook Page."""
    page_id: str


class MessengerConnectionResponse(BaseModel):
    """Response containing messenger connection details."""
    id: str
    bot_id: str
    page_id: str
    page_name: str
    status: MessengerConnectionStatus
    enabled: bool
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    connected_at: datetime
    error_message: Optional[str] = None


class MessengerConfigResponse(BaseModel):
    """Response for messenger configuration status."""
    is_configured: bool
    is_connected: bool
    connection: Optional[MessengerConnectionResponse] = None


class DisconnectResponse(BaseModel):
    """Response after disconnecting."""
    message: str
    success: bool


class MessengerStatsResponse(BaseModel):
    """Messenger integration statistics."""
    total_messages: int
    messages_today: int
    messages_this_week: int
    messages_this_month: int
    unique_users: int
    avg_response_time_ms: Optional[float] = None


class WebhookEventType(str, Enum):
    MESSAGE = "message"
    POSTBACK = "postback"
    READ = "read"
    DELIVERY = "delivery"


class IncomingMessage(BaseModel):
    """Schema for incoming messenger message."""
    page_id: str
    sender_id: str
    recipient_id: str
    timestamp: int
    event_type: WebhookEventType
    message_id: Optional[str] = None
    text: Optional[str] = None
    attachments: Optional[List[dict]] = None
    is_echo: bool = False


class OutgoingMessage(BaseModel):
    """Schema for outgoing messenger message."""
    recipient_id: str
    text: str
