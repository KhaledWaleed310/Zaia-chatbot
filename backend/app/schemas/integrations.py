"""Schemas for OAuth integrations."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class IntegrationProvider(str, Enum):
    GOOGLE_DRIVE = "google_drive"
    GMAIL = "gmail"
    NOTION = "notion"
    SLACK = "slack"
    HUBSPOT = "hubspot"


class IntegrationStatus(str, Enum):
    CONNECTED = "connected"
    EXPIRED = "expired"
    ERROR = "error"


class SyncStats(BaseModel):
    documents_count: int = 0
    last_error: Optional[str] = None


class IntegrationResponse(BaseModel):
    id: str
    provider: IntegrationProvider
    status: IntegrationStatus
    provider_user_email: Optional[str] = None
    last_sync: Optional[datetime] = None
    sync_stats: SyncStats = SyncStats()
    created_at: datetime
    updated_at: datetime


class IntegrationListResponse(BaseModel):
    integrations: List[IntegrationResponse]


class AuthUrlResponse(BaseModel):
    auth_url: str
    provider: str


class BrowseItemType(str, Enum):
    FILE = "file"
    FOLDER = "folder"
    PAGE = "page"
    DATABASE = "database"
    CHANNEL = "channel"
    LABEL = "label"
    EMAIL = "email"


class BrowseItem(BaseModel):
    id: str
    name: str
    type: BrowseItemType
    mime_type: Optional[str] = None
    size: Optional[int] = None
    modified_at: Optional[datetime] = None
    parent_id: Optional[str] = None
    url: Optional[str] = None
    has_children: bool = False
    # For emails
    subject: Optional[str] = None
    sender: Optional[str] = None
    date: Optional[datetime] = None
    snippet: Optional[str] = None


class BrowseResponse(BaseModel):
    items: List[BrowseItem]
    next_page_token: Optional[str] = None
    parent_id: Optional[str] = None
    parent_name: Optional[str] = None


class ImportItem(BaseModel):
    id: str
    name: str
    type: BrowseItemType


class ImportRequest(BaseModel):
    items: List[ImportItem]


class ImportResponse(BaseModel):
    message: str
    task_id: str
    items_count: int


class ImportedDocument(BaseModel):
    id: str
    filename: str
    source_type: str
    remote_id: str
    remote_url: Optional[str] = None
    status: str
    created_at: datetime
