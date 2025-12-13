from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from ..schemas.api_keys import (
    APIKeyCreate, APIKeyUpdate, APIKeyResponse, APIKeyCreateResponse,
    APIKeyListResponse, APIKeyUsageStats
)
from ..services.api_keys import (
    create_api_key, list_api_keys, get_api_key, update_api_key,
    delete_api_key, revoke_api_key, get_api_key_usage
)
from ..api.auth import get_current_user

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


def key_to_response(k: dict, include_key: bool = False) -> dict:
    resp = {
        "id": k["_id"],
        "name": k["name"],
        "key_prefix": k["key_prefix"],
        "scopes": k["scopes"],
        "rate_limit": k["rate_limit"],
        "is_active": k["is_active"],
        "created_at": k["created_at"],
        "expires_at": k.get("expires_at"),
        "last_used_at": k.get("last_used_at"),
        "usage_count": k.get("usage_count", 0)
    }
    if include_key and "key" in k:
        resp["key"] = k["key"]
    return resp


@router.get("", response_model=APIKeyListResponse)
async def list_keys(user: dict = Depends(get_current_user)):
    """List all API keys for the current tenant."""
    keys = await list_api_keys(user["tenant_id"])
    return APIKeyListResponse(
        items=[key_to_response(k) for k in keys],
        total=len(keys)
    )


@router.post("", response_model=APIKeyCreateResponse)
async def create_key(data: APIKeyCreate, user: dict = Depends(get_current_user)):
    """Create a new API key."""
    key = await create_api_key(
        tenant_id=user["tenant_id"],
        name=data.name,
        scopes=[s.value for s in data.scopes],
        rate_limit=data.rate_limit,
        expires_at=data.expires_at
    )
    return key_to_response(key, include_key=True)


@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_single_key(key_id: str, user: dict = Depends(get_current_user)):
    """Get a single API key."""
    key = await get_api_key(key_id, user["tenant_id"])
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return key_to_response(key)


@router.patch("/{key_id}", response_model=APIKeyResponse)
async def update_single_key(
    key_id: str,
    data: APIKeyUpdate,
    user: dict = Depends(get_current_user)
):
    """Update an API key."""
    update_data = data.model_dump(exclude_unset=True)
    if "scopes" in update_data:
        update_data["scopes"] = [s.value if hasattr(s, 'value') else s for s in update_data["scopes"]]

    key = await update_api_key(key_id, user["tenant_id"], update_data)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return key_to_response(key)


@router.delete("/{key_id}")
async def delete_single_key(key_id: str, user: dict = Depends(get_current_user)):
    """Delete an API key."""
    success = await delete_api_key(key_id, user["tenant_id"])
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"message": "API key deleted"}


@router.post("/{key_id}/revoke")
async def revoke_single_key(key_id: str, user: dict = Depends(get_current_user)):
    """Revoke an API key (deactivate without deleting)."""
    success = await revoke_api_key(key_id, user["tenant_id"])
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"message": "API key revoked"}


@router.get("/{key_id}/usage", response_model=APIKeyUsageStats)
async def get_key_usage(key_id: str, user: dict = Depends(get_current_user)):
    """Get usage statistics for an API key."""
    stats = await get_api_key_usage(key_id, user["tenant_id"])
    if not stats:
        raise HTTPException(status_code=404, detail="API key not found")
    return stats
