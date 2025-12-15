from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List
from datetime import datetime, timedelta
import uuid
import os
import aiofiles
import hashlib
import secrets
from ..schemas.chatbot import (
    ChatbotCreate, ChatbotUpdate, ChatbotResponse,
    EmbedCode, DocumentResponse, SharePasswordVerify,
    ShareAccessResponse, PublicBotConfig
)
from ..core.security import get_current_user
from ..core.database import get_mongodb
from ..tasks import process_document_task
from ..services.limits import check_chatbot_limit, check_document_limit, check_file_size_limit

router = APIRouter(prefix="/chatbots", tags=["Chatbots"])

UPLOAD_DIR = "/app/uploads"
SHARE_BASE_URL = os.getenv("SHARE_BASE_URL", "https://chatbot.zaiasystems.com")


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against stored hash."""
    if not stored_hash or ":" not in stored_hash:
        return False
    salt, hashed = stored_hash.split(":", 1)
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hashed


def generate_access_token(bot_id: str) -> str:
    """Generate a temporary access token for shared bot."""
    token_data = f"{bot_id}:{secrets.token_hex(16)}:{datetime.utcnow().timestamp()}"
    return hashlib.sha256(token_data.encode()).hexdigest()[:32]


@router.post("", response_model=ChatbotResponse)
async def create_chatbot(
    chatbot_data: ChatbotCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_mongodb()

    # Check chatbot limit
    await check_chatbot_limit(current_user["_id"], current_user)

    bot_id = str(uuid.uuid4())
    bot_doc = {
        "_id": bot_id,
        "tenant_id": current_user["_id"],
        "name": chatbot_data.name,
        "system_prompt": chatbot_data.system_prompt,
        "welcome_message": chatbot_data.welcome_message,
        "primary_color": chatbot_data.primary_color,
        "text_color": chatbot_data.text_color,
        "position": chatbot_data.position,
        "is_personal": chatbot_data.is_personal or False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db.chatbots.insert_one(bot_doc)

    return ChatbotResponse(
        id=bot_id,
        tenant_id=current_user["_id"],
        name=chatbot_data.name,
        system_prompt=chatbot_data.system_prompt,
        welcome_message=chatbot_data.welcome_message,
        primary_color=chatbot_data.primary_color,
        text_color=chatbot_data.text_color,
        position=chatbot_data.position,
        is_personal=bot_doc["is_personal"],
        created_at=bot_doc["created_at"],
        updated_at=bot_doc["updated_at"]
    )


def build_chatbot_response(bot: dict, doc_count: int = 0, msg_count: int = 0) -> ChatbotResponse:
    """Helper to build ChatbotResponse with share link info."""
    is_public = bot.get("is_public", False)
    has_password = bool(bot.get("share_password_hash"))
    share_link = f"{SHARE_BASE_URL}/chat/{bot['_id']}" if is_public else None

    return ChatbotResponse(
        id=bot["_id"],
        tenant_id=bot["tenant_id"],
        name=bot["name"],
        system_prompt=bot.get("system_prompt", ""),
        welcome_message=bot.get("welcome_message", ""),
        primary_color=bot.get("primary_color", "#3B82F6"),
        text_color=bot.get("text_color", "#FFFFFF"),
        position=bot.get("position", "bottom-right"),
        created_at=bot["created_at"],
        updated_at=bot["updated_at"],
        document_count=doc_count,
        total_messages=msg_count,
        is_public=is_public,
        has_password=has_password,
        share_link=share_link,
        is_personal=bot.get("is_personal", False)
    )


@router.get("", response_model=List[ChatbotResponse])
async def list_chatbots(current_user: dict = Depends(get_current_user)):
    db = get_mongodb()

    # Get all chatbots with document and message counts in one aggregation
    pipeline = [
        {"$match": {"tenant_id": current_user["_id"]}},
        {"$lookup": {
            "from": "documents",
            "let": {"bot_id": "$_id"},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$bot_id", "$$bot_id"]}}},
                {"$count": "count"}
            ],
            "as": "doc_stats"
        }},
        {"$lookup": {
            "from": "messages",
            "let": {"bot_id": "$_id"},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$bot_id", "$$bot_id"]}}},
                {"$count": "count"}
            ],
            "as": "msg_stats"
        }},
        {"$addFields": {
            "document_count": {"$ifNull": [{"$arrayElemAt": ["$doc_stats.count", 0]}, 0]},
            "message_count": {"$ifNull": [{"$arrayElemAt": ["$msg_stats.count", 0]}, 0]}
        }},
        {"$project": {"doc_stats": 0, "msg_stats": 0}}
    ]

    chatbots = []
    async for bot in db.chatbots.aggregate(pipeline):
        chatbots.append(build_chatbot_response(bot, bot.get("document_count", 0), bot.get("message_count", 0)))

    return chatbots


@router.get("/{bot_id}", response_model=ChatbotResponse)
async def get_chatbot(bot_id: str, current_user: dict = Depends(get_current_user)):
    db = get_mongodb()

    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    doc_count = await db.documents.count_documents({
        "tenant_id": current_user["_id"],
        "bot_id": bot_id
    })

    msg_count = await db.messages.count_documents({
        "tenant_id": current_user["_id"],
        "bot_id": bot_id
    })

    return build_chatbot_response(bot, doc_count, msg_count)


@router.patch("/{bot_id}", response_model=ChatbotResponse)
async def update_chatbot(
    bot_id: str,
    update_data: ChatbotUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_mongodb()

    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    update_dict = {}
    for k, v in update_data.model_dump().items():
        if v is not None:
            # Handle password separately
            if k == "share_password":
                if v == "":
                    # Empty string means remove password
                    update_dict["share_password_hash"] = None
                else:
                    # Hash the password
                    update_dict["share_password_hash"] = hash_password(v)
            else:
                update_dict[k] = v

    update_dict["updated_at"] = datetime.utcnow()

    await db.chatbots.update_one(
        {"_id": bot_id},
        {"$set": update_dict}
    )

    updated_bot = await db.chatbots.find_one({"_id": bot_id})

    return build_chatbot_response(updated_bot)


@router.delete("/{bot_id}")
async def delete_chatbot(bot_id: str, current_user: dict = Depends(get_current_user)):
    db = get_mongodb()

    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Delete associated data
    await db.documents.delete_many({"bot_id": bot_id})
    await db.chunks.delete_many({"bot_id": bot_id})
    await db.messages.delete_many({"bot_id": bot_id})
    await db.conversations.delete_many({"bot_id": bot_id})
    await db.chatbots.delete_one({"_id": bot_id})

    return {"message": "Chatbot deleted"}


@router.get("/{bot_id}/embed", response_model=EmbedCode)
async def get_embed_code(bot_id: str, current_user: dict = Depends(get_current_user)):
    db = get_mongodb()

    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    base_url = "https://chatbot.zaiasystems.com"

    script_tag = f'<script src="{base_url}/widget/zaia-chat.js" data-bot-id="{bot_id}"></script>'
    div_tag = f'<div id="zaia-chatbot" data-bot-id="{bot_id}"></div>'

    full_snippet = f"""<!-- ZAIA Chatbot Widget -->
{script_tag}
"""

    return EmbedCode(
        script_tag=script_tag,
        div_tag=div_tag,
        full_snippet=full_snippet
    )


@router.post("/{bot_id}/documents", response_model=DocumentResponse)
async def upload_document(
    bot_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    db = get_mongodb()

    # Verify chatbot ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Check document limit
    await check_document_limit(current_user["_id"], bot_id, current_user)

    # Validate file type
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: PDF, DOCX, TXT"
        )

    # Read file content first to check size
    content = await file.read()

    # Check file size limit
    await check_file_size_limit(len(content), current_user)

    # Save file
    document_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{document_id}{file_ext}")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    # Create document record
    doc = {
        "_id": document_id,
        "tenant_id": current_user["_id"],
        "bot_id": bot_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "file_path": file_path,
        "status": "processing",
        "chunks_count": 0,
        "created_at": datetime.utcnow()
    }

    await db.documents.insert_one(doc)

    # Queue processing task
    process_document_task.delay(
        file_path=file_path,
        document_id=document_id,
        tenant_id=current_user["_id"],
        bot_id=bot_id,
        content_type=file.content_type,
        filename=file.filename
    )

    return DocumentResponse(
        id=document_id,
        filename=file.filename,
        content_type=file.content_type,
        size=len(content),
        status="processing",
        created_at=doc["created_at"]
    )


@router.get("/{bot_id}/documents", response_model=List[DocumentResponse])
async def list_documents(bot_id: str, current_user: dict = Depends(get_current_user)):
    db = get_mongodb()

    # Verify chatbot ownership
    bot = await db.chatbots.find_one({
        "_id": bot_id,
        "tenant_id": current_user["_id"]
    })

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    documents = []
    async for doc in db.documents.find({
        "tenant_id": current_user["_id"],
        "bot_id": bot_id
    }):
        documents.append(DocumentResponse(
            id=doc["_id"],
            filename=doc["filename"],
            content_type=doc["content_type"],
            size=doc["size"],
            status=doc["status"],
            chunks_count=doc.get("chunks_count", 0),
            created_at=doc["created_at"]
        ))

    return documents


@router.delete("/{bot_id}/documents/{doc_id}")
async def delete_document(
    bot_id: str,
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_mongodb()

    doc = await db.documents.find_one({
        "_id": doc_id,
        "tenant_id": current_user["_id"],
        "bot_id": bot_id
    })

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete associated chunks
    from ..services.ingestion import delete_document_data
    await delete_document_data(doc_id, current_user["_id"], bot_id)

    # Delete file
    if os.path.exists(doc.get("file_path", "")):
        os.remove(doc["file_path"])

    return {"message": "Document deleted"}


# ============== PUBLIC SHARE ENDPOINTS ==============

@router.get("/share/{bot_id}/config", response_model=PublicBotConfig)
async def get_shared_bot_config(bot_id: str):
    """Get public config for shared chatbot (no auth required)."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if not bot.get("is_public", False):
        raise HTTPException(status_code=403, detail="This chatbot is not publicly shared")

    return PublicBotConfig(
        name=bot["name"],
        welcome_message=bot.get("welcome_message", "Hello! How can I help you?"),
        primary_color=bot.get("primary_color", "#3B82F6"),
        text_color=bot.get("text_color", "#FFFFFF"),
        position=bot.get("position", "bottom-right"),
        requires_password=bool(bot.get("share_password_hash")),
        is_personal=bot.get("is_personal", False)
    )


