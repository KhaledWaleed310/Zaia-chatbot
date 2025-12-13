"""
Subscription limits service for the free plan.
All users are on the free plan until payment gateway is implemented.
"""
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from ..core.database import get_mongodb

# Free Plan Limits
FREE_PLAN_LIMITS = {
    "max_chatbots": 1,
    "max_documents_per_chatbot": 5,
    "max_messages_per_day": 50,
    "max_file_size_mb": 5,
}

# Pro Plan Limits (for future use)
PRO_PLAN_LIMITS = {
    "max_chatbots": 10,
    "max_documents_per_chatbot": 50,
    "max_messages_per_day": 1000,
    "max_file_size_mb": 25,
}

# Enterprise Plan Limits (for future use)
ENTERPRISE_PLAN_LIMITS = {
    "max_chatbots": -1,  # -1 means unlimited
    "max_documents_per_chatbot": -1,
    "max_messages_per_day": -1,
    "max_file_size_mb": 100,
}


def get_user_limits(user: dict) -> dict:
    """Get the limits for a user based on their subscription tier."""
    tier = user.get("subscription_tier", "free")

    if tier == "enterprise":
        return ENTERPRISE_PLAN_LIMITS
    elif tier == "pro":
        return PRO_PLAN_LIMITS
    else:
        return FREE_PLAN_LIMITS


async def check_chatbot_limit(user_id: str, user: dict = None) -> None:
    """
    Check if user can create a new chatbot.
    Raises HTTPException if limit is reached.
    """
    db = get_mongodb()

    if user is None:
        user = await db.users.find_one({"_id": user_id})

    limits = get_user_limits(user or {})
    max_chatbots = limits["max_chatbots"]

    # -1 means unlimited
    if max_chatbots == -1:
        return

    current_count = await db.chatbots.count_documents({"tenant_id": user_id})

    if current_count >= max_chatbots:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You have reached the maximum number of chatbots ({max_chatbots}) for your plan. Please upgrade to create more chatbots."
        )


async def check_document_limit(user_id: str, bot_id: str, user: dict = None) -> None:
    """
    Check if user can upload a new document to a chatbot.
    Raises HTTPException if limit is reached.
    """
    db = get_mongodb()

    if user is None:
        user = await db.users.find_one({"_id": user_id})

    limits = get_user_limits(user or {})
    max_docs = limits["max_documents_per_chatbot"]

    # -1 means unlimited
    if max_docs == -1:
        return

    current_count = await db.documents.count_documents({
        "tenant_id": user_id,
        "bot_id": bot_id
    })

    if current_count >= max_docs:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You have reached the maximum number of documents ({max_docs}) for this chatbot. Please upgrade to upload more documents."
        )


def check_file_size_limit(file_size_bytes: int, user: dict = None) -> None:
    """
    Check if file size is within limit.
    Raises HTTPException if file is too large.
    """
    limits = get_user_limits(user or {})
    max_size_mb = limits["max_file_size_mb"]
    max_size_bytes = max_size_mb * 1024 * 1024

    if file_size_bytes > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the maximum allowed size ({max_size_mb}MB) for your plan. Please upgrade for larger file uploads."
        )


async def check_message_limit(tenant_id: str, user: dict = None) -> None:
    """
    Check if user can send a new message (daily limit).
    Raises HTTPException if limit is reached.
    """
    db = get_mongodb()

    if user is None:
        user = await db.users.find_one({"_id": tenant_id})

    limits = get_user_limits(user or {})
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
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You have reached the maximum number of messages ({max_messages}) for today. Please try again tomorrow or upgrade your plan."
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
