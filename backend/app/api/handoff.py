from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from typing import Optional, Any
import json
from datetime import datetime
from ..schemas.handoff import (
    HandoffConfig, HandoffRequest, HandoffCreate, HandoffUpdate,
    HandoffMessage, HandoffResponse, HandoffListResponse, HandoffStats,
    AgentPresence, AgentStatus
)
from ..services.handoff import (
    create_handoff, get_handoff, get_handoff_by_session, list_handoffs,
    update_handoff, add_handoff_message, update_agent_presence,
    get_agents_status, get_handoff_stats, check_handoff_triggers
)
from ..api.auth import get_current_user
from ..core.database import get_mongodb, get_redis
from ..schemas.handoff import HandoffTrigger, HandoffPriority

router = APIRouter(prefix="/handoff", tags=["Handoff"])


def serialize_for_json(obj: Any) -> Any:
    """Recursively serialize objects for JSON, converting datetime to ISO string."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    return obj


def handoff_to_response(h: dict) -> dict:
    """Convert DB handoff to response format."""
    return {
        "id": h["_id"],
        "session_id": h["session_id"],
        "bot_id": h["bot_id"],
        "tenant_id": h["tenant_id"],
        "status": h.get("status", "pending"),
        "priority": h.get("priority", "medium"),
        "trigger": h.get("trigger", "user_request"),
        "trigger_reason": h.get("trigger_reason"),
        "assigned_to": h.get("assigned_to"),
        "assigned_to_name": h.get("assigned_to_name"),
        "visitor_info": h.get("visitor_info", {}),
        "messages": h.get("messages", []),
        "conversation_context": h.get("conversation_context", []),  # Bot conversation before handoff
        "notes": h.get("notes"),
        "resolution": h.get("resolution"),
        "created_at": h["created_at"],
        "updated_at": h["updated_at"],
        "resolved_at": h.get("resolved_at"),
        "wait_time_seconds": h.get("wait_time_seconds"),
        "handle_time_seconds": h.get("handle_time_seconds")
    }


@router.get("/{bot_id}", response_model=HandoffListResponse)
async def list_bot_handoffs(
    bot_id: str,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    user: dict = Depends(get_current_user)
):
    """List handoffs for a chatbot."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    result = await list_handoffs(
        tenant_id=user["tenant_id"],
        bot_id=bot_id,
        status=status,
        page=page,
        per_page=per_page
    )

    return HandoffListResponse(
        items=[handoff_to_response(h) for h in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        pages=result["pages"]
    )


@router.get("/{bot_id}/stats", response_model=HandoffStats)
async def get_bot_handoff_stats(
    bot_id: str,
    days: int = 30,
    user: dict = Depends(get_current_user)
):
    """Get handoff statistics for a chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    return await get_handoff_stats(user["tenant_id"], bot_id, days)


@router.get("/{bot_id}/config")
async def get_handoff_config(
    bot_id: str,
    user: dict = Depends(get_current_user)
):
    """Get handoff configuration for a chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    return bot.get("handoff_config") or {
        "enabled": False,
        "keywords": ["speak to human", "talk to agent", "human please", "real person"],
        "sentiment_threshold": -0.5,
        "unanswered_count_threshold": 3,
        "auto_assign": True,
        "notification_email": None,
        "working_hours": None,
        "offline_message": "Our team is currently offline. Please leave your contact info and we'll get back to you."
    }


@router.put("/{bot_id}/config")
async def update_handoff_config(
    bot_id: str,
    config: HandoffConfig,
    user: dict = Depends(get_current_user)
):
    """Update handoff configuration for a chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get existing config and merge with updates
    existing_config = bot.get("handoff_config") or {
        "enabled": False,
        "keywords": ["speak to human", "talk to agent", "human please", "real person"],
        "sentiment_threshold": -0.5,
        "unanswered_count_threshold": 3,
        "auto_assign": True,
        "notification_email": None,
        "working_hours": None,
        "offline_message": "Our team is currently offline. Please leave your contact info and we'll get back to you."
    }

    # Merge updates (only update non-None values)
    update_data = config.model_dump(exclude_unset=True, exclude_none=True)
    merged_config = {**existing_config, **update_data}

    await db.chatbots.update_one(
        {"_id": bot_id},
        {"$set": {"handoff_config": merged_config}}
    )

    return merged_config


# Public endpoint to get handoff config (no auth required) - MUST be before /{bot_id}/{handoff_id}
@router.get("/{bot_id}/public-config")
async def get_public_handoff_config(bot_id: str):
    """Public endpoint to get handoff config for chat widget."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    config = bot.get("handoff_config") or {"enabled": False}
    # Only return minimal config for widget
    return {
        "enabled": config.get("enabled", False),
        "offline_message": config.get("offline_message", "Our team is currently offline.")
    }


@router.get("/{bot_id}/{handoff_id}", response_model=HandoffResponse)
async def get_single_handoff(
    bot_id: str,
    handoff_id: str,
    user: dict = Depends(get_current_user)
):
    """Get a single handoff by ID."""
    handoff = await get_handoff(handoff_id, user["tenant_id"])
    if not handoff or handoff["bot_id"] != bot_id:
        raise HTTPException(status_code=404, detail="Handoff not found")

    return handoff_to_response(handoff)


@router.patch("/{bot_id}/{handoff_id}", response_model=HandoffResponse)
async def update_single_handoff(
    bot_id: str,
    handoff_id: str,
    data: HandoffUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a handoff (status, assignment, notes)."""
    handoff = await get_handoff(handoff_id, user["tenant_id"])
    if not handoff or handoff["bot_id"] != bot_id:
        raise HTTPException(status_code=404, detail="Handoff not found")

    update_data = data.model_dump(exclude_unset=True)

    # If assigning, get agent name
    if "assigned_to" in update_data and update_data["assigned_to"]:
        db = get_mongodb()
        agent = await db.users.find_one({"_id": update_data["assigned_to"]})
        if agent:
            update_data["assigned_to_name"] = agent.get("name", "Agent")

    updated = await update_handoff(handoff_id, user["tenant_id"], update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Handoff not found")

    return handoff_to_response(updated)


@router.post("/{bot_id}/{handoff_id}/message")
async def send_handoff_message(
    bot_id: str,
    handoff_id: str,
    message: HandoffMessage,
    user: dict = Depends(get_current_user)
):
    """Send a message in the handoff conversation."""
    handoff = await get_handoff(handoff_id, user["tenant_id"])
    if not handoff or handoff["bot_id"] != bot_id:
        raise HTTPException(status_code=404, detail="Handoff not found")

    msg = await add_handoff_message(
        handoff_id=handoff_id,
        content=message.content,
        sender_type=message.sender_type,
        sender_id=user["id"],
        sender_name=user.get("name", "Agent")
    )

    # Broadcast to WebSocket connections (so visitor sees it immediately)
    await manager.broadcast(handoff_id, {
        "type": "message",
        "message": msg
    })

    return msg


# Agent presence endpoints
@router.post("/agents/presence")
async def update_presence(
    presence: AgentPresence,
    user: dict = Depends(get_current_user)
):
    """Update agent's online status."""
    await update_agent_presence(
        tenant_id=user["tenant_id"],
        user_id=user["id"],
        status=presence.status.value,
        max_concurrent=presence.max_concurrent
    )
    return {"status": "updated"}


@router.get("/agents/status")
async def get_all_agents_status(user: dict = Depends(get_current_user)):
    """Get status of all agents in tenant."""
    return await get_agents_status(user["tenant_id"])


# Public endpoint for visitors to request handoff
@router.post("/{bot_id}/request")
async def request_handoff(
    bot_id: str,
    request: HandoffRequest
):
    """Public endpoint for visitor to request human handoff."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Check if handoff is enabled
    config = bot.get("handoff_config", {})
    if not config.get("enabled", False):
        raise HTTPException(status_code=400, detail="Human handoff not enabled")

    handoff = await create_handoff(
        session_id=request.session_id,
        bot_id=bot_id,
        tenant_id=bot["tenant_id"],
        trigger=request.trigger,
        trigger_reason=request.reason
    )

    return {
        "handoff_id": handoff["_id"],
        "status": handoff["status"],
        "message": "Your request has been received. An agent will be with you shortly."
    }


# Get handoff status for a session (public)
@router.get("/{bot_id}/session/{session_id}")
async def get_session_handoff(bot_id: str, session_id: str):
    """Get active handoff for a session (public endpoint for widget)."""
    handoff = await get_handoff_by_session(session_id)

    if not handoff or handoff["bot_id"] != bot_id:
        return {"active": False, "handoff": None}

    return {
        "active": True,
        "handoff": {
            "id": handoff["_id"],
            "status": handoff["status"],
            "assigned_to_name": handoff.get("assigned_to_name"),
            "messages": handoff.get("messages", [])
        }
    }


# Public endpoint for visitor to send message during handoff
@router.post("/{bot_id}/session/{session_id}/message")
async def send_visitor_message(
    bot_id: str,
    session_id: str,
    message: HandoffMessage
):
    """Send message from visitor during handoff."""
    handoff = await get_handoff_by_session(session_id)

    if not handoff or handoff["bot_id"] != bot_id:
        raise HTTPException(status_code=404, detail="No active handoff")

    msg = await add_handoff_message(
        handoff_id=handoff["_id"],
        content=message.content,
        sender_type="visitor"
    )

    # Broadcast to WebSocket connections (so agent sees it immediately)
    await manager.broadcast(handoff["_id"], {
        "type": "message",
        "message": msg
    })

    return msg


# Store active WebSocket connections
# Format: {handoff_id: {connection_id: websocket}}
active_connections: dict = {}


class ConnectionManager:
    """Manage WebSocket connections for handoff chat."""

    def __init__(self):
        self.connections: dict = {}  # {handoff_id: [websocket, ...]}

    async def connect(self, websocket: WebSocket, handoff_id: str):
        await websocket.accept()
        if handoff_id not in self.connections:
            self.connections[handoff_id] = []
        self.connections[handoff_id].append(websocket)

    def disconnect(self, websocket: WebSocket, handoff_id: str):
        if handoff_id in self.connections:
            if websocket in self.connections[handoff_id]:
                self.connections[handoff_id].remove(websocket)
            if not self.connections[handoff_id]:
                del self.connections[handoff_id]

    async def broadcast(self, handoff_id: str, message: dict):
        """Broadcast message to all connections for a handoff."""
        if handoff_id in self.connections:
            disconnected = []
            for ws in self.connections[handoff_id]:
                try:
                    await ws.send_json(message)
                except:
                    disconnected.append(ws)
            # Clean up disconnected
            for ws in disconnected:
                self.disconnect(ws, handoff_id)


manager = ConnectionManager()


@router.websocket("/{bot_id}/{handoff_id}/ws")
async def websocket_handoff_chat(
    websocket: WebSocket,
    bot_id: str,
    handoff_id: str,
    token: Optional[str] = Query(None)
):
    """WebSocket endpoint for real-time handoff chat (agent side)."""
    db = get_mongodb()

    # Validate token if provided (for authenticated users)
    user = None
    if token:
        try:
            from ..core.security import decode_token
            payload = decode_token(token)
            if payload:
                user = await db.users.find_one({"_id": payload.get("sub")})
        except Exception:
            pass  # Continue without auth for public access

    # Validate handoff exists and belongs to bot
    handoff = await db.handoffs.find_one({"_id": handoff_id, "bot_id": bot_id})
    if not handoff:
        await websocket.close(code=4004)
        return

    await manager.connect(websocket, handoff_id)

    try:
        # Send current messages on connect (serialize to handle datetime objects)
        await websocket.send_json({
            "type": "init",
            "messages": serialize_for_json(handoff.get("messages", [])),
            "conversation_context": serialize_for_json(handoff.get("conversation_context", [])),
            "status": handoff.get("status")
        })

        while True:
            try:
                data = await websocket.receive_json()
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON format"})
                continue
            except WebSocketDisconnect:
                break

            if data.get("type") == "message":
                # Add message to database
                msg = await add_handoff_message(
                    handoff_id=handoff_id,
                    content=data.get("content", ""),
                    sender_type=data.get("sender_type", "agent"),
                    sender_id=data.get("sender_id"),
                    sender_name=data.get("sender_name", "Agent")
                )

                # Broadcast to all connected clients
                await manager.broadcast(handoff_id, {
                    "type": "message",
                    "message": msg
                })

            elif data.get("type") == "status_change":
                new_status = data.get("status")
                if new_status:
                    updated = await update_handoff(handoff_id, handoff["tenant_id"], {"status": new_status})
                    await manager.broadcast(handoff_id, {
                        "type": "status_change",
                        "status": new_status
                    })

            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, handoff_id)


@router.websocket("/{bot_id}/session/{session_id}/ws")
async def websocket_visitor_chat(
    websocket: WebSocket,
    bot_id: str,
    session_id: str
):
    """WebSocket endpoint for real-time handoff chat (visitor side)."""
    db = get_mongodb()

    # Get active handoff for this session
    handoff = await get_handoff_by_session(session_id)
    if not handoff or handoff["bot_id"] != bot_id:
        await websocket.close(code=4004)
        return

    handoff_id = handoff["_id"]
    await manager.connect(websocket, handoff_id)

    try:
        # Send current state on connect (serialize to handle datetime objects)
        await websocket.send_json({
            "type": "init",
            "handoff_id": handoff_id,
            "messages": serialize_for_json(handoff.get("messages", [])),
            "status": handoff.get("status"),
            "assigned_to_name": handoff.get("assigned_to_name")
        })

        while True:
            try:
                data = await websocket.receive_json()
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON format"})
                continue
            except WebSocketDisconnect:
                break

            if data.get("type") == "message":
                # Add visitor message
                msg = await add_handoff_message(
                    handoff_id=handoff_id,
                    content=data.get("content", ""),
                    sender_type="visitor"
                )

                # Broadcast to all connected clients (including agent)
                await manager.broadcast(handoff_id, {
                    "type": "message",
                    "message": msg
                })

            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, handoff_id)
