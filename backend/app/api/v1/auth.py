"""Authentication API endpoints."""

import secrets
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog

from ...models import (
    TenantCreate,
    TenantInDB,
    Token,
    UserLogin,
    APIKeyCreate,
    APIKeyResponse,
    APIKeyListItem,
    APIKey,
)
from ...dependencies import get_mongo_db
from ...services.auth_service import hash_password, verify_password, create_access_token
from ...middleware import get_current_tenant

logger = structlog.get_logger()

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_tenant(
    tenant_data: TenantCreate,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> Token:
    """
    Register a new tenant account.

    Args:
        tenant_data: Tenant registration data (name, email, password)
        db: MongoDB database instance

    Returns:
        JWT access token for the new tenant

    Raises:
        HTTPException: If email already exists
    """
    # Check if tenant with email already exists
    existing_tenant = await db.tenants.find_one({"email": tenant_data.email})
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password
    password_hash = hash_password(tenant_data.password)

    # Create tenant document
    tenant_doc = {
        "name": tenant_data.name,
        "email": tenant_data.email,
        "password_hash": password_hash,
        "plan": "free",
        "usage": {
            "messages_this_month": 0,
            "storage_bytes": 0,
            "knowledge_bases": 0,
            "chatbots": 0,
        },
        "api_keys": [],
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }

    # Insert tenant into database
    result = await db.tenants.insert_one(tenant_doc)
    tenant_id = str(result.inserted_id)

    logger.info("New tenant registered", tenant_id=tenant_id, email=tenant_data.email)

    # Create access token
    access_token = create_access_token(
        data={
            "tenant_id": tenant_id,
            "email": tenant_data.email,
        }
    )

    return Token(access_token=access_token, token_type="bearer")


@router.post("/login", response_model=Token)
async def login_tenant(
    credentials: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> Token:
    """
    Login and get JWT access token.

    Args:
        credentials: Login credentials (email, password)
        db: MongoDB database instance

    Returns:
        JWT access token

    Raises:
        HTTPException: If credentials are invalid
    """
    # Find tenant by email
    tenant_doc = await db.tenants.find_one({"email": credentials.email})

    if not tenant_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(credentials.password, tenant_doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    tenant_id = str(tenant_doc["_id"])

    logger.info("Tenant logged in", tenant_id=tenant_id, email=credentials.email)

    # Create access token
    access_token = create_access_token(
        data={
            "tenant_id": tenant_id,
            "email": credentials.email,
        }
    )

    return Token(access_token=access_token, token_type="bearer")


@router.post("/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    api_key_data: APIKeyCreate,
    current_tenant: TenantInDB = Depends(get_current_tenant),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> APIKeyResponse:
    """
    Generate a new API key for the current tenant.

    Args:
        api_key_data: API key creation data (name)
        current_tenant: Currently authenticated tenant
        db: MongoDB database instance

    Returns:
        Created API key with the actual key value (only shown once)

    Raises:
        HTTPException: If maximum API keys limit reached
    """
    # Check if tenant has reached max API keys (e.g., 10)
    if len(current_tenant.api_keys) >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of API keys reached (10)"
        )

    # Generate secure API key
    api_key = secrets.token_urlsafe(32)
    key_id = secrets.token_urlsafe(16)

    # Create API key object
    api_key_obj = {
        "key": api_key,
        "name": api_key_data.name,
        "created_at": datetime.utcnow(),
        "last_used": None,
    }

    # Add API key to tenant
    await db.tenants.update_one(
        {"_id": current_tenant.id},
        {"$push": {"api_keys": api_key_obj}}
    )

    logger.info(
        "API key created",
        tenant_id=current_tenant.id,
        key_name=api_key_data.name
    )

    # Return API key response (with actual key - only time it's shown)
    return APIKeyResponse(
        id=key_id,
        key=api_key,
        name=api_key_data.name,
        created_at=api_key_obj["created_at"],
        last_used=None,
    )


@router.get("/api-keys", response_model=List[APIKeyListItem])
async def list_api_keys(
    current_tenant: TenantInDB = Depends(get_current_tenant),
) -> List[APIKeyListItem]:
    """
    List all API keys for the current tenant (without revealing the actual keys).

    Args:
        current_tenant: Currently authenticated tenant

    Returns:
        List of API keys without the actual key values
    """
    api_keys = []

    for idx, api_key in enumerate(current_tenant.api_keys):
        # Use index as ID since we don't have a separate ID field
        api_keys.append(
            APIKeyListItem(
                id=str(idx),
                name=api_key.name,
                created_at=api_key.created_at,
                last_used=api_key.last_used,
            )
        )

    return api_keys


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: str,
    current_tenant: TenantInDB = Depends(get_current_tenant),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> None:
    """
    Delete an API key by ID.

    Args:
        key_id: Index/ID of the API key to delete
        current_tenant: Currently authenticated tenant
        db: MongoDB database instance

    Raises:
        HTTPException: If API key not found
    """
    try:
        key_index = int(key_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid API key ID"
        )

    # Check if key_index is valid
    if key_index < 0 or key_index >= len(current_tenant.api_keys):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Get the API key to delete (for logging)
    api_key_to_delete = current_tenant.api_keys[key_index]

    # Remove API key from tenant
    current_tenant.api_keys.pop(key_index)

    # Update tenant in database
    await db.tenants.update_one(
        {"_id": current_tenant.id},
        {"$set": {"api_keys": [key.dict() for key in current_tenant.api_keys]}}
    )

    logger.info(
        "API key deleted",
        tenant_id=current_tenant.id,
        key_name=api_key_to_delete.name
    )

    return None
