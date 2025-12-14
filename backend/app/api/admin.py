from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
from ..core.security import get_current_admin, get_password_hash, is_admin, ADMIN_EMAILS
from ..core.database import get_mongodb, get_qdrant, get_neo4j, get_redis
from ..schemas.admin import (
    AdminUserResponse, AdminUserUpdate, AdminUserCreate,
    AdminChatbotResponse, SystemStats, UsageStats,
    DatabaseStats, SystemSettings, SystemSettingsUpdate
)
import uuid
import math
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ==================== SYSTEM OVERVIEW ====================

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(current_admin: dict = Depends(get_current_admin)):
    """Get system-wide statistics"""
    db = get_mongodb()

    # Count users
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": {"$ne": "suspended"}})

    # Count by subscription tier
    free_users = await db.users.count_documents({"$or": [{"subscription_tier": "free"}, {"subscription_tier": {"$exists": False}}]})
    pro_users = await db.users.count_documents({"subscription_tier": "pro"})
    enterprise_users = await db.users.count_documents({"subscription_tier": "enterprise"})

    # Count by status
    active_status = await db.users.count_documents({"$or": [{"status": "active"}, {"status": {"$exists": False}}]})
    suspended_status = await db.users.count_documents({"status": "suspended"})

    # Count chatbots
    total_chatbots = await db.chatbots.count_documents({})

    # Count documents
    total_documents = await db.documents.count_documents({})

    # Count messages
    total_messages = await db.messages.count_documents({})

    # Count conversations
    total_conversations = await db.conversations.count_documents({})

    return SystemStats(
        total_users=total_users,
        active_users=active_users,
        total_chatbots=total_chatbots,
        total_documents=total_documents,
        total_messages=total_messages,
        total_conversations=total_conversations,
        users_by_tier={
            "free": free_users,
            "pro": pro_users,
            "enterprise": enterprise_users
        },
        users_by_status={
            "active": active_status,
            "suspended": suspended_status
        }
    )


@router.get("/analytics/usage")
async def get_usage_analytics(
    days: int = Query(default=30, ge=1, le=90),
    current_admin: dict = Depends(get_current_admin)
):
    """Get usage analytics for the past N days"""
    db = get_mongodb()
    usage_data = []

    for i in range(days):
        date = datetime.utcnow() - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        new_users = await db.users.count_documents({
            "created_at": {"$gte": start_of_day, "$lt": end_of_day}
        })
        new_chatbots = await db.chatbots.count_documents({
            "created_at": {"$gte": start_of_day, "$lt": end_of_day}
        })
        new_documents = await db.documents.count_documents({
            "created_at": {"$gte": start_of_day, "$lt": end_of_day}
        })
        messages_sent = await db.messages.count_documents({
            "timestamp": {"$gte": start_of_day, "$lt": end_of_day}
        })

        usage_data.append({
            "date": start_of_day.strftime("%Y-%m-%d"),
            "new_users": new_users,
            "new_chatbots": new_chatbots,
            "new_documents": new_documents,
            "messages_sent": messages_sent
        })

    return {"usage": list(reversed(usage_data))}


