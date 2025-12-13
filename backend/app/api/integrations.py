"""API routes for OAuth integrations."""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from typing import Optional
from datetime import datetime, timedelta
import uuid
import json
import base64

from ..schemas.integrations import (
    IntegrationProvider,
    IntegrationStatus,
    IntegrationResponse,
    IntegrationListResponse,
    AuthUrlResponse,
    BrowseResponse,
    ImportRequest,
    ImportResponse,
    SyncStats,
)
from ..core.database import get_mongodb
from ..core.security import get_current_user
from ..core.config import settings
from ..core.encryption import encrypt_token, decrypt_token
from ..services.integrations import get_integration, INTEGRATIONS

router = APIRouter(prefix="/integrations", tags=["Integrations"])


def get_redirect_uri(provider: str) -> str:
    """Get OAuth redirect URI for a provider."""
    return f"{settings.OAUTH_REDIRECT_BASE}/api/v1/integrations/{provider}/callback"


@router.get("/{provider}/auth-url", response_model=AuthUrlResponse)
async def get_auth_url(
    provider: str,
    bot_id: str = Query(..., description="Chatbot ID to connect integration to"),
    user: dict = Depends(get_current_user),
):
    """Get OAuth authorization URL for a provider."""
    if provider not in INTEGRATIONS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Create state parameter with bot_id and user_id
    state_data = {
        "bot_id": bot_id,
        "user_id": user["_id"],
        "provider": provider,
    }
    state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()

    integration = get_integration(provider)
    redirect_uri = get_redirect_uri(provider)
    auth_url = integration.get_auth_url(state, redirect_uri)

    return AuthUrlResponse(auth_url=auth_url, provider=provider)


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
):
    """OAuth callback handler - exchanges code for tokens and stores integration."""
    if error:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{settings.OAUTH_REDIRECT_BASE}/chatbots?error={error}&provider={provider}"
        )

    if provider not in INTEGRATIONS:
        return RedirectResponse(
            url=f"{settings.OAUTH_REDIRECT_BASE}/chatbots?error=unknown_provider"
        )

    try:
        # Decode state
        state_data = json.loads(base64.urlsafe_b64decode(state).decode())
        bot_id = state_data["bot_id"]
        user_id = state_data["user_id"]

        db = get_mongodb()

        # Verify bot ownership
        bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user_id})
        if not bot:
            return RedirectResponse(
                url=f"{settings.OAUTH_REDIRECT_BASE}/chatbots?error=bot_not_found"
            )

        # Exchange code for tokens
        integration = get_integration(provider)
        redirect_uri = get_redirect_uri(provider)

        access_token, refresh_token, expires_in, user_info = await integration.exchange_code(
            code, redirect_uri
        )

        # Calculate expiry time
        token_expiry = None
        if expires_in:
            token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)

        # Check if integration already exists for this bot+provider
        existing = await db.integrations.find_one({
            "bot_id": bot_id,
            "provider": provider,
        })

        integration_doc = {
            "tenant_id": user_id,
            "bot_id": bot_id,
            "provider": provider,
            "access_token": encrypt_token(access_token),
            "refresh_token": encrypt_token(refresh_token) if refresh_token else None,
            "token_expiry": token_expiry,
            "scopes": integration.scopes,
            "provider_user_id": user_info.get("id") or user_info.get("user_id"),
            "provider_user_email": user_info.get("email"),
            "status": IntegrationStatus.CONNECTED,
            "last_sync": None,
            "sync_stats": {"documents_count": 0, "last_error": None},
            "updated_at": datetime.utcnow(),
        }

        if existing:
            # Update existing integration
            await db.integrations.update_one(
                {"_id": existing["_id"]},
                {"$set": integration_doc}
            )
        else:
            # Create new integration
            integration_doc["_id"] = str(uuid.uuid4())
            integration_doc["created_at"] = datetime.utcnow()
            await db.integrations.insert_one(integration_doc)

        # Redirect to frontend with success
        return RedirectResponse(
            url=f"{settings.OAUTH_REDIRECT_BASE}/chatbots/{bot_id}?tab=integrations&connected={provider}"
        )

    except Exception as e:
        print(f"OAuth callback error: {e}")
        return RedirectResponse(
            url=f"{settings.OAUTH_REDIRECT_BASE}/chatbots?error=oauth_failed&message={str(e)}"
        )


