from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ChatbotConfig(BaseModel):
    name: str
    system_prompt: Optional[str] = "You are a helpful assistant. Answer questions based on the provided context."
    welcome_message: Optional[str] = "Hello! How can I help you today?"
    primary_color: Optional[str] = "#3B82F6"
    text_color: Optional[str] = "#FFFFFF"
    position: Optional[str] = "bottom-right"
    is_personal: Optional[bool] = False


class ChatbotCreate(ChatbotConfig):
    pass


class ChatbotUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    welcome_message: Optional[str] = None
    primary_color: Optional[str] = None
    text_color: Optional[str] = None
    position: Optional[str] = None
    is_public: Optional[bool] = None
    share_password: Optional[str] = None  # Empty string to remove password
    is_personal: Optional[bool] = None


class ChatbotResponse(ChatbotConfig):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    total_messages: int = 0
    is_public: bool = False
    has_password: bool = False
    share_link: Optional[str] = None
    is_personal: bool = False


class EmbedCode(BaseModel):
    script_tag: str
    div_tag: str
    full_snippet: str


class DocumentUpload(BaseModel):
    filename: str
    content_type: str
    size: int


class DocumentResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    status: str
    chunks_count: int = 0
    created_at: datetime


class SharePasswordVerify(BaseModel):
    password: str


class ShareAccessResponse(BaseModel):
    access_granted: bool
    access_token: Optional[str] = None
    bot_name: str
    error: Optional[str] = None


class PublicBotConfig(BaseModel):
    name: str
    welcome_message: str
    primary_color: str
    text_color: str
    position: str
    requires_password: bool
    is_personal: bool = False
