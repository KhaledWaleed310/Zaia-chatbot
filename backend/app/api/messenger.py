"""API routes for Facebook Messenger integration."""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from typing import Optional
from datetime import datetime
import uuid
import json
import base64
import logging

from ..schemas.messenger import (
    AuthUrlResponse,
    FacebookPage,
    PagesListResponse,
    ConnectPageRequest,
    MessengerConnectionResponse,
    MessengerConfigResponse,
    MessengerConnectionStatus,
    DisconnectResponse,
)
from ..core.database import get_mongodb
from ..core.security import get_current_user
from ..core.config import settings
from ..services.messenger import messenger_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messenger", tags=["Messenger"])


def get_redirect_uri() -> str:
    """Get OAuth redirect URI for Messenger."""
    return f"{settings.OAUTH_REDIRECT_BASE}/api/v1/messenger/callback"


@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_messenger_auth_url(
    bot_id: str = Query(..., description="Chatbot ID to connect Messenger to"),
    user: dict = Depends(get_current_user),
):
    """Get Facebook OAuth authorization URL for Messenger integration."""
    if not messenger_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Facebook Messenger integration is not configured"
        )

    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    redirect_uri = get_redirect_uri()
    auth_url = messenger_service.get_auth_url(bot_id, user["_id"], redirect_uri)

    return AuthUrlResponse(auth_url=auth_url)


@router.get("/callback")
async def messenger_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
):
    """OAuth callback handler - exchanges code for tokens and redirects to page selection."""
    frontend_url = settings.FRONTEND_URL

    if error:
        logger.warning(f"Messenger OAuth error: {error} - {error_description}")
        return RedirectResponse(
            url=f"{frontend_url}/chatbots?error=messenger_oauth_failed&message={error_description or error}"
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_url}/chatbots?error=messenger_missing_params"
        )

    try:
        # Parse state to get bot_id and user_id
        bot_id, user_id = state.split(":", 1)

        db = get_mongodb()

        # Verify bot ownership
        bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user_id})
        if not bot:
            return RedirectResponse(
                url=f"{frontend_url}/chatbots?error=bot_not_found"
            )

        # Exchange code for user access token
        redirect_uri = get_redirect_uri()
        token_data = await messenger_service.exchange_code_for_token(code, redirect_uri)

        # Get user info
        user_info = await messenger_service.get_user_info(token_data["access_token"])

        # Store temporary session data for page selection
        # We'll use a temporary collection to store the user token until page is selected
        session_id = str(uuid.uuid4())
        await db.messenger_oauth_sessions.insert_one({
            "_id": session_id,
            "bot_id": bot_id,
            "tenant_id": user_id,
            "user_access_token": messenger_service.encrypt_access_token(token_data["access_token"]),
            "fb_user_id": user_info.get("id"),
            "fb_user_name": user_info.get("name"),
            "created_at": datetime.utcnow(),
            # Session expires in 10 minutes
            "expires_at": datetime.utcnow().replace(minute=datetime.utcnow().minute + 10),
        })

        # Redirect to frontend with session_id for page selection
        return RedirectResponse(
            url=f"{frontend_url}/chatbots/{bot_id}?tab=share&messenger=select_page&session={session_id}"
        )

    except ValueError as e:
        logger.error(f"Messenger OAuth error: {e}")
        return RedirectResponse(
            url=f"{frontend_url}/chatbots?error=messenger_oauth_failed&message={str(e)}"
        )
    except Exception as e:
        logger.exception(f"Messenger OAuth unexpected error: {e}")
        return RedirectResponse(
            url=f"{frontend_url}/chatbots?error=messenger_oauth_failed"
        )


