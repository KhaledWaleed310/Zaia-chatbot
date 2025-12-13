from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    user = "user"
    admin = "admin"


class UserStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    deleted = "deleted"


class SubscriptionTier(str, Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


# User Management Schemas
class AdminUserResponse(BaseModel):
    id: str
    email: str
    company_name: Optional[str] = None
    role: str = "user"
    status: str = "active"
    subscription_tier: str = "free"
    chatbots_count: int = 0
    documents_count: int = 0
    messages_count: int = 0
    created_at: datetime
    last_login: Optional[datetime] = None


class AdminUserUpdate(BaseModel):
    company_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    subscription_tier: Optional[str] = None


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    role: str = "user"
    subscription_tier: str = "free"


# Chatbot Management Schemas
class AdminChatbotResponse(BaseModel):
    id: str
    name: str
    tenant_id: str
    owner_email: Optional[str] = None
    documents_count: int = 0
    messages_count: int = 0
    is_public: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None


# Analytics Schemas
class SystemStats(BaseModel):
    total_users: int
    active_users: int
    total_chatbots: int
    total_documents: int
    total_messages: int
    total_conversations: int
    users_by_tier: dict
    users_by_status: dict


class UsageStats(BaseModel):
    date: str
    new_users: int
    new_chatbots: int
    new_documents: int
    messages_sent: int


class DatabaseStats(BaseModel):
    name: str
    status: str
    collections: Optional[List[dict]] = None
    size: Optional[str] = None
    details: Optional[dict] = None


# Settings Schemas
class SystemSettings(BaseModel):
    maintenance_mode: bool = False
    max_free_chatbots: int = 3
    max_free_documents: int = 50
    max_pro_chatbots: int = 10
    max_pro_documents: int = 500
    allow_registration: bool = True
    default_llm_model: str = "deepseek-chat"


class SystemSettingsUpdate(BaseModel):
    maintenance_mode: Optional[bool] = None
    max_free_chatbots: Optional[int] = None
    max_free_documents: Optional[int] = None
    max_pro_chatbots: Optional[int] = None
    max_pro_documents: Optional[int] = None
    allow_registration: Optional[bool] = None
    default_llm_model: Optional[str] = None


# Pagination
class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    per_page: int
    pages: int
