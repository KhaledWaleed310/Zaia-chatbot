from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class APIKey(BaseModel):
    """API Key for tenant authentication."""
    key: str
    name: str = "Default"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None


class UsageStats(BaseModel):
    """Tenant usage statistics."""
    messages_this_month: int = 0
    storage_bytes: int = 0
    knowledge_bases: int = 0
    chatbots: int = 0


class Tenant(BaseModel):
    """Tenant/Workspace model."""
    id: Optional[str] = None
    name: str
    email: EmailStr
    plan: PlanType = PlanType.FREE
    usage: UsageStats = Field(default_factory=UsageStats)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class TenantCreate(BaseModel):
    """Schema for creating a tenant."""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class TenantUpdate(BaseModel):
    """Schema for updating a tenant."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)


class TenantInDB(Tenant):
    """Tenant as stored in database."""
    password_hash: str
    api_keys: List[APIKey] = []
