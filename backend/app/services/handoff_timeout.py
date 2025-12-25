"""
Handoff Timeout Service

Handles automatic contact collection when human agents don't respond
within the configured timeout period.

Flow:
1. trigger_timeout_collection() - Initiates the timeout flow
2. process_timeout_response() - Handles visitor replies during collection
3. extract_contact_info() - LLM extraction of name/phone/email
4. complete_timeout_collection() - Creates lead and resolves handoff
"""

import logging
import json
import re
from typing import Optional, Dict, Any
from datetime import datetime

from ..core.database import get_mongodb, get_redis
from ..schemas.handoff import HandoffStatus
from ..schemas.leads import LeadSource

logger = logging.getLogger(__name__)


# Timeout messages in English and Arabic
TIMEOUT_MESSAGES = {
    "en": {
        "initial": """I apologize, but our team is currently unavailable to continue this chat.

To ensure we can get back to you as soon as possible, could you please share your contact information?

I'll need your:
- **Name**
- **Phone/WhatsApp** number
- **Email** address

Our team will reach out to you shortly!""",
        "followup": "Thanks! Could you also provide your {missing} so we can reach you?",
        "complete": """Thank you, {name}! Your information has been saved.

Our team will contact you at {contact} as soon as possible. Have a great day!""",
        "partial_complete": """Thank you! We've saved your information.

Our team will get back to you soon. Have a great day!"""
    },
    "ar": {
        "initial": """نعتذر، فريقنا غير متاح حالياً لمتابعة هذه المحادثة.

لنتمكن من التواصل معك في أقرب وقت، يرجى مشاركة معلومات التواصل الخاصة بك:

- **اسمك**
- رقم **الهاتف/واتساب**
- **البريد الإلكتروني**

سيتواصل معك فريقنا قريباً!""",
        "followup": "شكراً! هل يمكنك أيضاً تقديم {missing} حتى نتمكن من التواصل معك؟",
        "complete": """شكراً {name}! تم حفظ معلوماتك.

سيتواصل معك فريقنا على {contact} في أقرب وقت. أتمنى لك يوماً سعيداً!""",
        "partial_complete": """شكراً! تم حفظ معلوماتك.

سيتواصل معك فريقنا قريباً. أتمنى لك يوماً سعيداً!"""
    }
}


def detect_language(messages: list) -> str:
    """
    Detect conversation language from messages.
    Returns 'ar' for Arabic, 'en' for English (default).
    """
    # Check last few user messages for Arabic characters
    arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+')

    for msg in reversed(messages[-5:]):
        content = msg.get("content", "")
        if arabic_pattern.search(content):
            return "ar"

    return "en"


