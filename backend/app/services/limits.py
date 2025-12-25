"""
Subscription limits service for the Aiden Link platform.
Reads limits from system_settings in database, with fallback to defaults.
"""
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from ..core.database import get_mongodb

# Default Plan Limits (used when system_settings not configured)
DEFAULT_FREE_LIMITS = {
    "max_chatbots": 1,
    "max_documents_per_chatbot": 5,
    "max_messages_per_day": 50,
    "max_file_size_mb": 5,
}

DEFAULT_PRO_LIMITS = {
    "max_chatbots": 10,
    "max_documents_per_chatbot": 50,
    "max_messages_per_day": 1000,
    "max_file_size_mb": 25,
}

DEFAULT_ENTERPRISE_LIMITS = {
    "max_chatbots": -1,  # -1 means unlimited
    "max_documents_per_chatbot": -1,
    "max_messages_per_day": -1,
    "max_file_size_mb": 100,
}


async def get_system_settings():
    """Get system settings from database or return defaults."""
    db = get_mongodb()
    settings = await db.system_settings.find_one({"_id": "system"})
    return settings or {}


async def get_tier_limits(tier: str) -> dict:
    """
    Get limits for a specific tier from database or defaults.

    Args:
        tier: 'free', 'pro', or 'enterprise'

    Returns:
        dict with max_chatbots, max_documents_per_chatbot,
        max_messages_per_day, max_file_size_mb
    """
    settings = await get_system_settings()

    if tier == "enterprise":
        return {
            "max_chatbots": settings.get("enterprise_max_chatbots", DEFAULT_ENTERPRISE_LIMITS["max_chatbots"]),
            "max_documents_per_chatbot": settings.get("enterprise_max_documents", DEFAULT_ENTERPRISE_LIMITS["max_documents_per_chatbot"]),
            "max_messages_per_day": settings.get("enterprise_max_messages_per_day", DEFAULT_ENTERPRISE_LIMITS["max_messages_per_day"]),
            "max_file_size_mb": settings.get("enterprise_max_file_size_mb", DEFAULT_ENTERPRISE_LIMITS["max_file_size_mb"]),
        }
    elif tier == "pro":
        return {
            "max_chatbots": settings.get("pro_max_chatbots", DEFAULT_PRO_LIMITS["max_chatbots"]),
            "max_documents_per_chatbot": settings.get("pro_max_documents", DEFAULT_PRO_LIMITS["max_documents_per_chatbot"]),
            "max_messages_per_day": settings.get("pro_max_messages_per_day", DEFAULT_PRO_LIMITS["max_messages_per_day"]),
            "max_file_size_mb": settings.get("pro_max_file_size_mb", DEFAULT_PRO_LIMITS["max_file_size_mb"]),
        }
    else:  # free tier
        return {
            "max_chatbots": settings.get("free_max_chatbots", DEFAULT_FREE_LIMITS["max_chatbots"]),
            "max_documents_per_chatbot": settings.get("free_max_documents", DEFAULT_FREE_LIMITS["max_documents_per_chatbot"]),
            "max_messages_per_day": settings.get("free_max_messages_per_day", DEFAULT_FREE_LIMITS["max_messages_per_day"]),
            "max_file_size_mb": settings.get("free_max_file_size_mb", DEFAULT_FREE_LIMITS["max_file_size_mb"]),
        }


def get_user_limits(user: dict) -> dict:
    """
    Get the limits for a user based on their subscription tier.

    NOTE: This is a synchronous function for backward compatibility.
    Use get_tier_limits_async for new code.
    """
    tier = user.get("subscription_tier", "free")

    if tier == "enterprise":
        return DEFAULT_ENTERPRISE_LIMITS
    elif tier == "pro":
        return DEFAULT_PRO_LIMITS
    else:
        return DEFAULT_FREE_LIMITS


async def get_user_limits_async(user: dict) -> dict:
    """
    Get the limits for a user based on their subscription tier (async version).
    Reads from database settings.
    """
    tier = user.get("subscription_tier", "free")
    return await get_tier_limits(tier)


async def check_chatbot_limit(user_id: str, user: dict = None) -> None:
    """
    Check if user can create a new chatbot.
    Raises HTTPException if limit is reached.
    """
    db = get_mongodb()

    if user is None:
        user = await db.users.find_one({"_id": user_id})

    limits = await get_user_limits_async(user or {})
    max_chatbots = limits["max_chatbots"]

    # -1 means unlimited
    if max_chatbots == -1:
        return

    current_count = await db.chatbots.count_documents({"tenant_id": user_id})

    if current_count >= max_chatbots:
        tier = (user or {}).get("subscription_tier", "free")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You have reached the maximum number of chatbots ({max_chatbots}) for your {tier} plan. Please upgrade to create more chatbots."
        )


