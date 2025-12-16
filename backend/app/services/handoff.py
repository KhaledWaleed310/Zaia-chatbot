from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid
import json
from ..core.database import get_mongodb, get_redis
from ..schemas.handoff import HandoffStatus, HandoffPriority, HandoffTrigger


async def create_handoff(
    session_id: str,
    bot_id: str,
    tenant_id: str,
    trigger: HandoffTrigger = HandoffTrigger.USER_REQUEST,
    trigger_reason: Optional[str] = None,
    priority: HandoffPriority = HandoffPriority.MEDIUM,
    visitor_info: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Create a new handoff request."""
    db = get_mongodb()

    # Check if there's already an active handoff for this session
    existing = await db.handoffs.find_one({
        "session_id": session_id,
        "status": {"$in": [HandoffStatus.PENDING.value, HandoffStatus.ASSIGNED.value, HandoffStatus.ACTIVE.value]}
    })

    if existing:
        return existing

    # Get conversation history for context
    conversation = await db.conversations.find_one({"session_id": session_id})
    messages = conversation.get("messages", [])[-20:] if conversation else []

    handoff = {
        "_id": str(uuid.uuid4()),
        "session_id": session_id,
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "status": HandoffStatus.PENDING.value,
        "priority": priority.value,
        "trigger": trigger.value,
        "trigger_reason": trigger_reason,
        "assigned_to": None,
        "assigned_to_name": None,
        "visitor_info": visitor_info or {},
        "messages": [],  # Agent-visitor messages during handoff
        "conversation_context": messages,  # Bot conversation before handoff
        "notes": None,
        "resolution": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "assigned_at": None,
        "resolved_at": None
    }

    await db.handoffs.insert_one(handoff)

    # Try auto-assign if configured
    bot = await db.chatbots.find_one({"_id": bot_id})
    handoff_config = bot.get("handoff_config", {}) if bot else {}

    if handoff_config.get("auto_assign", True):
        await try_auto_assign(handoff["_id"], tenant_id)

    # Publish to Redis for real-time notifications
    redis = get_redis()
    await redis.publish(
        f"handoff:{tenant_id}",
        json.dumps({
            "type": "new_handoff",
            "handoff_id": handoff["_id"],
            "bot_id": bot_id,
            "priority": priority.value
        })
    )

    return handoff


async def try_auto_assign(handoff_id: str, tenant_id: str) -> bool:
    """Try to auto-assign handoff to an available agent."""
    db = get_mongodb()
    redis = get_redis()

    # Get online agents with capacity
    agents_key = f"agents:{tenant_id}"
    agents_data = await redis.hgetall(agents_key)

    available_agents = []
    for user_id, data_str in agents_data.items():
        data = json.loads(data_str)
        if data.get("status") == "online" and data.get("active_handoffs", 0) < data.get("max_concurrent", 5):
            available_agents.append({
                "user_id": user_id,
                "active_handoffs": data.get("active_handoffs", 0)
            })

    if not available_agents:
        return False

    # Assign to agent with least handoffs
    available_agents.sort(key=lambda x: x["active_handoffs"])
    agent = available_agents[0]

    # Get agent name
    user = await db.users.find_one({"_id": agent["user_id"]})
    agent_name = user.get("name", "Agent") if user else "Agent"

    # Update handoff
    await db.handoffs.update_one(
        {"_id": handoff_id},
        {
            "$set": {
                "status": HandoffStatus.ASSIGNED.value,
                "assigned_to": agent["user_id"],
                "assigned_to_name": agent_name,
                "assigned_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Update agent's active count in Redis
    agent_data = json.loads(agents_data.get(agent["user_id"], "{}"))
    agent_data["active_handoffs"] = agent_data.get("active_handoffs", 0) + 1
    await redis.hset(agents_key, agent["user_id"], json.dumps(agent_data))

    return True


async def get_handoff(handoff_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """Get a handoff by ID."""
    db = get_mongodb()
    return await db.handoffs.find_one({"_id": handoff_id, "tenant_id": tenant_id})


async def get_handoff_by_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get active handoff for a session."""
    db = get_mongodb()
    return await db.handoffs.find_one({
        "session_id": session_id,
        "status": {"$in": [HandoffStatus.PENDING.value, HandoffStatus.ASSIGNED.value, HandoffStatus.ACTIVE.value]}
    })


async def list_handoffs(
    tenant_id: str,
    bot_id: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    page: int = 1,
    per_page: int = 20
) -> Dict[str, Any]:
    """List handoffs with filtering."""
    db = get_mongodb()

    query = {"tenant_id": tenant_id}
    if bot_id:
        query["bot_id"] = bot_id
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to

    total = await db.handoffs.count_documents(query)
    pages = (total + per_page - 1) // per_page

    skip = (page - 1) * per_page
    handoffs = await db.handoffs.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)

    # Calculate times
    for h in handoffs:
        h["wait_time_seconds"] = None
        h["handle_time_seconds"] = None

        if h.get("assigned_at") and h.get("created_at"):
            h["wait_time_seconds"] = int((h["assigned_at"] - h["created_at"]).total_seconds())

        if h.get("resolved_at") and h.get("assigned_at"):
            h["handle_time_seconds"] = int((h["resolved_at"] - h["assigned_at"]).total_seconds())

    return {
        "items": handoffs,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages
    }


