"""
Greeting API for Personal Chatbot Mode.
Returns personalized greeting for returning visitors.
"""

from fastapi import APIRouter, Query, HTTPException
from ..core.database import get_mongodb
from ..services.context.user_profile_manager import UserProfileManager

router = APIRouter(prefix="/greeting", tags=["Greeting"])


@router.get("/{bot_id}")
async def get_greeting(
    bot_id: str,
    visitor_id: str = Query(None, description="Anonymous visitor ID")
):
    """
    Get personalized greeting for visitor.

    Returns personalized greeting if user is recognized,
    otherwise returns the bot's default welcome message.
    """
    db = get_mongodb()

    # Get bot config
    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    default_greeting = bot.get("welcome_message", "Hello! How can I help you today?")

    # If not personal mode or no visitor_id, return default
    if not bot.get("is_personal", False) or not visitor_id:
        return {
            "greeting": default_greeting,
            "personalized": False
        }

    # Try to get personalized greeting
    try:
        profile_manager = UserProfileManager(bot["tenant_id"], bot_id)
        greeting = await profile_manager.get_greeting_for_visitor(
            visitor_id=visitor_id,
            default_greeting=default_greeting
        )

        is_personalized = greeting != default_greeting

        return {
            "greeting": greeting,
            "personalized": is_personalized
        }

    except Exception as e:
        # Fallback to default on any error
        return {
            "greeting": default_greeting,
            "personalized": False
        }