async def trigger_timeout_collection(handoff_id: str, bot_id: str, tenant_id: str):
    """
    Trigger the timeout contact collection flow.

    Updates handoff status and sends the initial timeout message.
    """
    db = get_mongodb()
    redis = get_redis()

    # Get handoff to detect language
    handoff = await db.handoffs.find_one({"_id": handoff_id})
    if not handoff:
        logger.warning(f"Handoff {handoff_id} not found for timeout")
        return

    # Detect language from conversation context
    context = handoff.get("conversation_context", [])
    lang = detect_language(context)

    # Update handoff status
    await db.handoffs.update_one(
        {"_id": handoff_id},
        {
            "$set": {
                "status": HandoffStatus.TIMEOUT_COLLECTING.value,
                "timeout_triggered_at": datetime.utcnow(),
                "timeout_language": lang,
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Send timeout message
    from .handoff import add_handoff_message

    initial_msg = TIMEOUT_MESSAGES[lang]["initial"]
    msg = await add_handoff_message(
        handoff_id=handoff_id,
        content=initial_msg,
        sender_type="bot",
        sender_name="AI Assistant"
    )

    # Broadcast timeout initiated event via internal HTTP endpoint
    # (Celery runs in a separate process, so we need HTTP to reach FastAPI's WebSocket manager)
    # Use Docker service name 'backend' for container-to-container communication
    import httpx
    import os
    backend_host = os.environ.get("BACKEND_HOST", "backend")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"http://{backend_host}:8000/api/v1/handoff/internal/broadcast/" + handoff_id,
                json={
                    "type": "timeout_initiated",
                    "message": msg,
                    "status": HandoffStatus.TIMEOUT_COLLECTING.value
                },
                timeout=5.0
            )
            logger.info(f"Timeout broadcast response: {response.json()}")
    except Exception as e:
        logger.warning(f"Failed to broadcast timeout via HTTP: {e}")
        # Fallback to Redis (for any other listeners)
        await redis.publish(
            f"handoff:{tenant_id}:{handoff_id}",
            json.dumps({
                "type": "timeout_initiated",
                "message": msg,
                "status": HandoffStatus.TIMEOUT_COLLECTING.value
            })
        )

    logger.info(f"Handoff timeout triggered for {handoff_id}, language: {lang}")


async def process_timeout_response(
    handoff_id: str,
    bot_id: str,
    tenant_id: str,
    visitor_message: str
) -> Optional[Dict[str, Any]]:
    """
    Process visitor response during timeout collection.

    Extracts contact info and determines if collection is complete.
    Returns the AI's next response or None if not in timeout mode.
    """
    db = get_mongodb()

    handoff = await db.handoffs.find_one({"_id": handoff_id})
    if not handoff:
        return None

    if handoff.get("status") != HandoffStatus.TIMEOUT_COLLECTING.value:
        return None

    lang = handoff.get("timeout_language", "en")

    # Get existing partial contact info
    existing_info = handoff.get("timeout_contact_info", {})

    # Get all timeout messages for extraction
    timeout_messages = []
    timeout_started = False
    for msg in handoff.get("messages", []):
        if msg.get("sender_type") == "bot":
            timeout_started = True
        if timeout_started:
            timeout_messages.append({
                "role": "assistant" if msg.get("sender_type") == "bot" else "user",
                "content": msg.get("content", "")
            })

    # Add current visitor message
    timeout_messages.append({"role": "user", "content": visitor_message})

    # Extract contact info using LLM
    contact_info = await extract_contact_info(timeout_messages, existing_info)

    # Store partial info in handoff
    await db.handoffs.update_one(
        {"_id": handoff_id},
        {
            "$set": {
                "timeout_contact_info": contact_info,
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Check if we have enough info (name OR contact method)
    has_name = bool(contact_info.get("name"))
    has_phone = bool(contact_info.get("phone"))
    has_email = bool(contact_info.get("email"))
    has_contact = has_phone or has_email

    # Accept partial info: name OR (phone/email)
    if has_name or has_contact:
        # We have at least something useful - complete the collection
        return await complete_timeout_collection(
            handoff_id, bot_id, tenant_id, contact_info, lang
        )

    # Need more info - generate follow-up
    messages = TIMEOUT_MESSAGES[lang]
    missing_en = []
    missing_ar = []

    if not has_name:
        missing_en.append("name")
        missing_ar.append("الاسم")
    if not has_contact:
        missing_en.append("phone or email")
        missing_ar.append("الهاتف أو البريد الإلكتروني")

    missing = " و ".join(missing_ar) if lang == "ar" else " and ".join(missing_en)
    followup = messages["followup"].format(missing=missing)

    return {
        "complete": False,
        "response": followup,
        "contact_info": contact_info
    }


async def extract_contact_info(messages: list, existing: dict = None) -> Dict[str, Any]:
    """
    Extract contact information from conversation using LLM.

    Merges with existing info if provided.
    """
    existing = existing or {}

    conversation_text = "\n".join([
        f"{m.get('role', 'user')}: {m.get('content', '')}"
        for m in messages[-10:]
    ])

    extraction_prompt = f"""Extract contact information from this conversation. Return JSON only.

Conversation:
{conversation_text}

Return this exact JSON format:
{{"name": "person's name or null", "phone": "phone/WhatsApp number or null", "email": "email address or null"}}

IMPORTANT:
- Look for names in any language (Arabic names like محمد, أحمد, English names)
- Look for phone numbers (with or without country code, like 01028308630, +201028308630)
- Look for email addresses (anything with @)
- Return null for fields you cannot find
- Return ONLY valid JSON, nothing else"""

    try:
        from .llm import generate_response_simple
        response = await generate_response_simple(
            prompt=extraction_prompt,
            max_tokens=200,
            temperature=0.1
        )

        # Parse JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            extracted = json.loads(json_match.group())

            # Merge with existing info (don't overwrite with null)
            result = {**existing}
            for key in ["name", "phone", "email"]:
                if extracted.get(key):
                    result[key] = extracted[key]

            return result

        return existing
    except Exception as e:
        logger.error(f"Contact extraction failed: {e}")
        return existing


async def complete_timeout_collection(
    handoff_id: str,
    bot_id: str,
    tenant_id: str,
    contact_info: Dict[str, Any],
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Complete the timeout collection by creating lead and resolving handoff.
    """
    db = get_mongodb()
    redis = get_redis()

    # Get handoff for session_id and conversation context
    handoff = await db.handoffs.find_one({"_id": handoff_id})
    session_id = handoff.get("session_id")

    # Build conversation summary from context
    context_msgs = handoff.get("conversation_context", [])
    summary = " | ".join([
        m.get("content", "")[:100]
        for m in context_msgs[-5:]
        if m.get("role") == "user"
    ])

    # Create lead with HANDOFF_TIMEOUT source
    from .leads import create_lead

    lead = await create_lead(
        bot_id=bot_id,
        tenant_id=tenant_id,
        data={
            "name": contact_info.get("name"),
            "email": contact_info.get("email"),
            "phone": contact_info.get("phone"),
            "notes": f"Collected after handoff timeout. Handoff ID: {handoff_id}",
            "custom_fields": {
                "handoff_id": handoff_id,
                "handoff_trigger": handoff.get("trigger"),
                "timeout_collected": True,
                "conversation_summary": summary[:500] if summary else None
            }
        },
        session_id=session_id,
        source=LeadSource.HANDOFF_TIMEOUT
    )

    # Update handoff as resolved
    await db.handoffs.update_one(
        {"_id": handoff_id},
        {
            "$set": {
                "status": HandoffStatus.RESOLVED.value,
                "resolution": "timeout_lead_collected",
                "lead_id": lead["_id"],
                "resolved_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Prepare completion message
    messages = TIMEOUT_MESSAGES[lang]
    name = contact_info.get("name", "")
    contact = contact_info.get("phone") or contact_info.get("email") or ""

    if name and contact:
        completion_msg = messages["complete"].format(name=name, contact=contact)
    else:
        completion_msg = messages["partial_complete"]

    # Broadcast resolution
    await redis.publish(
        f"handoff:{tenant_id}:{handoff_id}",
        json.dumps({
            "type": "status_change",
            "status": HandoffStatus.RESOLVED.value
        })
    )

    logger.info(f"Handoff {handoff_id} resolved with timeout lead {lead['_id']}")

    return {
        "complete": True,
        "response": completion_msg,
        "lead_id": lead["_id"],
        "contact_info": contact_info
    }


async def get_handoff(handoff_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """Get a handoff by ID."""
    db = get_mongodb()
    return await db.handoffs.find_one({"_id": handoff_id, "tenant_id": tenant_id})
