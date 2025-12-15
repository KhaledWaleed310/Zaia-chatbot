"""
Password Reset Schemas
"""
from pydantic import BaseModel, EmailStr, field_validator


class ForgotPasswordRequest(BaseModel):
    """Request schema for forgot password endpoint"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request schema for reset password endpoint"""
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