async def check_document_limit(user_id: str, bot_id: str, user: dict = None) -> None:
    """
    Check if user can upload a new document to a chatbot.
    Raises HTTPException if limit is reached.
    """
    db = get_mongodb()

    if user is None:
        user = await db.users.find_one({"_id": user_id})

    limits = await get_user_limits_async(user or {})
    max_docs = limits["max_documents_per_chatbot"]

    # -1 means unlimited
    if max_docs == -1:
        return

    current_count = await db.documents.count_documents({
        "tenant_id": user_id,
        "bot_id": bot_id
    })

    if current_count >= max_docs:
        tier = (user or {}).get("subscription_tier", "free")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You have reached the maximum number of documents ({max_docs}) for this chatbot on your {tier} plan. Please upgrade to upload more documents."
        )


async def check_file_size_limit(file_size_bytes: int, user: dict = None) -> None:
    """
    Check if file size is within limit.
    Raises HTTPException if file is too large.
    """
    limits = await get_user_limits_async(user or {})
    max_size_mb = limits["max_file_size_mb"]
    max_size_bytes = max_size_mb * 1024 * 1024

    if file_size_bytes > max_size_bytes:
        tier = (user or {}).get("subscription_tier", "free")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the maximum allowed size ({max_size_mb}MB) for your {tier} plan. Please upgrade for larger file uploads."
        )


# Synchronous version for backward compatibility
def check_file_size_limit_sync(file_size_bytes: int, user: dict = None) -> None:
    """
    Synchronous version of check_file_size_limit using default limits.
    """
    limits = get_user_limits(user or {})
    max_size_mb = limits["max_file_size_mb"]
    max_size_bytes = max_size_mb * 1024 * 1024

    if file_size_bytes > max_size_bytes:
        tier = (user or {}).get("subscription_tier", "free")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the maximum allowed size ({max_size_mb}MB) for your {tier} plan. Please upgrade for larger file uploads."
        )


async def check_message_limit(tenant_id: str, user: dict = None) -> None:
    """
    Check if user can send a new message (daily limit).
    Raises HTTPException if limit is reached.
    """
    db = get_mongodb()

    if user is None:
        user = await db.users.find_one({"_id": tenant_id})

    limits = await get_user_limits_async(user or {})
    max_messages = limits["max_messages_per_day"]

    # -1 means unlimited
    if max_messages == -1:
        return

    # Count messages sent today by this tenant's chatbots
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    messages_today = await db.messages.count_documents({
        "tenant_id": tenant_id,
        "role": "user",  # Only count user messages, not assistant responses
        "timestamp": {"$gte": today_start}
    })

    if messages_today >= max_messages:
        tier = (user or {}).get("subscription_tier", "free")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You have reached the maximum number of messages ({max_messages}) for today on your {tier} plan. Please try again tomorrow or upgrade your plan."
        )


async def get_user_usage(user_id: str) -> dict:
    """Get current usage statistics for a user."""
    db = get_mongodb()

    # Count chatbots
    chatbots_count = await db.chatbots.count_documents({"tenant_id": user_id})

    # Count total documents across all chatbots
    documents_count = await db.documents.count_documents({"tenant_id": user_id})

    # Count messages sent today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    messages_today = await db.messages.count_documents({
        "tenant_id": user_id,
        "role": "user",
        "timestamp": {"$gte": today_start}
    })

    return {
        "chatbots": chatbots_count,
        "documents": documents_count,
        "messages_today": messages_today
    }


async def get_user_limits_with_usage(user_id: str, user: dict = None) -> dict:
    """
    Get user's limits and current usage in one call.
    Useful for displaying plan information in the UI.
    """
    db = get_mongodb()

    if user is None:
        user = await db.users.find_one({"_id": user_id})

    tier = (user or {}).get("subscription_tier", "free")
    limits = await get_tier_limits(tier)
    usage = await get_user_usage(user_id)

    return {
        "subscription_tier": tier,
        "limits": limits,
        "usage": usage,
        "remaining": {
            "chatbots": limits["max_chatbots"] - usage["chatbots"] if limits["max_chatbots"] != -1 else -1,
            "messages_today": limits["max_messages_per_day"] - usage["messages_today"] if limits["max_messages_per_day"] != -1 else -1,
        }
    }
