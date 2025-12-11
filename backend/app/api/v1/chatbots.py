from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime
import secrets
import structlog

from ...models import Chatbot, ChatbotCreate, ChatbotUpdate, ChatbotConfig, ChatbotInDB
from ...dependencies import get_mongo_db
from ...middleware.auth import get_current_tenant
from ...config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/chatbots")


def generate_embed_key() -> str:
    """Generate a unique embed key for the chatbot."""
    return f"ek_{secrets.token_urlsafe(24)}"


@router.post("", response_model=Chatbot)
async def create_chatbot(
    chatbot_data: ChatbotCreate,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Create a new chatbot."""
    # Validate that all KB IDs exist and belong to tenant
    if chatbot_data.kb_ids:
        for kb_id in chatbot_data.kb_ids:
            try:
                kb = await db.knowledge_bases.find_one({
                    "_id": ObjectId(kb_id),
                    "tenant_id": tenant_id
                })
                if not kb:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Knowledge base {kb_id} not found"
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid knowledge base ID: {kb_id}"
                )

    chatbot_doc = {
        "tenant_id": tenant_id,
        "name": chatbot_data.name,
        "description": chatbot_data.description,
        "kb_ids": chatbot_data.kb_ids,
        "config": (chatbot_data.config or ChatbotConfig()).model_dump(),
        "embed_key": generate_embed_key(),
        "is_active": True,
        "total_conversations": 0,
        "total_messages": 0,
        "created_at": datetime.utcnow(),
    }

    result = await db.chatbots.insert_one(chatbot_doc)
    chatbot_id = str(result.inserted_id)

    logger.info("Chatbot created", chatbot_id=chatbot_id, tenant_id=tenant_id)

    return Chatbot(
        id=chatbot_id,
        tenant_id=tenant_id,
        name=chatbot_data.name,
        description=chatbot_data.description,
        kb_ids=chatbot_data.kb_ids,
        config=chatbot_data.config or ChatbotConfig(),
        is_active=True,
        created_at=chatbot_doc["created_at"],
    )


@router.get("", response_model=List[Chatbot])
async def list_chatbots(
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """List all chatbots for the current tenant."""
    cursor = db.chatbots.find({"tenant_id": tenant_id}).sort("created_at", -1)
    chatbots = []
    async for bot in cursor:
        chatbots.append(Chatbot(
            id=str(bot["_id"]),
            tenant_id=bot["tenant_id"],
            name=bot["name"],
            description=bot.get("description"),
            kb_ids=bot.get("kb_ids", []),
            config=ChatbotConfig(**bot.get("config", {})),
            is_active=bot.get("is_active", True),
            created_at=bot["created_at"],
            updated_at=bot.get("updated_at"),
        ))
    return chatbots


@router.get("/{bot_id}", response_model=Chatbot)
async def get_chatbot(
    bot_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get a specific chatbot."""
    try:
        bot = await db.chatbots.find_one({
            "_id": ObjectId(bot_id),
            "tenant_id": tenant_id
        })
    except:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    return Chatbot(
        id=str(bot["_id"]),
        tenant_id=bot["tenant_id"],
        name=bot["name"],
        description=bot.get("description"),
        kb_ids=bot.get("kb_ids", []),
        config=ChatbotConfig(**bot.get("config", {})),
        is_active=bot.get("is_active", True),
        created_at=bot["created_at"],
        updated_at=bot.get("updated_at"),
    )


@router.put("/{bot_id}", response_model=Chatbot)
async def update_chatbot(
    bot_id: str,
    update_data: ChatbotUpdate,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Update a chatbot."""
    update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items()}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Validate KB IDs if provided
    if update_data.kb_ids:
        for kb_id in update_data.kb_ids:
            try:
                kb = await db.knowledge_bases.find_one({
                    "_id": ObjectId(kb_id),
                    "tenant_id": tenant_id
                })
                if not kb:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Knowledge base {kb_id} not found"
                    )
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid knowledge base ID: {kb_id}"
                )

    # Convert config to dict if present
    if "config" in update_dict and update_dict["config"]:
        update_dict["config"] = update_dict["config"].model_dump()

    update_dict["updated_at"] = datetime.utcnow()

    try:
        result = await db.chatbots.update_one(
            {"_id": ObjectId(bot_id), "tenant_id": tenant_id},
            {"$set": update_dict}
        )
    except:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Fetch updated chatbot
    return await get_chatbot(bot_id, tenant_id, db)


@router.delete("/{bot_id}")
async def delete_chatbot(
    bot_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Delete a chatbot."""
    try:
        result = await db.chatbots.delete_one({
            "_id": ObjectId(bot_id),
            "tenant_id": tenant_id
        })
    except:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Also delete conversations
    await db.conversations.delete_many({"bot_id": bot_id, "tenant_id": tenant_id})

    logger.info("Chatbot deleted", bot_id=bot_id, tenant_id=tenant_id)

    return {"status": "deleted", "bot_id": bot_id}


@router.get("/{bot_id}/embed-code")
async def get_embed_code(
    bot_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get the embed code for a chatbot."""
    try:
        bot = await db.chatbots.find_one(
            {"_id": ObjectId(bot_id), "tenant_id": tenant_id},
            {"embed_key": 1, "config": 1}
        )
    except:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    embed_key = bot["embed_key"]
    config = bot.get("config", {})
    position = config.get("theme", {}).get("position", "bottom-right")

    script_code = f'''<!-- ZAIA Chatbot Widget -->
<script>
(function(w,d,s,o,f,js,fjs){{
  w['ZaiaChat']=o;w[o]=w[o]||function(){{(w[o].q=w[o].q||[]).push(arguments)}};
  js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
  js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
}}(window,document,'script','zaia','https://cdn.zaia.ai/widget.min.js'));

zaia('init', {{
  botId: '{bot_id}',
  apiKey: '{embed_key}',
  position: '{position}'
}});
</script>'''

    return {
        "bot_id": bot_id,
        "embed_key": embed_key,
        "script": script_code
    }