async def update_handoff(
    handoff_id: str,
    tenant_id: str,
    data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update a handoff."""
    db = get_mongodb()

    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    # Handle status changes
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status in [HandoffStatus.RESOLVED.value, HandoffStatus.ABANDONED.value]:
            update_data["resolved_at"] = datetime.utcnow()

    result = await db.handoffs.find_one_and_update(
        {"_id": handoff_id, "tenant_id": tenant_id},
        {"$set": update_data},
        return_document=True
    )

    return result


async def add_handoff_message(
    handoff_id: str,
    content: str,
    sender_type: str,
    sender_id: Optional[str] = None,
    sender_name: Optional[str] = None
) -> Dict[str, Any]:
    """Add a message to the handoff conversation."""
    db = get_mongodb()
    redis = get_redis()

    message = {
        "id": str(uuid.uuid4()),
        "content": content,
        "sender_type": sender_type,  # "agent" or "visitor"
        "sender_id": sender_id,
        "sender_name": sender_name,
        "timestamp": datetime.utcnow().isoformat()
    }

    handoff = await db.handoffs.find_one_and_update(
        {"_id": handoff_id},
        {
            "$push": {"messages": message},
            "$set": {"updated_at": datetime.utcnow()}
        },
        return_document=True
    )

    # Publish for real-time
    if handoff:
        await redis.publish(
            f"handoff:{handoff['tenant_id']}:{handoff_id}",
            json.dumps({
                "type": "message",
                "message": message
            })
        )

    return message


async def update_agent_presence(
    tenant_id: str,
    user_id: str,
    status: str,
    max_concurrent: int = 5
):
    """Update agent's online status."""
    redis = get_redis()

    agents_key = f"agents:{tenant_id}"
    current = await redis.hget(agents_key, user_id)

    data = json.loads(current) if current else {}
    data["status"] = status
    data["max_concurrent"] = max_concurrent
    data["last_seen"] = datetime.utcnow().isoformat()

    if "active_handoffs" not in data:
        data["active_handoffs"] = 0

    await redis.hset(agents_key, user_id, json.dumps(data))

    # Set expiry on the agent key (auto-offline after 5 minutes of no updates)
    await redis.expire(agents_key, 300)


async def get_agents_status(tenant_id: str) -> List[Dict[str, Any]]:
    """Get status of all agents."""
    redis = get_redis()
    db = get_mongodb()

    agents_key = f"agents:{tenant_id}"
    agents_data = await redis.hgetall(agents_key)

    result = []
    for user_id, data_str in agents_data.items():
        data = json.loads(data_str)
        user = await db.users.find_one({"_id": user_id})
        result.append({
            "user_id": user_id,
            "name": user.get("name", "Unknown") if user else "Unknown",
            "email": user.get("email") if user else None,
            **data
        })

    return result


async def get_handoff_stats(tenant_id: str, bot_id: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
    """Get handoff statistics."""
    db = get_mongodb()
    start_date = datetime.utcnow() - timedelta(days=days)

    query = {"tenant_id": tenant_id}
    if bot_id:
        query["bot_id"] = bot_id

    # Total counts by status
    status_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]

    status_counts = {}
    async for doc in db.handoffs.aggregate(status_pipeline):
        status_counts[doc["_id"]] = doc["count"]

    # By trigger
    trigger_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$trigger", "count": {"$sum": 1}}}
    ]

    trigger_counts = {}
    async for doc in db.handoffs.aggregate(trigger_pipeline):
        trigger_counts[doc["_id"]] = doc["count"]

    # By priority
    priority_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]

    priority_counts = {}
    async for doc in db.handoffs.aggregate(priority_pipeline):
        priority_counts[doc["_id"]] = doc["count"]

    # Resolved today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_today = await db.handoffs.count_documents({
        **query,
        "status": HandoffStatus.RESOLVED.value,
        "resolved_at": {"$gte": today_start}
    })

    # Average times
    time_pipeline = [
        {"$match": {**query, "resolved_at": {"$exists": True}}},
        {"$project": {
            "wait_time": {"$subtract": ["$assigned_at", "$created_at"]},
            "handle_time": {"$subtract": ["$resolved_at", "$assigned_at"]}
        }},
        {"$group": {
            "_id": None,
            "avg_wait": {"$avg": "$wait_time"},
            "avg_handle": {"$avg": "$handle_time"}
        }}
    ]

    avg_times = {"avg_wait": 0, "avg_handle": 0}
    async for doc in db.handoffs.aggregate(time_pipeline):
        avg_times["avg_wait"] = (doc.get("avg_wait") or 0) / 1000  # Convert to seconds
        avg_times["avg_handle"] = (doc.get("avg_handle") or 0) / 1000

    total = sum(status_counts.values())

    return {
        "total_handoffs": total,
        "pending": status_counts.get(HandoffStatus.PENDING.value, 0),
        "active": status_counts.get(HandoffStatus.ACTIVE.value, 0) + status_counts.get(HandoffStatus.ASSIGNED.value, 0),
        "resolved_today": resolved_today,
        "avg_wait_time_seconds": avg_times["avg_wait"],
        "avg_handle_time_seconds": avg_times["avg_handle"],
        "by_trigger": trigger_counts,
        "by_priority": priority_counts
    }


