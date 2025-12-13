from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from ..services.translation import (
    detect_language,
    translate_text,
    get_widget_translations,
    get_supported_languages,
    SUPPORTED_LANGUAGES
)
from ..api.auth import get_current_user
from ..core.database import get_mongodb

router = APIRouter(prefix="/translation", tags=["Translation"])


class TranslateRequest(BaseModel):
    text: str
    target_language: str
    source_language: Optional[str] = None


class DetectRequest(BaseModel):
    text: str


class LanguageConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    default_language: Optional[str] = None
    auto_detect: Optional[bool] = None
    supported_languages: Optional[list] = None


@router.get("/languages")
async def list_languages():
    """Get list of supported languages."""
    return {
        "languages": get_supported_languages(),
        "default": "en"
    }


@router.post("/detect")
async def detect_text_language(request: DetectRequest):
    """Detect the language of text."""
    language = await detect_language(request.text)
    return {
        "language": language,
        "language_name": SUPPORTED_LANGUAGES.get(language, "Unknown")
    }


@router.post("/translate")
async def translate(request: TranslateRequest, user: dict = Depends(get_current_user)):
    """Translate text to target language."""
    if request.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported target language")

    translated = await translate_text(
        request.text,
        request.target_language,
        request.source_language
    )

    return {
        "original": request.text,
        "translated": translated,
        "target_language": request.target_language,
        "source_language": request.source_language
    }


@router.get("/widget/{language}")
async def get_widget_i18n(language: str):
    """Get widget translations for a language (public endpoint)."""
    translations = get_widget_translations(language)
    return {
        "language": language,
        "translations": translations
    }


@router.get("/chatbots/{bot_id}/config")
async def get_bot_language_config(
    bot_id: str,
    user: dict = Depends(get_current_user)
):
    """Get language configuration for a chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    return bot.get("language_config") or {
        "enabled": False,
        "default_language": "en",
        "auto_detect": True,
        "supported_languages": ["en"]
    }


@router.put("/chatbots/{bot_id}/config")
async def update_bot_language_config(
    bot_id: str,
    config: LanguageConfigUpdate,
    user: dict = Depends(get_current_user)
):
    """Update language configuration for a chatbot."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get existing config and merge with updates
    existing_config = bot.get("language_config") or {
        "enabled": False,
        "default_language": "en",
        "auto_detect": True,
        "supported_languages": ["en"]
    }

    # Merge updates (only update non-None values)
    update_data = config.model_dump(exclude_unset=True, exclude_none=True)

    # Validate languages if provided
    if "supported_languages" in update_data:
        for lang in update_data["supported_languages"]:
            if lang not in SUPPORTED_LANGUAGES:
                raise HTTPException(status_code=400, detail=f"Unsupported language: {lang}")

    if "default_language" in update_data and update_data["default_language"] not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Invalid default language")

    merged_config = {**existing_config, **update_data}

    await db.chatbots.update_one(
        {"_id": bot_id},
        {"$set": {"language_config": merged_config}}
    )

    return merged_config


# Public endpoint for chat widget to get language config
@router.get("/chatbots/{bot_id}/public-config")
async def get_public_language_config(bot_id: str):
    """Get language config for chat widget (public endpoint)."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    config = bot.get("language_config") or {
        "enabled": False,
        "default_language": "en",
        "auto_detect": True,
        "supported_languages": ["en"]
    }

    # Return only what the widget needs
    return {
        "enabled": config.get("enabled", False),
        "default_language": config.get("default_language", "en"),
        "auto_detect": config.get("auto_detect", True),
        "supported_languages": [
            {"code": lang, "name": SUPPORTED_LANGUAGES.get(lang, lang)}
            for lang in config.get("supported_languages", ["en"])
        ]
    }
