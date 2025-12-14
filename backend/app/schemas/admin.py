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
    # General
    app_name: str = "Aiden"
    app_description: str = "AI-powered chatbot platform"
    support_email: str = "support@aidenlink.cloud"

    # Registration
    maintenance_mode: bool = False
    allow_registration: bool = True
    require_email_verification: bool = False
    default_subscription_tier: str = "free"

    # Free tier limits
    free_max_chatbots: int = 1
    free_max_documents: int = 5
    free_max_messages_per_day: int = 50
    free_max_file_size_mb: int = 5

    # Pro tier limits
    pro_max_chatbots: int = 10
    pro_max_documents: int = 50
    pro_max_messages_per_day: int = 1000
    pro_max_file_size_mb: int = 25

    # Enterprise tier limits
    enterprise_max_chatbots: int = -1  # -1 = unlimited
    enterprise_max_documents: int = -1
    enterprise_max_messages_per_day: int = -1
    enterprise_max_file_size_mb: int = 100

    # AI Settings
    default_model: str = "deepseek-chat"
    max_context_chunks: int = 10
    temperature: float = 0.7

    # Maintenance
    maintenance_message: str = "We are currently performing maintenance. Please try again later."


class SystemSettingsUpdate(BaseModel):
    # General
    app_name: Optional[str] = None
    app_description: Optional[str] = None
    support_email: Optional[str] = None

    # Registration
    maintenance_mode: Optional[bool] = None
    allow_registration: Optional[bool] = None
    require_email_verification: Optional[bool] = None
    default_subscription_tier: Optional[str] = None

    # Free tier limits
    free_max_chatbots: Optional[int] = None
    free_max_documents: Optional[int] = None
    free_max_messages_per_day: Optional[int] = None
    free_max_file_size_mb: Optional[int] = None

    # Pro tier limits
    pro_max_chatbots: Optional[int] = None
    pro_max_documents: Optional[int] = None
    pro_max_messages_per_day: Optional[int] = None
    pro_max_file_size_mb: Optional[int] = None

    # Enterprise tier limits
    enterprise_max_chatbots: Optional[int] = None
    enterprise_max_documents: Optional[int] = None
    enterprise_max_messages_per_day: Optional[int] = None
    enterprise_max_file_size_mb: Optional[int] = None

    # AI Settings
    default_model: Optional[str] = None
    max_context_chunks: Optional[int] = None
    temperature: Optional[float] = None

    # Maintenance
    maintenance_message: Optional[str] = None


# Pagination
class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    per_page: int
    pages: int