@router.post("/share/{bot_id}/verify", response_model=ShareAccessResponse)
async def verify_share_password(bot_id: str, data: SharePasswordVerify):
    """Verify password for password-protected shared chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if not bot.get("is_public", False):
        raise HTTPException(status_code=403, detail="This chatbot is not publicly shared")

    stored_hash = bot.get("share_password_hash")

    if not stored_hash:
        # No password required
        return ShareAccessResponse(
            access_granted=True,
            access_token=generate_access_token(bot_id),
            bot_name=bot["name"]
        )

    if verify_password(data.password, stored_hash):
        # Generate access token (stored in memory/session for this bot)
        access_token = generate_access_token(bot_id)

        # Store token with expiry (24 hours)
        await db.share_tokens.update_one(
            {"token": access_token},
            {
                "$set": {
                    "bot_id": bot_id,
                    "created_at": datetime.utcnow(),
                    "expires_at": datetime.utcnow() + timedelta(hours=24)
                }
            },
            upsert=True
        )

        return ShareAccessResponse(
            access_granted=True,
            access_token=access_token,
            bot_name=bot["name"]
        )

    return ShareAccessResponse(
        access_granted=False,
        bot_name=bot["name"],
        error="Invalid password"
    )


@router.get("/share/{bot_id}/check-access")
async def check_share_access(bot_id: str, token: str = None):
    """Check if user has access to shared chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if not bot.get("is_public", False):
        return {"has_access": False, "reason": "not_public"}

    # No password required
    if not bot.get("share_password_hash"):
        return {"has_access": True}

    # Check token
    if not token:
        return {"has_access": False, "reason": "password_required"}

    token_doc = await db.share_tokens.find_one({
        "token": token,
        "bot_id": bot_id,
        "expires_at": {"$gt": datetime.utcnow()}
    })

    if token_doc:
        return {"has_access": True}

    return {"has_access": False, "reason": "invalid_token"}
