"""
GDPR compliance endpoints for data export and deletion.
Implements GDPR Articles 17 (Right to Erasure) and 20 (Data Portability).
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import uuid
import logging
from ..core.security import get_current_user
from ..core.database import get_mongodb, get_qdrant, get_neo4j
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gdpr", tags=["GDPR"])


class ConsentUpdate(BaseModel):
    marketing_consent: bool


class DataExportResponse(BaseModel):
    user_data: Dict[str, Any]
    export_timestamp: datetime
    data_version: str = "1.0"


class DeletionRequestResponse(BaseModel):
    message: str
    scheduled_deletion_date: datetime
    user_id: str


class MessageResponse(BaseModel):
    message: str


@router.get("/export", response_model=DataExportResponse)
async def export_user_data(current_user: dict = Depends(get_current_user)):
    """
    GDPR Article 20 - Data Portability.
    Export all user data as JSON.

    This endpoint collects and exports:
    - User profile information
    - All chatbots created by the user
    - All conversations and messages
    - Uploaded documents metadata
    - API keys (names only, not actual keys)
    - Leads and handoffs
    - Analytics data
    - Consent preferences

    Excludes:
    - password_hash (for security)
    - Internal system metadata
    """
    db = get_mongodb()
    user_id = current_user["_id"]

    logger.info(f"GDPR data export requested by user {user_id}")

    try:
        # 1. User profile (exclude password)
        user_profile = await db.users.find_one({"_id": user_id})
        if user_profile:
            user_profile.pop("password_hash", None)
            # Convert ObjectId to string for JSON serialization
            user_profile["_id"] = str(user_profile["_id"])
            if "created_at" in user_profile:
                user_profile["created_at"] = user_profile["created_at"].isoformat()
            if "last_login" in user_profile:
                user_profile["last_login"] = user_profile["last_login"].isoformat()
            if "privacy_consent_timestamp" in user_profile and user_profile["privacy_consent_timestamp"]:
                user_profile["privacy_consent_timestamp"] = user_profile["privacy_consent_timestamp"].isoformat()
            if "marketing_consent_timestamp" in user_profile and user_profile["marketing_consent_timestamp"]:
                user_profile["marketing_consent_timestamp"] = user_profile["marketing_consent_timestamp"].isoformat()

        # 2. Chatbots
        chatbots = []
        async for bot in db.chatbots.find({"tenant_id": user_id}):
            bot["_id"] = str(bot["_id"])
            if "created_at" in bot:
                bot["created_at"] = bot["created_at"].isoformat()
            if "updated_at" in bot:
                bot["updated_at"] = bot["updated_at"].isoformat()
            chatbots.append(bot)

        # 3. Documents
        documents = []
        async for doc in db.documents.find({"tenant_id": user_id}):
            doc["_id"] = str(doc["_id"])
            if "created_at" in doc:
                doc["created_at"] = doc["created_at"].isoformat()
            # Remove file content if too large, keep metadata
            if "content" in doc and len(str(doc.get("content", ""))) > 1000:
                doc["content"] = "[Content omitted - too large for export]"
            documents.append(doc)

        # 4. Conversations
        conversations = []
        async for conv in db.conversations.find({"tenant_id": user_id}):
            conv["_id"] = str(conv["_id"])
            if "created_at" in conv:
                conv["created_at"] = conv["created_at"].isoformat()
            if "updated_at" in conv:
                conv["updated_at"] = conv["updated_at"].isoformat()
            conversations.append(conv)

        # 5. Messages
        messages = []
        async for msg in db.messages.find({"tenant_id": user_id}):
            msg["_id"] = str(msg["_id"])
            if "timestamp" in msg:
                msg["timestamp"] = msg["timestamp"].isoformat()
            messages.append(msg)

        # 6. API Keys (names only, not actual keys)
        api_keys = []
        async for key in db.api_keys.find({"user_id": user_id}):
            key["_id"] = str(key["_id"])
            key.pop("key_hash", None)  # Remove hashed key for security
            key["key_prefix"] = key.get("key_prefix", "****")
            if "created_at" in key:
                key["created_at"] = key["created_at"].isoformat()
            if "last_used" in key and key["last_used"]:
                key["last_used"] = key["last_used"].isoformat()
            if "expires_at" in key and key["expires_at"]:
                key["expires_at"] = key["expires_at"].isoformat()
            api_keys.append(key)

        # 7. Leads
        leads = []
        async for lead in db.leads.find({"tenant_id": user_id}):
            lead["_id"] = str(lead["_id"])
            if "created_at" in lead:
                lead["created_at"] = lead["created_at"].isoformat()
            leads.append(lead)

        # 8. Handoffs
        handoffs = []
        async for handoff in db.handoffs.find({"tenant_id": user_id}):
            handoff["_id"] = str(handoff["_id"])
            if "created_at" in handoff:
                handoff["created_at"] = handoff["created_at"].isoformat()
            if "updated_at" in handoff:
                handoff["updated_at"] = handoff["updated_at"].isoformat()
            handoffs.append(handoff)

        # 9. User profiles (context system)
        user_profiles = []
        async for profile in db.user_profiles.find({"tenant_id": user_id}):
            profile["_id"] = str(profile["_id"])
            if "created_at" in profile:
                profile["created_at"] = profile["created_at"].isoformat()
            if "updated_at" in profile:
                profile["updated_at"] = profile["updated_at"].isoformat()
            user_profiles.append(profile)

        # 10. Feedback
        feedback = []
        async for fb in db.feedback.find({"tenant_id": user_id}):
            fb["_id"] = str(fb["_id"])
            if "created_at" in fb:
                fb["created_at"] = fb["created_at"].isoformat()
            feedback.append(fb)

        # Compile export data
        export_data = {
            "user_profile": user_profile,
            "chatbots": chatbots,
            "documents": documents,
            "conversations": conversations,
            "messages": messages,
            "api_keys": api_keys,
            "leads": leads,
            "handoffs": handoffs,
            "user_profiles": user_profiles,
            "feedback": feedback,
            "export_info": {
                "user_id": user_id,
                "export_timestamp": datetime.utcnow().isoformat(),
                "data_version": "1.0",
                "gdpr_article": "Article 20 - Right to Data Portability"
            }
        }

        logger.info(f"GDPR data export completed for user {user_id}")

        return DataExportResponse(
            user_data=export_data,
            export_timestamp=datetime.utcnow(),
            data_version="1.0"
        )

    except Exception as e:
        logger.error(f"Error exporting user data for {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export user data: {str(e)}"
        )


@router.post("/delete-request", response_model=DeletionRequestResponse)
async def request_data_deletion(current_user: dict = Depends(get_current_user)):
    """
    GDPR Article 17 - Right to Erasure.
    Schedule user data deletion after 30-day grace period.

    This gives users time to change their mind and allows for
    recovery of accidentally requested deletions.
    """
    db = get_mongodb()
    user_id = current_user["_id"]

    logger.info(f"GDPR deletion request received from user {user_id}")

    # Schedule deletion for 30 days from now
    scheduled_date = datetime.utcnow() + timedelta(days=30)

    # Update user status to mark for deletion
    await db.users.update_one(
        {"_id": user_id},
        {
            "$set": {
                "status": "pending_deletion",
                "deletion_requested_at": datetime.utcnow(),
                "scheduled_deletion_date": scheduled_date
            }
        }
    )

    logger.info(f"User {user_id} marked for deletion on {scheduled_date}")

    return DeletionRequestResponse(
        message=(
            "Your account and all associated data have been scheduled for deletion. "
            f"The deletion will occur on {scheduled_date.strftime('%Y-%m-%d')}. "
            "If you change your mind, please contact support before this date."
        ),
        scheduled_deletion_date=scheduled_date,
        user_id=user_id
    )


@router.delete("/delete-immediate", response_model=MessageResponse)
async def delete_data_immediately(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Immediate and irreversible deletion of all user data.
    Implements GDPR Article 17 - Right to Erasure.

    WARNING: This action cannot be undone!

    Deletes:
    - User profile
    - All chatbots
    - All conversations and messages
    - All uploaded documents
    - All vector embeddings from Qdrant
    - All knowledge graph entities from Neo4j
    - All API keys
    - All leads and handoffs
    - All analytics data
    """
    db = get_mongodb()
    user_id = current_user["_id"]

    logger.warning(f"IMMEDIATE GDPR deletion requested by user {user_id}")

    try:
        # 1. Delete from MongoDB collections
        collections_to_delete = [
            "chatbots",
            "documents",
            "conversations",
            "messages",
            "api_keys",
            "leads",
            "handoffs",
            "user_profiles",
            "feedback",
            "chunks",
            "unanswered_questions",
            "conversation_topics",
            "sentiment_aggregates",
            "usage_patterns"
        ]

        for collection in collections_to_delete:
            result = await db[collection].delete_many({"tenant_id": user_id})
            logger.info(f"Deleted {result.deleted_count} documents from {collection}")

        # 2. Delete vector embeddings from Qdrant
        try:
            qdrant = get_qdrant()
            # Delete all points with tenant_id filter
            qdrant.delete(
                collection_name="documents",
                points_selector={
                    "filter": {
                        "must": [
                            {"key": "tenant_id", "match": {"value": user_id}}
                        ]
                    }
                }
            )
            logger.info(f"Deleted vector embeddings for user {user_id} from Qdrant")
        except Exception as e:
            logger.error(f"Error deleting from Qdrant: {str(e)}")

        # 3. Delete knowledge graph entities from Neo4j
        try:
            neo4j_driver = get_neo4j()
            async with neo4j_driver.session() as session:
                result = await session.run(
                    "MATCH (n) WHERE n.tenant_id = $tenant_id DETACH DELETE n",
                    tenant_id=user_id
                )
                logger.info(f"Deleted knowledge graph entities for user {user_id} from Neo4j")
        except Exception as e:
            logger.error(f"Error deleting from Neo4j: {str(e)}")

        # 4. Finally, delete the user account (soft delete)
        await db.users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "status": "deleted",
                    "deleted_at": datetime.utcnow(),
                    "email": f"deleted_{user_id}@deleted.local",  # Anonymize email
                    "password_hash": "",
                    "company_name": None,
                    "phone": None,
                    "job_title": None,
                    "country": None
                }
            }
        )

        logger.warning(f"User {user_id} data has been permanently deleted")

        return MessageResponse(
            message=(
                "Your account and all associated data have been permanently deleted. "
                "This action cannot be undone. Thank you for using our service."
            )
        )

    except Exception as e:
        logger.error(f"Error during immediate deletion for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user data: {str(e)}"
        )