@router.get("/analytics/business")
async def get_business_analytics(current_admin: dict = Depends(get_current_admin)):
    """Get comprehensive business analytics for decision making"""
    db = get_mongodb()

    # ===== USER DEMOGRAPHICS =====

    # Users by company size
    company_size_pipeline = [
        {"$match": {"company_size": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$company_size", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    company_sizes = await db.users.aggregate(company_size_pipeline).to_list(100)

    # Users by industry
    industry_pipeline = [
        {"$match": {"industry": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$industry", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    industries = await db.users.aggregate(industry_pipeline).to_list(100)

    # Users by use case
    use_case_pipeline = [
        {"$match": {"use_case": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$use_case", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    use_cases = await db.users.aggregate(use_case_pipeline).to_list(100)

    # Users by country
    country_pipeline = [
        {"$match": {"country": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    countries = await db.users.aggregate(country_pipeline).to_list(20)

    # Users by referral source
    referral_pipeline = [
        {"$match": {"referral_source": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$referral_source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    referrals = await db.users.aggregate(referral_pipeline).to_list(100)

    # ===== ENGAGEMENT METRICS =====

    # Active users (users who sent messages in last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    active_tenants = await db.messages.distinct("tenant_id", {
        "timestamp": {"$gte": week_ago}
    })
    weekly_active_users = len(active_tenants)

    # Active users in last 30 days
    month_ago = datetime.utcnow() - timedelta(days=30)
    monthly_active_tenants = await db.messages.distinct("tenant_id", {
        "timestamp": {"$gte": month_ago}
    })
    monthly_active_users = len(monthly_active_tenants)

    # Average chatbots per user
    total_users = await db.users.count_documents({})
    total_chatbots = await db.chatbots.count_documents({})
    avg_chatbots_per_user = round(total_chatbots / total_users, 2) if total_users > 0 else 0

    # Average documents per chatbot
    total_documents = await db.documents.count_documents({})
    avg_docs_per_chatbot = round(total_documents / total_chatbots, 2) if total_chatbots > 0 else 0

    # Average messages per conversation
    total_messages = await db.messages.count_documents({})
    total_conversations = await db.conversations.count_documents({})
    avg_msgs_per_conversation = round(total_messages / total_conversations, 2) if total_conversations > 0 else 0

    # ===== GROWTH METRICS =====

    # User growth by week (last 12 weeks)
    weekly_growth = []
    for i in range(12):
        week_start = datetime.utcnow() - timedelta(weeks=i+1)
        week_end = datetime.utcnow() - timedelta(weeks=i)
        count = await db.users.count_documents({
            "created_at": {"$gte": week_start, "$lt": week_end}
        })
        weekly_growth.append({
            "week": week_start.strftime("%Y-%m-%d"),
            "new_users": count
        })
    weekly_growth.reverse()

    # ===== CONVERSION FUNNEL =====

    # Users who created at least one chatbot
    users_with_chatbots = len(await db.chatbots.distinct("tenant_id"))

    # Users who uploaded at least one document
    users_with_documents = len(await db.documents.distinct("tenant_id"))

    # Users who have public chatbots
    public_bots = await db.chatbots.count_documents({"is_public": True})

    # ===== TOP PERFORMERS =====

    # Most active chatbots (by message count)
    top_chatbots_pipeline = [
        {"$group": {"_id": "$bot_id", "message_count": {"$sum": 1}}},
        {"$sort": {"message_count": -1}},
        {"$limit": 10}
    ]
    top_chatbots_raw = await db.messages.aggregate(top_chatbots_pipeline).to_list(10)

    # Enrich with chatbot names
    top_chatbots = []
    for item in top_chatbots_raw:
        bot = await db.chatbots.find_one({"_id": item["_id"]})
        if bot:
            top_chatbots.append({
                "id": item["_id"],
                "name": bot.get("name", "Unknown"),
                "message_count": item["message_count"]
            })

    # Most active users (by message count)
    top_users_pipeline = [
        {"$group": {"_id": "$tenant_id", "message_count": {"$sum": 1}}},
        {"$sort": {"message_count": -1}},
        {"$limit": 10}
    ]
    top_users_raw = await db.messages.aggregate(top_users_pipeline).to_list(10)

    top_users = []
    for item in top_users_raw:
        user = await db.users.find_one({"_id": item["_id"]})
        if user:
            top_users.append({
                "id": item["_id"],
                "email": user.get("email", "Unknown"),
                "company": user.get("company_name", "N/A"),
                "message_count": item["message_count"]
            })

    # ===== RECENT SIGNUPS =====
    recent_users_cursor = db.users.find({}).sort("created_at", -1).limit(10)
    recent_users = []
    async for user in recent_users_cursor:
        recent_users.append({
            "id": user["_id"],
            "email": user.get("email"),
            "company_name": user.get("company_name"),
            "company_size": user.get("company_size"),
            "industry": user.get("industry"),
            "use_case": user.get("use_case"),
            "country": user.get("country"),
            "created_at": user.get("created_at")
        })

    return {
        "demographics": {
            "by_company_size": [{"label": c["_id"], "count": c["count"]} for c in company_sizes],
            "by_industry": [{"label": c["_id"], "count": c["count"]} for c in industries],
            "by_use_case": [{"label": c["_id"], "count": c["count"]} for c in use_cases],
            "by_country": [{"label": c["_id"], "count": c["count"]} for c in countries],
            "by_referral": [{"label": c["_id"], "count": c["count"]} for c in referrals]
        },
        "engagement": {
            "weekly_active_users": weekly_active_users,
            "monthly_active_users": monthly_active_users,
            "total_users": total_users,
            "avg_chatbots_per_user": avg_chatbots_per_user,
            "avg_docs_per_chatbot": avg_docs_per_chatbot,
            "avg_msgs_per_conversation": avg_msgs_per_conversation
        },
        "growth": {
            "weekly_signups": weekly_growth
        },
        "funnel": {
            "total_users": total_users,
            "users_with_chatbots": users_with_chatbots,
            "users_with_documents": users_with_documents,
            "public_chatbots": public_bots,
            "conversion_to_chatbot": round(users_with_chatbots / total_users * 100, 1) if total_users > 0 else 0,
            "conversion_to_document": round(users_with_documents / total_users * 100, 1) if total_users > 0 else 0
        },
        "top_performers": {
            "chatbots": top_chatbots,
            "users": top_users
        },
        "recent_signups": recent_users
    }


@router.get("/analytics/realtime")
async def get_realtime_analytics(current_admin: dict = Depends(get_current_admin)):
    """Get real-time analytics (last 24 hours)"""
    db = get_mongodb()

    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)
    hour_ago = now - timedelta(hours=1)

    # Last 24 hours stats
    new_users_24h = await db.users.count_documents({"created_at": {"$gte": day_ago}})
    new_chatbots_24h = await db.chatbots.count_documents({"created_at": {"$gte": day_ago}})
    messages_24h = await db.messages.count_documents({"timestamp": {"$gte": day_ago}})
    conversations_24h = await db.conversations.count_documents({"created_at": {"$gte": day_ago}})

    # Last hour stats
    new_users_1h = await db.users.count_documents({"created_at": {"$gte": hour_ago}})
    messages_1h = await db.messages.count_documents({"timestamp": {"$gte": hour_ago}})

    # Hourly breakdown (last 24 hours)
    hourly_data = []
    for i in range(24):
        hour_start = now - timedelta(hours=i+1)
        hour_end = now - timedelta(hours=i)
        messages = await db.messages.count_documents({
            "timestamp": {"$gte": hour_start, "$lt": hour_end}
        })
        users = await db.users.count_documents({
            "created_at": {"$gte": hour_start, "$lt": hour_end}
        })
        hourly_data.append({
            "hour": hour_start.strftime("%H:00"),
            "messages": messages,
            "new_users": users
        })
    hourly_data.reverse()

    # Currently active (users with messages in last 5 minutes)
    five_min_ago = now - timedelta(minutes=5)
    active_now = len(await db.messages.distinct("tenant_id", {
        "timestamp": {"$gte": five_min_ago}
    }))

    return {
        "last_24h": {
            "new_users": new_users_24h,
            "new_chatbots": new_chatbots_24h,
            "messages": messages_24h,
            "conversations": conversations_24h
        },
        "last_hour": {
            "new_users": new_users_1h,
            "messages": messages_1h
        },
        "active_now": active_now,
        "hourly_breakdown": hourly_data
    }


# ==================== USER MANAGEMENT ====================

@router.get("/users")
async def list_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    subscription_tier: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """List all users with pagination and filters"""
    db = get_mongodb()

    # Build filter
    filter_query = {}
    if search:
        filter_query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}}
        ]
    if role:
        filter_query["role"] = role
    if status:
        filter_query["status"] = status
    if subscription_tier:
        filter_query["subscription_tier"] = subscription_tier

    # Get total count
    total = await db.users.count_documents(filter_query)
    pages = math.ceil(total / per_page)

    # Get users with pagination
    skip = (page - 1) * per_page
    cursor = db.users.find(filter_query).skip(skip).limit(per_page).sort("created_at", -1)
    users = await cursor.to_list(length=per_page)

    # Enrich user data with counts
    enriched_users = []
    for user in users:
        user_id = user["_id"]

        # Get counts for this user
        chatbots_count = await db.chatbots.count_documents({"tenant_id": user_id})
        documents_count = await db.documents.count_documents({"tenant_id": user_id})
        messages_count = await db.messages.count_documents({"tenant_id": user_id})

        enriched_users.append({
            "id": user_id,
            "email": user.get("email"),
            "company_name": user.get("company_name"),
            "role": user.get("role", "user"),
            "status": user.get("status", "active"),
            "subscription_tier": user.get("subscription_tier", "free"),
            "chatbots_count": chatbots_count,
            "documents_count": documents_count,
            "messages_count": messages_count,
            "created_at": user.get("created_at"),
            "last_login": user.get("last_login"),
            "is_admin": user.get("email") in ADMIN_EMAILS or user.get("role") == "admin"
        })

    return {
        "items": enriched_users,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages
    }


@router.get("/users/{user_id}")
async def get_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Get detailed user information"""
    db = get_mongodb()

    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get user's chatbots
    chatbots_cursor = db.chatbots.find({"tenant_id": user_id})
    chatbots = await chatbots_cursor.to_list(length=100)

    # Get counts
    chatbots_count = len(chatbots)
    documents_count = await db.documents.count_documents({"tenant_id": user_id})
    messages_count = await db.messages.count_documents({"tenant_id": user_id})
    conversations_count = await db.conversations.count_documents({"tenant_id": user_id})

    return {
        "id": user["_id"],
        "email": user.get("email"),
        "company_name": user.get("company_name"),
        "role": user.get("role", "user"),
        "status": user.get("status", "active"),
        "subscription_tier": user.get("subscription_tier", "free"),
        "created_at": user.get("created_at"),
        "last_login": user.get("last_login"),
        "is_admin": user.get("email") in ADMIN_EMAILS or user.get("role") == "admin",
        "stats": {
            "chatbots_count": chatbots_count,
            "documents_count": documents_count,
            "messages_count": messages_count,
            "conversations_count": conversations_count
        },
        "chatbots": [
            {
                "id": bot["_id"],
                "name": bot.get("name"),
                "created_at": bot.get("created_at"),
                "is_public": bot.get("is_public", False)
            }
            for bot in chatbots
        ]
    }


@router.post("/users")
async def create_user(
    user_data: AdminUserCreate,
    current_admin: dict = Depends(get_current_admin)
):
    """Create a new user (admin only)"""
    db = get_mongodb()

    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user_id = str(uuid.uuid4())
    new_user = {
        "_id": user_id,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "company_name": user_data.company_name,
        "role": user_data.role,
        "status": "active",
        "subscription_tier": user_data.subscription_tier,
        "created_at": datetime.utcnow(),
        "created_by": current_admin["_id"]
    }

    await db.users.insert_one(new_user)

    logger.info(f"Admin {current_admin['email']} created user {user_data.email} (ID: {user_id}) with role: {user_data.role}, tier: {user_data.subscription_tier}")

    return {
        "id": user_id,
        "email": user_data.email,
        "company_name": user_data.company_name,
        "role": user_data.role,
        "status": "active",
        "subscription_tier": user_data.subscription_tier,
        "message": "User created successfully"
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: AdminUserUpdate,
    current_admin: dict = Depends(get_current_admin)
):
    """Update user information"""
    db = get_mongodb()

    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Build update dict
    update_dict = {}
    if update_data.company_name is not None:
        update_dict["company_name"] = update_data.company_name
    if update_data.role is not None:
        update_dict["role"] = update_data.role
    if update_data.status is not None:
        update_dict["status"] = update_data.status
    if update_data.subscription_tier is not None:
        update_dict["subscription_tier"] = update_data.subscription_tier

    if update_dict:
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = current_admin["_id"]
        await db.users.update_one({"_id": user_id}, {"$set": update_dict})

        logger.info(f"Admin {current_admin['email']} updated user {user.get('email')} (ID: {user_id}), fields: {list(update_dict.keys())}")

    return {"message": "User updated successfully", "updated_fields": list(update_dict.keys())}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Soft delete a user"""
    db = get_mongodb()

    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting yourself
    if user_id == current_admin["_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Soft delete - mark as deleted
    await db.users.update_one(
        {"_id": user_id},
        {"$set": {
            "status": "deleted",
            "deleted_at": datetime.utcnow(),
            "deleted_by": current_admin["_id"]
        }}
    )

    logger.warning(f"Admin {current_admin['email']} deleted user {user.get('email')} (ID: {user_id})")

    return {"message": "User deleted successfully"}


@router.post("/users/{user_id}/suspend")
async def suspend_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Suspend a user account"""
    db = get_mongodb()

    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_id == current_admin["_id"]:
        raise HTTPException(status_code=400, detail="Cannot suspend your own account")

    await db.users.update_one(
        {"_id": user_id},
        {"$set": {"status": "suspended", "suspended_at": datetime.utcnow(), "suspended_by": current_admin["_id"]}}
    )

    logger.info(f"Admin {current_admin['email']} suspended user {user.get('email')} (ID: {user_id})")

    return {"message": "User suspended successfully"}


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Unsuspend a user account"""
    db = get_mongodb()

    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"_id": user_id},
        {"$set": {"status": "active"}, "$unset": {"suspended_at": "", "suspended_by": ""}}
    )

    logger.info(f"Admin {current_admin['email']} unsuspended user {user.get('email')} (ID: {user_id})")

    return {"message": "User unsuspended successfully"}


# ==================== CHATBOT MANAGEMENT ====================

@router.get("/chatbots")
async def list_all_chatbots(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    """List all chatbots in the system"""
    db = get_mongodb()

    # Build filter
    filter_query = {}
    if search:
        filter_query["name"] = {"$regex": search, "$options": "i"}

    # Get total count
    total = await db.chatbots.count_documents(filter_query)
    pages = math.ceil(total / per_page)

    # Get chatbots with pagination
    skip = (page - 1) * per_page
    cursor = db.chatbots.find(filter_query).skip(skip).limit(per_page).sort("created_at", -1)
    chatbots = await cursor.to_list(length=per_page)

    # Enrich with owner info and counts
    enriched_chatbots = []
    for bot in chatbots:
        owner = await db.users.find_one({"_id": bot.get("tenant_id")})
        documents_count = await db.documents.count_documents({"bot_id": bot["_id"]})
        messages_count = await db.messages.count_documents({"bot_id": bot["_id"]})

        enriched_chatbots.append({
            "id": bot["_id"],
            "name": bot.get("name"),
            "tenant_id": bot.get("tenant_id"),
            "owner_email": owner.get("email") if owner else "Unknown",
            "documents_count": documents_count,
            "messages_count": messages_count,
            "is_public": bot.get("is_public", False),
            "created_at": bot.get("created_at"),
            "updated_at": bot.get("updated_at")
        })

    return {
        "items": enriched_chatbots,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages
    }


@router.get("/chatbots/{bot_id}")
async def get_chatbot_details(bot_id: str, current_admin: dict = Depends(get_current_admin)):
    """Get detailed chatbot information"""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    owner = await db.users.find_one({"_id": bot.get("tenant_id")})

    # Get documents
    documents_cursor = db.documents.find({"bot_id": bot_id})
    documents = await documents_cursor.to_list(length=100)

    # Get message count
    messages_count = await db.messages.count_documents({"bot_id": bot_id})
    conversations_count = await db.conversations.count_documents({"bot_id": bot_id})

    return {
        "id": bot["_id"],
        "name": bot.get("name"),
        "system_prompt": bot.get("system_prompt"),
        "welcome_message": bot.get("welcome_message"),
        "tenant_id": bot.get("tenant_id"),
        "owner_email": owner.get("email") if owner else "Unknown",
        "is_public": bot.get("is_public", False),
        "created_at": bot.get("created_at"),
        "updated_at": bot.get("updated_at"),
        "stats": {
            "documents_count": len(documents),
            "messages_count": messages_count,
            "conversations_count": conversations_count
        },
        "documents": [
            {
                "id": doc["_id"],
                "filename": doc.get("filename"),
                "status": doc.get("status"),
                "created_at": doc.get("created_at")
            }
            for doc in documents
        ]
    }


@router.delete("/chatbots/{bot_id}")
async def delete_chatbot(bot_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete a chatbot and all its data"""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Delete related data
    await db.documents.delete_many({"bot_id": bot_id})
    await db.chunks.delete_many({"bot_id": bot_id})
    await db.messages.delete_many({"bot_id": bot_id})
    await db.conversations.delete_many({"bot_id": bot_id})
    await db.integrations.delete_many({"bot_id": bot_id})

    # Delete chatbot
    await db.chatbots.delete_one({"_id": bot_id})

    logger.warning(f"Admin {current_admin['email']} deleted chatbot {bot.get('name')} (ID: {bot_id})")

    return {"message": "Chatbot and all related data deleted successfully"}


# ==================== DATABASE MANAGEMENT ====================

@router.get("/databases")
async def get_database_stats(current_admin: dict = Depends(get_current_admin)):
    """Get status of all databases"""
    databases = []

    # MongoDB
    try:
        db = get_mongodb()
        collections = await db.list_collection_names()
        collection_stats = []
        for coll_name in collections:
            count = await db[coll_name].count_documents({})
            collection_stats.append({"name": coll_name, "documents": count})

        databases.append({
            "name": "MongoDB",
            "status": "connected",
            "collections": collection_stats,
            "details": {"database": db.name}
        })
    except Exception as e:
        databases.append({"name": "MongoDB", "status": "error", "details": {"error": str(e)}})

    # Qdrant
    try:
        qdrant = get_qdrant()
        collections = qdrant.get_collections()
        collection_info = []
        for coll in collections.collections:
            try:
                info = qdrant.get_collection(coll.name)
                collection_info.append({
                    "name": coll.name,
                    "vectors_count": getattr(info, 'vectors_count', 0) or 0,
                    "points_count": getattr(info, 'points_count', 0) or 0
                })
            except Exception:
                # If we can't get detailed info, just add the collection name
                collection_info.append({
                    "name": coll.name,
                    "vectors_count": 0,
                    "points_count": 0
                })
        databases.append({
            "name": "Qdrant (Vector DB)",
            "status": "connected",
            "collections": collection_info
        })
    except Exception as e:
        databases.append({"name": "Qdrant (Vector DB)", "status": "error", "details": {"error": str(e)}})

    # Neo4j
    try:
        neo4j = get_neo4j()
        async with neo4j.session() as session:
            result = await session.run("MATCH (n) RETURN count(n) as count")
            record = await result.single()
            node_count = record["count"] if record else 0

        databases.append({
            "name": "Neo4j (Graph DB)",
            "status": "connected",
            "details": {"total_nodes": node_count}
        })
    except Exception as e:
        databases.append({"name": "Neo4j (Graph DB)", "status": "error", "details": {"error": str(e)}})

    # Redis
    try:
        redis = get_redis()
        info = await redis.info()
        db_size = await redis.dbsize()
        databases.append({
            "name": "Redis (Cache)",
            "status": "connected",
            "details": {
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_keys": db_size
            }
        })
    except Exception as e:
        databases.append({"name": "Redis (Cache)", "status": "error", "details": {"error": str(e)}})

    return {"databases": databases}


@router.post("/databases/cleanup")
async def cleanup_orphaned_data(current_admin: dict = Depends(get_current_admin)):
    """Clean up orphaned data (documents without chatbots, etc.)"""
    db = get_mongodb()
    cleanup_results = {}

    # Find chatbot IDs
    chatbot_ids = [bot["_id"] async for bot in db.chatbots.find({}, {"_id": 1})]

    # Clean orphaned documents
    result = await db.documents.delete_many({"bot_id": {"$nin": chatbot_ids}})
    cleanup_results["orphaned_documents"] = result.deleted_count

    # Clean orphaned chunks
    result = await db.chunks.delete_many({"bot_id": {"$nin": chatbot_ids}})
    cleanup_results["orphaned_chunks"] = result.deleted_count

    # Clean orphaned messages
    result = await db.messages.delete_many({"bot_id": {"$nin": chatbot_ids}})
    cleanup_results["orphaned_messages"] = result.deleted_count

    # Clean orphaned conversations
    result = await db.conversations.delete_many({"bot_id": {"$nin": chatbot_ids}})
    cleanup_results["orphaned_conversations"] = result.deleted_count

    return {"message": "Cleanup completed", "results": cleanup_results}


# ==================== SYSTEM SETTINGS ====================

@router.get("/settings")
async def get_settings(current_admin: dict = Depends(get_current_admin)):
    """Get system settings"""
    db = get_mongodb()

    settings = await db.system_settings.find_one({"_id": "system"})

    # Start with defaults
    defaults = SystemSettings()
    result = defaults.model_dump()

    # Override with stored settings
    if settings:
        for key, value in settings.items():
            if key != "_id" and key in result:
                result[key] = value

    return result


@router.patch("/settings")
async def update_settings(
    settings_update: SystemSettingsUpdate,
    current_admin: dict = Depends(get_current_admin)
):
    """Update system settings"""
    db = get_mongodb()

    update_dict = {}
    for field, value in settings_update.model_dump(exclude_unset=True).items():
        if value is not None:
            update_dict[field] = value

    if update_dict:
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = current_admin["_id"]

        await db.system_settings.update_one(
            {"_id": "system"},
            {"$set": update_dict},
            upsert=True
        )

    return {"message": "Settings updated successfully", "updated_fields": list(update_dict.keys())}


# ==================== FINANCE ANALYTICS ====================

# Cost constants
DEEPSEEK_PRICING = {
    "input_cache_hit": 0.07,      # $0.07 per 1M tokens
    "input_cache_miss": 0.56,     # $0.56 per 1M tokens
    "output": 1.68,               # $1.68 per 1M tokens
}
SERVER_MONTHLY_COST = 24.00  # $24/month server cost


@router.get("/analytics/finance")
async def get_finance_analytics(current_admin: dict = Depends(get_current_admin)):
    """Get comprehensive financial analytics for business planning"""
    db = get_mongodb()

    # ===== TOKEN USAGE STATS =====

    # Get all token usage records
    token_usage_cursor = db.token_usage.find({})
    token_records = await token_usage_cursor.to_list(length=100000)

    total_input_tokens = sum(r.get("input_tokens", 0) for r in token_records)
    total_output_tokens = sum(r.get("output_tokens", 0) for r in token_records)
    total_cached_tokens = sum(r.get("cached_tokens", 0) for r in token_records)
    total_api_cost = sum(r.get("total_cost", 0) for r in token_records)
    total_api_calls = len(token_records)

    # If no token records yet, estimate from messages
    total_messages = await db.messages.count_documents({})
    if total_api_calls == 0 and total_messages > 0:
        # Estimate: avg 500 input tokens + 200 output tokens per message exchange
        estimated_input = (total_messages // 2) * 500  # Only count user messages
        estimated_output = (total_messages // 2) * 200
        total_input_tokens = estimated_input
        total_output_tokens = estimated_output
        # Estimate cost (assume no cache)
        total_api_cost = (
            (estimated_input / 1_000_000) * DEEPSEEK_PRICING["input_cache_miss"] +
            (estimated_output / 1_000_000) * DEEPSEEK_PRICING["output"]
        )
        total_api_calls = total_messages // 2

    avg_tokens_per_call = (total_input_tokens + total_output_tokens) / max(total_api_calls, 1)
    avg_cost_per_call = total_api_cost / max(total_api_calls, 1)

    # ===== COST PER COMPANY/USER =====

    # Get costs grouped by tenant
    cost_by_tenant_pipeline = [
        {"$group": {
            "_id": "$tenant_id",
            "total_cost": {"$sum": "$total_cost"},
            "total_tokens": {"$sum": "$total_tokens"},
            "call_count": {"$sum": 1}
        }},
        {"$sort": {"total_cost": -1}}
    ]

    costs_by_tenant = []
    if token_records:
        costs_by_tenant = await db.token_usage.aggregate(cost_by_tenant_pipeline).to_list(100)
    else:
        # Estimate from messages if no token records
        msg_by_tenant_pipeline = [
            {"$match": {"role": "user"}},
            {"$group": {
                "_id": "$tenant_id",
                "message_count": {"$sum": 1}
            }},
            {"$sort": {"message_count": -1}}
        ]
        msg_by_tenant = await db.messages.aggregate(msg_by_tenant_pipeline).to_list(100)
        for item in msg_by_tenant:
            estimated_cost = item["message_count"] * 0.0005  # ~$0.0005 per message estimate
            costs_by_tenant.append({
                "_id": item["_id"],
                "total_cost": estimated_cost,
                "total_tokens": item["message_count"] * 700,
                "call_count": item["message_count"]
            })

    # Enrich with user info
    top_cost_users = []
    for item in costs_by_tenant[:10]:
        user = await db.users.find_one({"_id": item["_id"]})
        if user:
            top_cost_users.append({
                "user_id": item["_id"],
                "email": user.get("email", "Unknown"),
                "company": user.get("company_name", "N/A"),
                "total_cost": round(item["total_cost"], 4),
                "total_tokens": item["total_tokens"],
                "call_count": item["call_count"],
                "avg_cost_per_call": round(item["total_cost"] / max(item["call_count"], 1), 6)
            })

    # ===== DAILY COST TREND =====

    daily_costs = []
    for i in range(30):
        date = datetime.utcnow() - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        # Get actual token costs for the day
        day_records = [r for r in token_records
                      if r.get("timestamp") and start_of_day <= r["timestamp"] < end_of_day]

        day_cost = sum(r.get("total_cost", 0) for r in day_records)
        day_tokens = sum(r.get("total_tokens", 0) for r in day_records)
        day_calls = len(day_records)

        # If no records, estimate from messages
        if day_calls == 0:
            day_messages = await db.messages.count_documents({
                "timestamp": {"$gte": start_of_day, "$lt": end_of_day},
                "role": "user"
            })
            day_cost = day_messages * 0.0005
            day_tokens = day_messages * 700
            day_calls = day_messages

        daily_costs.append({
            "date": start_of_day.strftime("%Y-%m-%d"),
            "api_cost": round(day_cost, 4),
            "tokens": day_tokens,
            "calls": day_calls
        })

    daily_costs.reverse()

    # ===== COST BREAKDOWN =====

    # Calculate input vs output costs
    input_cost = (
        (total_cached_tokens / 1_000_000) * DEEPSEEK_PRICING["input_cache_hit"] +
        ((total_input_tokens - total_cached_tokens) / 1_000_000) * DEEPSEEK_PRICING["input_cache_miss"]
    )
    output_cost = (total_output_tokens / 1_000_000) * DEEPSEEK_PRICING["output"]

    # ===== MONTHLY PROJECTIONS =====

    # Calculate monthly API cost projection
    days_with_data = len([d for d in daily_costs if d["api_cost"] > 0])
    if days_with_data > 0:
        avg_daily_api_cost = sum(d["api_cost"] for d in daily_costs) / days_with_data
        monthly_api_projection = avg_daily_api_cost * 30
    else:
        monthly_api_projection = 0

    total_monthly_cost = monthly_api_projection + SERVER_MONTHLY_COST

    # ===== USER/COMPANY METRICS =====

    total_users = await db.users.count_documents({})
    total_companies = await db.users.count_documents({"company_name": {"$exists": True, "$ne": None}})

    # Cost per user/company
    cost_per_user = total_api_cost / max(total_users, 1)
    cost_per_active_user = total_api_cost / max(len(costs_by_tenant), 1) if costs_by_tenant else 0

    # ===== PRICING TIER RECOMMENDATIONS =====

    # Analyze usage patterns to recommend pricing
    # Group users by usage level
    usage_levels = {
        "light": 0,      # < 100 messages/month
        "moderate": 0,   # 100-500 messages/month
        "heavy": 0,      # 500-2000 messages/month
        "enterprise": 0  # > 2000 messages/month
    }

    month_ago = datetime.utcnow() - timedelta(days=30)
    user_msg_pipeline = [
        {"$match": {"timestamp": {"$gte": month_ago}, "role": "user"}},
        {"$group": {"_id": "$tenant_id", "count": {"$sum": 1}}}
    ]
    user_msg_counts = await db.messages.aggregate(user_msg_pipeline).to_list(1000)

    for user in user_msg_counts:
        count = user["count"]
        if count < 100:
            usage_levels["light"] += 1
        elif count < 500:
            usage_levels["moderate"] += 1
        elif count < 2000:
            usage_levels["heavy"] += 1
        else:
            usage_levels["enterprise"] += 1

    # Calculate recommended pricing based on costs
    # Add margin for profit
    margin = 3.0  # 300% margin for healthy profit

    # Light users: ~50 messages/month avg = ~$0.025 cost
    light_cost = 50 * 0.0005
    light_recommended_price = max(light_cost * margin, 0)  # Free tier

    # Moderate users: ~300 messages/month = ~$0.15 cost
    moderate_cost = 300 * 0.0005
    moderate_recommended_price = max(moderate_cost * margin, 5)

    # Heavy users: ~1000 messages/month = ~$0.50 cost
    heavy_cost = 1000 * 0.0005
    heavy_recommended_price = max(heavy_cost * margin, 15)

    # Enterprise: ~5000 messages/month = ~$2.50 cost
    enterprise_cost = 5000 * 0.0005
    enterprise_recommended_price = max(enterprise_cost * margin, 49)

    pricing_recommendations = {
        "free_tier": {
            "name": "Free",
            "limits": {
                "chatbots": 1,
                "documents_per_bot": 5,
                "messages_per_day": 50
            },
            "estimated_cost_per_user": round(light_cost, 4),
            "recommended_price": 0,
            "margin": "N/A (loss leader)"
        },
        "starter_tier": {
            "name": "Starter",
            "limits": {
                "chatbots": 3,
                "documents_per_bot": 20,
                "messages_per_day": 200
            },
            "estimated_cost_per_user": round(moderate_cost, 4),
            "recommended_price": 9,
            "margin": f"{round((9 - moderate_cost) / moderate_cost * 100)}%"
        },
        "pro_tier": {
            "name": "Pro",
            "limits": {
                "chatbots": 10,
                "documents_per_bot": 50,
                "messages_per_day": 1000
            },
            "estimated_cost_per_user": round(heavy_cost, 4),
            "recommended_price": 29,
            "margin": f"{round((29 - heavy_cost) / heavy_cost * 100)}%"
        },
        "enterprise_tier": {
            "name": "Enterprise",
            "limits": {
                "chatbots": "Unlimited",
                "documents_per_bot": "Unlimited",
                "messages_per_day": "Unlimited"
            },
            "estimated_cost_per_user": round(enterprise_cost, 4),
            "recommended_price": 99,
            "margin": f"{round((99 - enterprise_cost) / enterprise_cost * 100)}%"
        }
    }

    # ===== BREAK-EVEN ANALYSIS =====

    # How many paid users needed to cover server costs
    users_needed_for_breakeven = {
        "starter_at_9": math.ceil(SERVER_MONTHLY_COST / 9),
        "pro_at_29": math.ceil(SERVER_MONTHLY_COST / 29),
        "enterprise_at_99": math.ceil(SERVER_MONTHLY_COST / 99)
    }

    # Revenue projections based on user distribution
    projected_monthly_revenue = (
        usage_levels["moderate"] * 9 +
        usage_levels["heavy"] * 29 +
        usage_levels["enterprise"] * 99
    ) * 0.1  # Assume 10% conversion rate

    return {
        "summary": {
            "total_api_cost": round(total_api_cost, 4),
            "server_monthly_cost": SERVER_MONTHLY_COST,
            "total_monthly_projection": round(total_monthly_cost, 2),
            "total_api_calls": total_api_calls,
            "total_tokens": total_input_tokens + total_output_tokens,
            "avg_cost_per_call": round(avg_cost_per_call, 6),
            "avg_tokens_per_call": round(avg_tokens_per_call, 0)
        },
        "cost_breakdown": {
            "input_tokens": total_input_tokens,
            "output_tokens": total_output_tokens,
            "cached_tokens": total_cached_tokens,
            "input_cost": round(input_cost, 4),
            "output_cost": round(output_cost, 4),
            "cache_savings": round(
                (total_cached_tokens / 1_000_000) *
                (DEEPSEEK_PRICING["input_cache_miss"] - DEEPSEEK_PRICING["input_cache_hit"]), 4
            )
        },
        "per_user_costs": {
            "total_users": total_users,
            "active_users": len(costs_by_tenant),
            "avg_cost_per_user": round(cost_per_user, 4),
            "avg_cost_per_active_user": round(cost_per_active_user, 4),
            "top_cost_users": top_cost_users
        },
        "daily_trend": daily_costs,
        "usage_distribution": usage_levels,
        "pricing_recommendations": pricing_recommendations,
        "break_even": {
            "server_cost": SERVER_MONTHLY_COST,
            "users_needed": users_needed_for_breakeven,
            "projected_revenue": round(projected_monthly_revenue, 2),
            "profit_projection": round(projected_monthly_revenue - total_monthly_cost, 2)
        },
        "api_pricing": {
            "provider": "DeepSeek",
            "model": "deepseek-chat",
            "input_per_million": DEEPSEEK_PRICING["input_cache_miss"],
            "input_cached_per_million": DEEPSEEK_PRICING["input_cache_hit"],
            "output_per_million": DEEPSEEK_PRICING["output"]
        }
    }


# ==================== SERVER MONITORING ====================

@router.get("/server/status")
async def get_server_status(current_admin: dict = Depends(get_current_admin)):
    """Get server capacity utilization and upgrade recommendations"""
    import psutil
    import os

    db = get_mongodb()

    # ===== SYSTEM RESOURCES =====

    # CPU
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()

    # Memory
    memory = psutil.virtual_memory()
    memory_total_gb = round(memory.total / (1024**3), 2)
    memory_used_gb = round(memory.used / (1024**3), 2)
    memory_percent = memory.percent

    # Disk
    disk = psutil.disk_usage('/')
    disk_total_gb = round(disk.total / (1024**3), 2)
    disk_used_gb = round(disk.used / (1024**3), 2)
    disk_percent = disk.percent

    # Swap
    swap = psutil.swap_memory()
    swap_total_gb = round(swap.total / (1024**3), 2)
    swap_used_gb = round(swap.used / (1024**3), 2)
    swap_percent = swap.percent if swap.total > 0 else 0

    # ===== APPLICATION METRICS =====

    # Database sizes
    total_users = await db.users.count_documents({})
    total_chatbots = await db.chatbots.count_documents({})
    total_documents = await db.documents.count_documents({})
    total_messages = await db.messages.count_documents({})
    total_chunks = await db.chunks.count_documents({})
    total_conversations = await db.conversations.count_documents({})

    # Get collection sizes (estimate)
    db_stats = await db.command("dbStats")
    db_size_mb = round(db_stats.get("dataSize", 0) / (1024**2), 2)

    # ===== CAPACITY ANALYSIS =====

    # Define thresholds
    CPU_WARNING = 70
    CPU_CRITICAL = 85
    MEMORY_WARNING = 75
    MEMORY_CRITICAL = 90
    DISK_WARNING = 70
    DISK_CRITICAL = 85

    # Estimate growth and capacity
    # Assume: 1 user = 2 chatbots avg, 1 chatbot = 10 docs avg, 1 doc = 100 chunks avg
    estimated_users_capacity = int((disk_total_gb - disk_used_gb) * 1000 / 0.5)  # ~0.5MB per user with all data
    estimated_messages_capacity = int((disk_total_gb - disk_used_gb) * 1000000 / 0.001)  # ~1KB per message

    # Calculate health scores (0-100)
    cpu_health = max(0, 100 - cpu_percent)
    memory_health = max(0, 100 - memory_percent)
    disk_health = max(0, 100 - disk_percent)
    overall_health = round((cpu_health + memory_health + disk_health) / 3)

    # ===== UPGRADE RECOMMENDATIONS =====

    recommendations = []
    upgrade_needed = False
    upgrade_urgency = "none"  # none, low, medium, high, critical

    # CPU analysis
    if cpu_percent >= CPU_CRITICAL:
        recommendations.append({
            "component": "CPU",
            "status": "critical",
            "message": f"CPU usage at {cpu_percent}% - Server is overloaded",
            "action": "Upgrade to more CPU cores or optimize heavy processes"
        })
        upgrade_needed = True
        upgrade_urgency = "critical"
    elif cpu_percent >= CPU_WARNING:
        recommendations.append({
            "component": "CPU",
            "status": "warning",
            "message": f"CPU usage at {cpu_percent}% - Getting high",
            "action": "Monitor closely, plan upgrade if growth continues"
        })
        if upgrade_urgency not in ["critical", "high"]:
            upgrade_urgency = "medium"
    else:
        recommendations.append({
            "component": "CPU",
            "status": "healthy",
            "message": f"CPU usage at {cpu_percent}% - Running smoothly",
            "action": "No action needed"
        })

    # Memory analysis
    if memory_percent >= MEMORY_CRITICAL:
        recommendations.append({
            "component": "Memory",
            "status": "critical",
            "message": f"Memory usage at {memory_percent}% ({memory_used_gb}GB/{memory_total_gb}GB)",
            "action": "Urgent: Add more RAM or upgrade server"
        })
        upgrade_needed = True
        upgrade_urgency = "critical"
    elif memory_percent >= MEMORY_WARNING:
        recommendations.append({
            "component": "Memory",
            "status": "warning",
            "message": f"Memory usage at {memory_percent}% ({memory_used_gb}GB/{memory_total_gb}GB)",
            "action": "Consider adding more RAM"
        })
        upgrade_needed = True
        if upgrade_urgency not in ["critical"]:
            upgrade_urgency = "high"
    else:
        recommendations.append({
            "component": "Memory",
            "status": "healthy",
            "message": f"Memory usage at {memory_percent}% ({memory_used_gb}GB/{memory_total_gb}GB)",
            "action": "No action needed"
        })

    # Disk analysis
    if disk_percent >= DISK_CRITICAL:
        recommendations.append({
            "component": "Disk",
            "status": "critical",
            "message": f"Disk usage at {disk_percent}% ({disk_used_gb}GB/{disk_total_gb}GB)",
            "action": "Urgent: Expand storage or clean up data"
        })
        upgrade_needed = True
        upgrade_urgency = "critical"
    elif disk_percent >= DISK_WARNING:
        recommendations.append({
            "component": "Disk",
            "status": "warning",
            "message": f"Disk usage at {disk_percent}% ({disk_used_gb}GB/{disk_total_gb}GB)",
            "action": "Plan storage expansion soon"
        })
        upgrade_needed = True
        if upgrade_urgency not in ["critical", "high"]:
            upgrade_urgency = "medium"
    else:
        recommendations.append({
            "component": "Disk",
            "status": "healthy",
            "message": f"Disk usage at {disk_percent}% ({disk_used_gb}GB/{disk_total_gb}GB)",
            "action": "No action needed"
        })

    # Swap analysis
    if swap_percent > 50:
        recommendations.append({
            "component": "Swap",
            "status": "warning",
            "message": f"High swap usage ({swap_percent}%) indicates memory pressure",
            "action": "Consider adding more RAM"
        })
        if upgrade_urgency == "none":
            upgrade_urgency = "low"

    # Database growth projection
    if total_users > 0:
        avg_data_per_user = db_size_mb / total_users if total_users > 0 else 0.5
        users_until_disk_full = int((disk_total_gb * 1024 - db_size_mb) / max(avg_data_per_user, 0.1))

        if users_until_disk_full < 100:
            recommendations.append({
                "component": "Database",
                "status": "warning",
                "message": f"Database can handle ~{users_until_disk_full} more users before disk is full",
                "action": "Plan storage expansion"
            })
        else:
            recommendations.append({
                "component": "Database",
                "status": "healthy",
                "message": f"Database can handle ~{users_until_disk_full} more users",
                "action": "Capacity is sufficient"
            })

    # Overall recommendation
    if upgrade_urgency == "critical":
        overall_recommendation = "Immediate server upgrade required"
    elif upgrade_urgency == "high":
        overall_recommendation = "Server upgrade recommended within 1-2 weeks"
    elif upgrade_urgency == "medium":
        overall_recommendation = "Monitor closely, plan upgrade for next month"
    elif upgrade_urgency == "low":
        overall_recommendation = "Server is adequate, review in 3 months"
    else:
        overall_recommendation = "Server capacity is healthy, no upgrade needed"

    # ===== SCALING TIERS =====

    # Suggest next tier based on current usage
    scaling_tiers = [
        {
            "name": "Current",
            "specs": f"{cpu_count} vCPU, {memory_total_gb}GB RAM, {disk_total_gb}GB Disk",
            "monthly_cost": 24,
            "max_users": estimated_users_capacity,
            "status": "active"
        },
        {
            "name": "Small Upgrade",
            "specs": "2 vCPU, 4GB RAM, 80GB Disk",
            "monthly_cost": 48,
            "max_users": 2000,
            "status": "recommended" if upgrade_urgency in ["low", "medium"] else "available"
        },
        {
            "name": "Medium Upgrade",
            "specs": "4 vCPU, 8GB RAM, 160GB Disk",
            "monthly_cost": 96,
            "max_users": 5000,
            "status": "recommended" if upgrade_urgency in ["high"] else "available"
        },
        {
            "name": "Large Upgrade",
            "specs": "8 vCPU, 16GB RAM, 320GB Disk",
            "monthly_cost": 192,
            "max_users": 15000,
            "status": "recommended" if upgrade_urgency in ["critical"] else "available"
        }
    ]

    return {
        "system": {
            "cpu": {
                "usage_percent": cpu_percent,
                "cores": cpu_count,
                "frequency_mhz": round(cpu_freq.current, 0) if cpu_freq else None,
                "health": "critical" if cpu_percent >= CPU_CRITICAL else "warning" if cpu_percent >= CPU_WARNING else "healthy"
            },
            "memory": {
                "total_gb": memory_total_gb,
                "used_gb": memory_used_gb,
                "available_gb": round(memory_total_gb - memory_used_gb, 2),
                "usage_percent": memory_percent,
                "health": "critical" if memory_percent >= MEMORY_CRITICAL else "warning" if memory_percent >= MEMORY_WARNING else "healthy"
            },
            "disk": {
                "total_gb": disk_total_gb,
                "used_gb": disk_used_gb,
                "available_gb": round(disk_total_gb - disk_used_gb, 2),
                "usage_percent": disk_percent,
                "health": "critical" if disk_percent >= DISK_CRITICAL else "warning" if disk_percent >= DISK_WARNING else "healthy"
            },
            "swap": {
                "total_gb": swap_total_gb,
                "used_gb": swap_used_gb,
                "usage_percent": swap_percent
            }
        },
        "application": {
            "users": total_users,
            "chatbots": total_chatbots,
            "documents": total_documents,
            "messages": total_messages,
            "chunks": total_chunks,
            "conversations": total_conversations,
            "database_size_mb": db_size_mb
        },
        "health": {
            "overall_score": overall_health,
            "cpu_score": cpu_health,
            "memory_score": memory_health,
            "disk_score": disk_health
        },
        "capacity": {
            "estimated_users_remaining": estimated_users_capacity,
            "estimated_messages_remaining": estimated_messages_capacity,
            "growth_headroom": "high" if overall_health > 70 else "medium" if overall_health > 40 else "low"
        },
        "upgrade": {
            "needed": upgrade_needed,
            "urgency": upgrade_urgency,
            "overall_recommendation": overall_recommendation,
            "recommendations": recommendations
        },
        "scaling_tiers": scaling_tiers
    }


# ==================== AUDIT LOGS ====================

@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    current_admin: dict = Depends(get_current_admin)
):
    """Get audit logs (admin actions)"""
    db = get_mongodb()

    total = await db.audit_logs.count_documents({})
    pages = math.ceil(total / per_page) if total > 0 else 1

    skip = (page - 1) * per_page
    cursor = db.audit_logs.find({}).skip(skip).limit(per_page).sort("timestamp", -1)
    logs = await cursor.to_list(length=per_page)

    return {
        "items": [
            {
                "id": str(log.get("_id")),
                "admin_id": log.get("admin_id"),
                "admin_email": log.get("admin_email"),
                "action": log.get("action"),
                "resource_type": log.get("resource_type"),
                "resource_id": log.get("resource_id"),
                "details": log.get("details"),
                "timestamp": log.get("timestamp")
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages
    }
