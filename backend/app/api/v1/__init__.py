"""API v1 routes package."""

from fastapi import APIRouter
from .auth import router as auth_router
from .tenants import router as tenants_router

# Create main API v1 router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(tenants_router, prefix="/tenants", tags=["Tenants"])

__all__ = ["api_router"]