@router.get("/chatbots/{bot_id}", response_model=IntegrationListResponse)
async def list_integrations(
    bot_id: str,
    user: dict = Depends(get_current_user),
):
    """List all integrations for a chatbot."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get integrations
    cursor = db.integrations.find({"bot_id": bot_id, "tenant_id": user["_id"]})
    integrations = await cursor.to_list(length=100)

    return IntegrationListResponse(
        integrations=[
            IntegrationResponse(
                id=i["_id"],
                provider=i["provider"],
                status=i["status"],
                provider_user_email=i.get("provider_user_email"),
                last_sync=i.get("last_sync"),
                sync_stats=SyncStats(**i.get("sync_stats", {})),
                created_at=i["created_at"],
                updated_at=i["updated_at"],
            )
            for i in integrations
        ]
    )


@router.delete("/chatbots/{bot_id}/{provider}")
async def disconnect_integration(
    bot_id: str,
    provider: str,
    user: dict = Depends(get_current_user),
):
    """Disconnect an integration from a chatbot."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Delete integration
    result = await db.integrations.delete_one({
        "bot_id": bot_id,
        "provider": provider,
        "tenant_id": user["_id"],
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Integration not found")

    return {"message": "Integration disconnected"}


@router.get("/chatbots/{bot_id}/{provider}/browse", response_model=BrowseResponse)
async def browse_integration(
    bot_id: str,
    provider: str,
    folder_id: Optional[str] = Query(None),
    page_token: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    """Browse files/pages/channels in a connected integration."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get integration
    integration_doc = await db.integrations.find_one({
        "bot_id": bot_id,
        "provider": provider,
        "tenant_id": user["_id"],
    })

    if not integration_doc:
        raise HTTPException(status_code=404, detail="Integration not connected")

    # Check if token needs refresh
    access_token = decrypt_token(integration_doc["access_token"])

    if integration_doc.get("token_expiry"):
        if datetime.utcnow() > integration_doc["token_expiry"] - timedelta(minutes=5):
            # Token expired or about to expire, refresh it
            if integration_doc.get("refresh_token"):
                try:
                    integration = get_integration(provider)
                    refresh_token = decrypt_token(integration_doc["refresh_token"])
                    new_access_token, expires_in = await integration.refresh_access_token(refresh_token)

                    # Update stored token
                    token_expiry = None
                    if expires_in:
                        token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)

                    await db.integrations.update_one(
                        {"_id": integration_doc["_id"]},
                        {
                            "$set": {
                                "access_token": encrypt_token(new_access_token),
                                "token_expiry": token_expiry,
                                "updated_at": datetime.utcnow(),
                            }
                        }
                    )
                    access_token = new_access_token
                except Exception as e:
                    # Mark as expired
                    await db.integrations.update_one(
                        {"_id": integration_doc["_id"]},
                        {"$set": {"status": IntegrationStatus.EXPIRED}}
                    )
                    raise HTTPException(status_code=401, detail="Token expired, please reconnect")

    # Browse the integration
    try:
        integration = get_integration(provider)
        return await integration.browse(access_token, folder_id, page_token, query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Browse failed: {str(e)}")


@router.post("/chatbots/{bot_id}/{provider}/import", response_model=ImportResponse)
async def import_items(
    bot_id: str,
    provider: str,
    request: ImportRequest,
    user: dict = Depends(get_current_user),
):
    """Import selected items from an integration."""
    from ..tasks import import_integration_items_task

    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get integration
    integration_doc = await db.integrations.find_one({
        "bot_id": bot_id,
        "provider": provider,
        "tenant_id": user["_id"],
    })

    if not integration_doc:
        raise HTTPException(status_code=404, detail="Integration not connected")

    # Queue import task
    items_data = [{"id": item.id, "name": item.name, "type": item.type.value} for item in request.items]

    task = import_integration_items_task.delay(
        integration_id=integration_doc["_id"],
        bot_id=bot_id,
        tenant_id=user["_id"],
        provider=provider,
        items=items_data,
    )

    return ImportResponse(
        message="Import started",
        task_id=task.id,
        items_count=len(request.items),
    )


@router.get("/chatbots/{bot_id}/{provider}/status")
async def get_integration_status(
    bot_id: str,
    provider: str,
    user: dict = Depends(get_current_user),
):
    """Get status of an integration including imported documents."""
    db = get_mongodb()

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get integration
    integration_doc = await db.integrations.find_one({
        "bot_id": bot_id,
        "provider": provider,
        "tenant_id": user["_id"],
    })

    if not integration_doc:
        raise HTTPException(status_code=404, detail="Integration not connected")

    # Count documents from this integration
    doc_count = await db.documents.count_documents({
        "bot_id": bot_id,
        "source_type": provider,
    })

    # Get recent documents
    cursor = db.documents.find(
        {"bot_id": bot_id, "source_type": provider}
    ).sort("created_at", -1).limit(10)
    recent_docs = await cursor.to_list(length=10)

    return {
        "status": integration_doc["status"],
        "provider_user_email": integration_doc.get("provider_user_email"),
        "last_sync": integration_doc.get("last_sync"),
        "documents_count": doc_count,
        "recent_documents": [
            {
                "id": d["_id"],
                "filename": d["filename"],
                "status": d["status"],
                "created_at": d["created_at"],
            }
            for d in recent_docs
        ],
    }
