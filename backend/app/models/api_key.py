"""API Key models for tenant authentication."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class APIKeyCreate(BaseModel):
    """Schema for creating an API key."""
    name: str = Field(..., min_length=1, max_length=100, description="Name/description for the API key")


class APIKeyResponse(BaseModel):
    """Response schema for API key (includes actual key only on creation)."""
    id: str
    key: Optional[str] = None  # Only included when first created
    name: str
    created_at: datetime
    last_used: Optional[datetime] = None


class APIKeyListItem(BaseModel):
    """Schema for API key in list (without the actual key value)."""
    id: str
    name: str
    created_at: datetime
    last_used: Optional[datetime] = None
