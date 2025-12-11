from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class User(BaseModel):
    """User model."""
    id: Optional[str] = None
    tenant_id: str
    email: EmailStr
    name: str
    role: str = "member"  # admin, member
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(BaseModel):
    """Schema for creating a user."""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserInDB(User):
    """User as stored in database."""
    password_hash: str


class Token(BaseModel):
    """JWT Token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data encoded in JWT token."""
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[str] = None
