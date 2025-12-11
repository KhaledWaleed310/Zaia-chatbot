from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ThemeConfig(BaseModel):
    """Chatbot theme configuration."""
    primary_color: str = "#4F46E5"
    secondary_color: str = "#10B981"
    background_color: str = "#FFFFFF"
    text_color: str = "#1F2937"
    font_family: str = "Inter, sans-serif"
    border_radius: str = "12px"
    position: str = "bottom-right"  # bottom-right, bottom-left


class ChatbotConfig(BaseModel):
    """Chatbot configuration settings."""
    system_prompt: Optional[str] = "You are a helpful assistant that answers questions based on the provided knowledge base."
    personality: str = "Professional and friendly"
    welcome_message: str = "Hello! How can I help you today?"
    suggested_questions: List[str] = []
    temperature: float = Field(default=0.3, ge=0, le=2)
    max_tokens: int = Field(default=1000, ge=100, le=4000)
    language: str = "English"
    company_name: Optional[str] = None
    theme: ThemeConfig = Field(default_factory=ThemeConfig)
    show_sources: bool = True
    enable_feedback: bool = True


class Chatbot(BaseModel):
    """Chatbot model."""
    id: Optional[str] = None
    tenant_id: str
    name: str
    description: Optional[str] = None
    kb_ids: List[str] = []
    config: ChatbotConfig = Field(default_factory=ChatbotConfig)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class ChatbotCreate(BaseModel):
    """Schema for creating a chatbot."""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    kb_ids: List[str] = []
    config: Optional[ChatbotConfig] = None


class ChatbotUpdate(BaseModel):
    """Schema for updating a chatbot."""
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    kb_ids: Optional[List[str]] = None
    config: Optional[ChatbotConfig] = None
    is_active: Optional[bool] = None


class ChatbotInDB(Chatbot):
    """Chatbot as stored in database."""
    embed_key: str
    total_conversations: int = 0
    total_messages: int = 0