async def check_handoff_triggers(
    message: str,
    session_id: str,
    bot_id: str,
    tenant_id: str,
    sentiment_score: float = 0,
    unanswered_count: int = 0
) -> Optional[Dict[str, Any]]:
    """Check if message should trigger handoff based on config."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        return None

    config = bot.get("handoff_config", {})
    if not config.get("enabled", False):
        return None

    # Check keywords
    keywords = config.get("keywords", [])
    message_lower = message.lower()
    for keyword in keywords:
        if keyword.lower() in message_lower:
            return await create_handoff(
                session_id=session_id,
                bot_id=bot_id,
                tenant_id=tenant_id,
                trigger=HandoffTrigger.KEYWORD,
                trigger_reason=f"Matched keyword: {keyword}",
                priority=HandoffPriority.HIGH
            )

    # Check sentiment
    sentiment_threshold = config.get("sentiment_threshold", -0.5)
    if sentiment_score < sentiment_threshold:
        return await create_handoff(
            session_id=session_id,
            bot_id=bot_id,
            tenant_id=tenant_id,
            trigger=HandoffTrigger.SENTIMENT,
            trigger_reason=f"Negative sentiment: {sentiment_score}",
            priority=HandoffPriority.HIGH
        )

    # Check unanswered count
    unanswered_threshold = config.get("unanswered_count_threshold", 3)
    if unanswered_count >= unanswered_threshold:
        return await create_handoff(
            session_id=session_id,
            bot_id=bot_id,
            tenant_id=tenant_id,
            trigger=HandoffTrigger.UNANSWERED,
            trigger_reason=f"Unanswered questions: {unanswered_count}",
            priority=HandoffPriority.MEDIUM
        )

    return None


async def create_booking_handoff(
    session_id: str,
    bot_id: str,
    tenant_id: str,
    booking_details: Dict[str, Any],
    conversation_context: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a booking-type handoff to notify agents of a new booking request.

    Unlike regular handoffs, this includes structured booking details
    and uses the BOOKING trigger type for easy identification in the dashboard.

    Args:
        session_id: Chat session ID
        bot_id: Chatbot ID
        tenant_id: Tenant ID
        booking_details: Extracted booking information:
            - booking_type: str (room, meeting, table, appointment, service, event, other)
            - guest_name: str
            - phone: str
            - date: str
            - time: str
            - people_count: int (optional)
            - purpose: str (optional)
            - duration: str (optional)
            - extras: list (optional)
            - notes: str (optional)
        conversation_context: Last N messages from conversation before booking

    Returns:
        Created handoff document
    """
    db = get_mongodb()
    redis = get_redis()

    # Check if there's already an active handoff for this session
    existing = await db.handoffs.find_one({
        "session_id": session_id,
        "status": {"$in": [HandoffStatus.PENDING.value, HandoffStatus.ASSIGNED.value, HandoffStatus.ACTIVE.value]}
    })

    if existing:
        # Update existing handoff with booking details
        await db.handoffs.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "booking_details": booking_details,
                    "trigger": HandoffTrigger.BOOKING.value,
                    "trigger_reason": f"Booking request from {booking_details.get('guest_name')}",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        existing["booking_details"] = booking_details
        return existing

    handoff_id = str(uuid.uuid4())
    booking_type = booking_details.get("booking_type", "booking").title()
    guest_name = booking_details.get("guest_name", "Guest")

    handoff = {
        "_id": handoff_id,
        "session_id": session_id,
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "status": HandoffStatus.PENDING.value,
        "priority": HandoffPriority.HIGH.value,  # Bookings are high priority
        "trigger": HandoffTrigger.BOOKING.value,
        "trigger_reason": f"{booking_type} booking request from {guest_name}",
        "assigned_to": None,
        "assigned_to_name": None,
        "visitor_info": {
            "name": guest_name,
            "phone": booking_details.get("phone")
        },
        "booking_details": booking_details,  # Store full booking details
        "messages": [],
        "conversation_context": conversation_context or [],
        "notes": None,
        "resolution": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "assigned_at": None,
        "resolved_at": None
    }

    await db.handoffs.insert_one(handoff)

    # Try auto-assign if configured
    bot = await db.chatbots.find_one({"_id": bot_id})
    handoff_config = bot.get("handoff_config", {}) if bot else {}

    if handoff_config.get("auto_assign", True):
        await try_auto_assign(handoff_id, tenant_id)

    # Publish to Redis for real-time notifications
    await redis.publish(
        f"handoff:{tenant_id}",
        json.dumps({
            "type": "new_booking",
            "handoff_id": handoff_id,
            "bot_id": bot_id,
            "booking_details": booking_details,
            "priority": HandoffPriority.HIGH.value
        })
    )

    return handoff
