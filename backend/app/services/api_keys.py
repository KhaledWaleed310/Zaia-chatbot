from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid
import secrets
import hashlib
from ..core.database import get_mongodb, get_redis


def generate_api_key() -> tuple:
    """Generate a new API key. Returns (full_key, key_hash, key_prefix)."""
    key = f"zaia_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    key_prefix = key[:12]
    return key, key_hash, key_prefix


async def create_api_key(
    tenant_id: str,
    name: str,
    scopes: List[str],
    rate_limit: int = 1000,
    expires_at: Optional[datetime] = None
) -> Dict[str, Any]:
    """Create a new API key."""
    db = get_mongodb()

    key, key_hash, key_prefix = generate_api_key()

    api_key = {
        "_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "name": name,
        "key_hash": key_hash,
        "key_prefix": key_prefix,
        "scopes": scopes,
        "rate_limit": rate_limit,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
        "last_used_at": None,
        "usage_count": 0
    }

    await db.api_keys.insert_one(api_key)

    # Return with full key (only time it's shown)
    return {**api_key, "key": key}


async def get_api_key_by_hash(key_hash: str) -> Optional[Dict[str, Any]]:
    """Get API key by hash."""
    db = get_mongodb()
    return await db.api_keys.find_one({"key_hash": key_hash})


async def validate_api_key(key: str) -> Optional[Dict[str, Any]]:
    """Validate an API key and return the key document if valid."""
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    db = get_mongodb()

    api_key = await db.api_keys.find_one({
        "key_hash": key_hash,
        "is_active": True
    })

    if not api_key:
        return None

    # Check expiration
    if api_key.get("expires_at") and api_key["expires_at"] < datetime.utcnow():
        return None

    # Check rate limit
    redis = get_redis()
    rate_key = f"api_rate:{api_key['_id']}:{datetime.utcnow().strftime('%Y-%m-%d')}"
    current_usage = await redis.get(rate_key)

    if current_usage and int(current_usage) >= api_key["rate_limit"]:
        return None  # Rate limited

    # Update usage
    await redis.incr(rate_key)
    await redis.expire(rate_key, 86400)  # 24 hours

    # Update last used
    await db.api_keys.update_one(
        {"_id": api_key["_id"]},
        {
            "$set": {"last_used_at": datetime.utcnow()},
            "$inc": {"usage_count": 1}
        }
    )

    return api_key


async def list_api_keys(tenant_id: str) -> List[Dict[str, Any]]:
    """List all API keys for a tenant."""
    db = get_mongodb()
    keys = await db.api_keys.find({"tenant_id": tenant_id}).sort("created_at", -1).to_list(100)
    return keys


async def get_api_key(key_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """Get a single API key."""
    db = get_mongodb()
    return await db.api_keys.find_one({"_id": key_id, "tenant_id": tenant_id})


async def update_api_key(
    key_id: str,
    tenant_id: str,
    data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update an API key."""
    db = get_mongodb()

    result = await db.api_keys.find_one_and_update(
        {"_id": key_id, "tenant_id": tenant_id},
        {"$set": data},
        return_document=True
    )

    return result


async def delete_api_key(key_id: str, tenant_id: str) -> bool:
    """Delete an API key."""
    db = get_mongodb()
    result = await db.api_keys.delete_one({"_id": key_id, "tenant_id": tenant_id})
    return result.deleted_count > 0


async def revoke_api_key(key_id: str, tenant_id: str) -> bool:
    """Revoke (deactivate) an API key."""
    db = get_mongodb()
    result = await db.api_keys.update_one(
        {"_id": key_id, "tenant_id": tenant_id},
        {"$set": {"is_active": False}}
    )
    return result.modified_count > 0


async def get_api_key_usage(key_id: str, tenant_id: str) -> Dict[str, Any]:
    """Get usage statistics for an API key."""
    db = get_mongodb()
    redis = get_redis()

    api_key = await db.api_keys.find_one({"_id": key_id, "tenant_id": tenant_id})
    if not api_key:
        return {}

    # Get today's usage from Redis
    today = datetime.utcnow().strftime('%Y-%m-%d')
    rate_key = f"api_rate:{key_id}:{today}"
    today_usage = await redis.get(rate_key)

    return {
        "total_requests": api_key.get("usage_count", 0),
        "requests_today": int(today_usage) if today_usage else 0,
        "rate_limit": api_key["rate_limit"],
        "rate_limit_remaining": max(0, api_key["rate_limit"] - (int(today_usage) if today_usage else 0))
    }