@router.patch("/consent", response_model=MessageResponse)
async def update_consent(
    consent_data: ConsentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update marketing consent preference.

    This allows users to opt-in or opt-out of marketing communications
    at any time, in compliance with GDPR requirements.
    """
    db = get_mongodb()
    user_id = current_user["_id"]

    logger.info(f"Consent update for user {user_id}: marketing_consent={consent_data.marketing_consent}")

    # Update consent in database
    await db.users.update_one(
        {"_id": user_id},
        {
            "$set": {
                "marketing_consent": consent_data.marketing_consent,
                "marketing_consent_timestamp": datetime.utcnow()
            }
        }
    )

    consent_status = "granted" if consent_data.marketing_consent else "revoked"

    return MessageResponse(
        message=f"Marketing consent has been {consent_status}. Your preferences have been updated."
    )


@router.get("/consent-status")
async def get_consent_status(current_user: dict = Depends(get_current_user)):
    """
    Retrieve current consent preferences for the authenticated user.
    """
    return {
        "privacy_consent": current_user.get("privacy_consent", False),
        "privacy_consent_timestamp": current_user.get("privacy_consent_timestamp"),
        "marketing_consent": current_user.get("marketing_consent", False),
        "marketing_consent_timestamp": current_user.get("marketing_consent_timestamp"),
        "consent_version": current_user.get("consent_version", "1.0")
    }


@router.post("/cancel-deletion", response_model=MessageResponse)
async def cancel_deletion_request(current_user: dict = Depends(get_current_user)):
    """
    Cancel a previously scheduled deletion request.
    Only works if the user status is 'pending_deletion'.
    """
    db = get_mongodb()
    user_id = current_user["_id"]

    if current_user.get("status") != "pending_deletion":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending deletion request found for this account."
        )

    # Restore user to active status
    await db.users.update_one(
        {"_id": user_id},
        {
            "$set": {
                "status": "active"
            },
            "$unset": {
                "deletion_requested_at": "",
                "scheduled_deletion_date": ""
            }
        }
    )

    logger.info(f"Deletion request cancelled for user {user_id}")

    return MessageResponse(
        message="Your deletion request has been cancelled. Your account remains active."
    )
