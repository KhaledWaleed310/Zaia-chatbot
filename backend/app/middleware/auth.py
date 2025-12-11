"""Authentication middleware for JWT token validation and tenant extraction."""

from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..dependencies import get_mongo_db
from ..services.auth_service import decode_access_token, verify_api_key as verify_api_key_func
from ..models import TenantInDB, TokenData

# Security scheme for JWT bearer tokens
security = HTTPBearer()


async def get_current_tenant(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> TenantInDB:
    """
    Dependency to get the current authenticated tenant from JWT token.

    Args:
        credentials: HTTP Authorization credentials with bearer token
        db: MongoDB database instance

    Returns:
        TenantInDB object for the authenticated tenant

    Raises:
        HTTPException: If token is invalid or tenant not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode and verify token
    token_data: Optional[TokenData] = decode_access_token(credentials.credentials)

    if token_data is None or token_data.tenant_id is None:
        raise credentials_exception

    # Fetch tenant from database
    tenant_doc = await db.tenants.find_one({"_id": token_data.tenant_id})

    if tenant_doc is None:
        raise credentials_exception

    # Convert MongoDB document to TenantInDB model
    tenant_doc["id"] = str(tenant_doc.pop("_id"))

    try:
        tenant = TenantInDB(**tenant_doc)
    except Exception:
        raise credentials_exception

    return tenant


async def get_current_tenant_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> Optional[TenantInDB]:
    """
    Optional dependency to get the current authenticated tenant.
    Returns None if no valid credentials provided.

    Args:
        credentials: Optional HTTP Authorization credentials
        db: MongoDB database instance

    Returns:
        TenantInDB object if authenticated, None otherwise
    """
    if credentials is None:
        return None

    try:
        token_data: Optional[TokenData] = decode_access_token(credentials.credentials)

        if token_data is None or token_data.tenant_id is None:
            return None

        tenant_doc = await db.tenants.find_one({"_id": token_data.tenant_id})

        if tenant_doc is None:
            return None

        tenant_doc["id"] = str(tenant_doc.pop("_id"))
        tenant = TenantInDB(**tenant_doc)
        return tenant

    except Exception:
        return None


async def verify_api_key_header(
    x_api_key: str = Header(..., description="API Key for authentication"),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> TenantInDB:
    """
    Dependency to verify API key from X-API-Key header.

    Args:
        x_api_key: API key from X-API-Key header
        db: MongoDB database instance

    Returns:
        TenantInDB object for the authenticated tenant

    Raises:
        HTTPException: If API key is invalid or not found
    """
    api_key_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key",
        headers={"WWW-Authenticate": "ApiKey"},
    )

    # Find tenant with this API key
    tenant_doc = await db.tenants.find_one({"api_keys.key": x_api_key})

    if tenant_doc is None:
        raise api_key_exception

    # Update last_used timestamp for the API key
    await db.tenants.update_one(
        {"_id": tenant_doc["_id"], "api_keys.key": x_api_key},
        {"$set": {"api_keys.$.last_used": None}}  # Will be updated in actual implementation
    )

    # Convert MongoDB document to TenantInDB model
    tenant_doc["id"] = str(tenant_doc.pop("_id"))

    try:
        tenant = TenantInDB(**tenant_doc)
    except Exception:
        raise api_key_exception

    return tenant