@router.get("/{bot_id}/pages", response_model=PagesListResponse)
async def get_available_pages(
    bot_id: str,
    session: str = Query(..., description="OAuth session ID from callback"),
    user: dict = Depends(get_current_user),
):
    """Get list of Facebook Pages available to connect."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get OAuth session
    session_doc = await db.messenger_oauth_sessions.find_one({
        "_id": session,
        "bot_id": bot_id,
        "tenant_id": user["_id"],
    })

    if not session_doc:
        raise HTTPException(status_code=404, detail="OAuth session not found or expired")

    # Check if session expired
    if session_doc.get("expires_at") and datetime.utcnow() > session_doc["expires_at"]:
        await db.messenger_oauth_sessions.delete_one({"_id": session})
        raise HTTPException(status_code=410, detail="OAuth session expired, please reconnect")

    # Get user's pages
    user_token = messenger_service.decrypt_access_token(session_doc["user_access_token"])

    try:
        pages = await messenger_service.get_user_pages(user_token)

        return PagesListResponse(
            pages=[
                FacebookPage(
                    id=page["id"],
                    name=page["name"],
                    category=page.get("category"),
                    picture_url=page.get("picture", {}).get("data", {}).get("url"),
                )
                for page in pages
            ]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{bot_id}/connect", response_model=MessengerConnectionResponse)
async def connect_page(
    bot_id: str,
    request: ConnectPageRequest,
    session: str = Query(..., description="OAuth session ID from callback"),
    user: dict = Depends(get_current_user),
):
    """Connect a Facebook Page to the chatbot for Messenger."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get OAuth session
    session_doc = await db.messenger_oauth_sessions.find_one({
        "_id": session,
        "bot_id": bot_id,
        "tenant_id": user["_id"],
    })

    if not session_doc:
        raise HTTPException(status_code=404, detail="OAuth session not found or expired")

    # Get user's pages to find the selected page's access token
    user_token = messenger_service.decrypt_access_token(session_doc["user_access_token"])

    try:
        pages = await messenger_service.get_user_pages(user_token)

        # Find selected page
        selected_page = None
        for page in pages:
            if page["id"] == request.page_id:
                selected_page = page
                break

        if not selected_page:
            raise HTTPException(status_code=404, detail="Selected page not found")

        # Subscribe page to app's webhook
        page_token = selected_page["access_token"]
        subscribed = await messenger_service.subscribe_page_to_app(page_token, request.page_id)

        if not subscribed:
            logger.warning(f"Failed to subscribe page {request.page_id} to webhook")

        # Check if connection already exists
        existing = await db.messenger_connections.find_one({
            "bot_id": bot_id,
            "tenant_id": user["_id"],
        })

        connection_id = str(uuid.uuid4())
        now = datetime.utcnow()

        connection_doc = {
            "bot_id": bot_id,
            "tenant_id": user["_id"],
            "fb_user_id": session_doc["fb_user_id"],
            "fb_user_name": session_doc["fb_user_name"],
            "user_access_token": session_doc["user_access_token"],
            "page_id": request.page_id,
            "page_name": selected_page["name"],
            "page_access_token": messenger_service.encrypt_access_token(page_token),
            "enabled": True,
            "status": MessengerConnectionStatus.CONNECTED,
            "error_message": None,
            "message_count": 0,
            "last_message_at": None,
            "updated_at": now,
        }

        if existing:
            # Update existing connection
            await db.messenger_connections.update_one(
                {"_id": existing["_id"]},
                {"$set": connection_doc}
            )
            connection_id = existing["_id"]
        else:
            # Create new connection
            connection_doc["_id"] = connection_id
            connection_doc["connected_at"] = now
            await db.messenger_connections.insert_one(connection_doc)

        # Clean up OAuth session
        await db.messenger_oauth_sessions.delete_one({"_id": session})

        return MessengerConnectionResponse(
            id=connection_id,
            bot_id=bot_id,
            page_id=request.page_id,
            page_name=selected_page["name"],
            status=MessengerConnectionStatus.CONNECTED,
            enabled=True,
            message_count=0,
            last_message_at=None,
            connected_at=connection_doc.get("connected_at", now),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bot_id}/config", response_model=MessengerConfigResponse)
async def get_messenger_config(
    bot_id: str,
    user: dict = Depends(get_current_user),
):
    """Get Messenger configuration status for a chatbot."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Check if Messenger is configured
    is_configured = messenger_service.is_configured()

    # Get connection if exists
    connection = await db.messenger_connections.find_one({
        "bot_id": bot_id,
        "tenant_id": user["_id"],
    })

    if connection:
        return MessengerConfigResponse(
            is_configured=is_configured,
            is_connected=True,
            connection=MessengerConnectionResponse(
                id=connection["_id"],
                bot_id=bot_id,
                page_id=connection["page_id"],
                page_name=connection["page_name"],
                status=connection["status"],
                enabled=connection["enabled"],
                message_count=connection.get("message_count", 0),
                last_message_at=connection.get("last_message_at"),
                connected_at=connection["connected_at"],
                error_message=connection.get("error_message"),
            )
        )

    return MessengerConfigResponse(
        is_configured=is_configured,
        is_connected=False,
        connection=None,
    )


@router.delete("/{bot_id}/disconnect", response_model=DisconnectResponse)
async def disconnect_messenger(
    bot_id: str,
    user: dict = Depends(get_current_user),
):
    """Disconnect Messenger from a chatbot."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get connection
    connection = await db.messenger_connections.find_one({
        "bot_id": bot_id,
        "tenant_id": user["_id"],
    })

    if not connection:
        raise HTTPException(status_code=404, detail="Messenger not connected")

    # Try to unsubscribe from webhook
    try:
        page_token = messenger_service.decrypt_access_token(connection["page_access_token"])
        await messenger_service.unsubscribe_page_from_app(page_token, connection["page_id"])
    except Exception as e:
        logger.warning(f"Failed to unsubscribe page from webhook: {e}")

    # Delete connection
    await db.messenger_connections.delete_one({"_id": connection["_id"]})

    return DisconnectResponse(
        message="Messenger disconnected successfully",
        success=True,
    )


@router.patch("/{bot_id}/toggle")
async def toggle_messenger(
    bot_id: str,
    enabled: bool = Query(..., description="Enable or disable Messenger"),
    user: dict = Depends(get_current_user),
):
    """Enable or disable Messenger for a chatbot."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Update connection
    result = await db.messenger_connections.update_one(
        {"bot_id": bot_id, "tenant_id": user["_id"]},
        {"$set": {"enabled": enabled, "updated_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Messenger not connected")

    return {"message": f"Messenger {'enabled' if enabled else 'disabled'}", "enabled": enabled}
