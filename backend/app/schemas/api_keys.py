from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class APIKeyScope(str, Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class APIKeyCreate(BaseModel):
    name: str
    scopes: List[APIKeyScope] = [APIKeyScope.READ]
    rate_limit: int = 1000  # Requests per day
    expires_at: Optional[datetime] = None


class APIKeyUpdate(BaseModel):
    name: Optional[str] = None
    scopes: Optional[List[APIKeyScope]] = None
    rate_limit: Optional[int] = None
    is_active: Optional[bool] = None


class APIKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str  # First 8 chars for identification
    scopes: List[str]
    rate_limit: int
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    usage_count: int = 0


class APIKeyCreateResponse(APIKeyResponse):
    key: str  # Full key, only shown once on creation


class APIKeyListResponse(BaseModel):
    items: List[APIKeyResponse]
    total: int


class APIKeyUsageStats(BaseModel):
    total_requests: int = 0
    requests_today: int = 0
    requests_this_month: int = 0
    rate_limit_remaining: int = 0
    by_endpoint: dict = {}
