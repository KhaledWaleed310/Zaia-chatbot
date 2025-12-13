from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Optional
from ..schemas.leads import (
    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse,
    LeadFormConfig, LeadFormSubmission, LeadExportFormat
)
from ..services.leads import (
    create_lead, get_lead, list_leads, update_lead, delete_lead,
    export_leads, get_lead_stats, get_lead_form_config, update_lead_form_config
)
from ..api.auth import get_current_user
from ..core.database import get_mongodb

router = APIRouter(prefix="/leads", tags=["Leads"])


def lead_to_response(lead: dict) -> dict:
    """Convert DB lead to response format."""
    return {
        "id": lead["_id"],
        "bot_id": lead["bot_id"],
        "tenant_id": lead["tenant_id"],
        "name": lead.get("name"),
        "email": lead.get("email"),
        "phone": lead.get("phone"),
        "company": lead.get("company"),
        "status": lead.get("status", "new"),
        "source": lead.get("source", "chatbot"),
        "custom_fields": lead.get("custom_fields", {}),
        "session_id": lead.get("session_id"),
        "conversation_summary": lead.get("conversation_summary"),
        "notes": lead.get("notes"),
        "assigned_to": lead.get("assigned_to"),
        "tags": lead.get("tags", []),
        "created_at": lead["created_at"],
        "updated_at": lead["updated_at"]
    }


@router.get("/{bot_id}", response_model=LeadListResponse)
async def list_bot_leads(
    bot_id: str,
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """List leads for a chatbot."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    result = await list_leads(
        bot_id=bot_id,
        tenant_id=user["tenant_id"],
        page=page,
        per_page=per_page,
        status=status,
        search=search
    )

    return LeadListResponse(
        items=[lead_to_response(l) for l in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        pages=result["pages"]
    )


@router.post("/{bot_id}", response_model=LeadResponse)
async def create_bot_lead(
    bot_id: str,
    lead_data: LeadCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new lead manually."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    lead = await create_lead(
        bot_id=bot_id,
        tenant_id=user["tenant_id"],
        data=lead_data.model_dump(),
        session_id=lead_data.session_id,
        source=lead_data.source
    )

    return lead_to_response(lead)


@router.get("/{bot_id}/stats")
async def get_bot_lead_stats(
    bot_id: str,
    days: int = 30,
    user: dict = Depends(get_current_user)
):
    """Get lead statistics for a chatbot."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    return await get_lead_stats(bot_id, user["tenant_id"], days)


@router.get("/{bot_id}/export")
async def export_bot_leads(
    bot_id: str,
    format: LeadExportFormat = LeadExportFormat.CSV,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Export leads to CSV or JSON."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    content = await export_leads(bot_id, user["tenant_id"], format.value, status)

    if format == LeadExportFormat.CSV:
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=leads_{bot_id}.csv"}
        )
    else:
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=leads_{bot_id}.json"}
        )


@router.get("/{bot_id}/form-config")
async def get_bot_lead_form(
    bot_id: str,
    user: dict = Depends(get_current_user)
):
    """Get lead form configuration for a chatbot."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    config = bot.get("lead_form_config") or {
        "enabled": False,
        "title": "Get in touch",
        "description": "Leave your details and we'll get back to you",
        "trigger": "manual",
        "trigger_after_messages": 3,
        "fields": [
            {"id": "name", "label": "Name", "type": "text", "required": True},
            {"id": "email", "label": "Email", "type": "email", "required": True},
            {"id": "phone", "label": "Phone", "type": "phone", "required": False}
        ],
        "submit_button_text": "Submit",
        "success_message": "Thanks! We'll be in touch soon."
    }

    return config


@router.put("/{bot_id}/form-config")
async def update_bot_lead_form(
    bot_id: str,
    config: LeadFormConfig,
    user: dict = Depends(get_current_user)
):
    """Update lead form configuration for a chatbot."""
    db = get_mongodb()

    # Verify ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": user["tenant_id"]})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Get existing config and merge with updates
    existing_config = bot.get("lead_form_config") or {
        "enabled": False,
        "title": "Get in touch",
        "description": "Leave your details and we'll get back to you",
        "trigger": "manual",
        "trigger_after_messages": 3,
        "fields": [
            {"id": "name", "label": "Name", "type": "text", "required": True},
            {"id": "email", "label": "Email", "type": "email", "required": True},
            {"id": "phone", "label": "Phone", "type": "phone", "required": False}
        ],
        "submit_button_text": "Submit",
        "success_message": "Thanks! We'll be in touch soon."
    }

    # Merge updates (only update non-None values)
    update_data = config.model_dump(exclude_unset=True, exclude_none=True)

    # Handle fields specially
    if "fields" in update_data and update_data["fields"]:
        update_data["fields"] = [f.model_dump() if hasattr(f, 'model_dump') else f for f in config.fields]

    merged_config = {**existing_config, **update_data}

    await update_lead_form_config(bot_id, user["tenant_id"], merged_config)

    return merged_config


# Public endpoint to get lead form config (no auth required) - MUST be before /{bot_id}/{lead_id}
@router.get("/{bot_id}/public-form-config")
async def get_public_lead_form(bot_id: str):
    """Public endpoint to get lead form config for chat widget."""
    db = get_mongodb()

    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    config = bot.get("lead_form_config") or {
        "enabled": False,
        "title": "Get in touch",
        "description": "Leave your details and we'll get back to you",
        "trigger": "manual",
        "trigger_after_messages": 3,
        "fields": [
            {"id": "name", "label": "Name", "type": "text", "required": True},
            {"id": "email", "label": "Email", "type": "email", "required": True},
            {"id": "phone", "label": "Phone", "type": "phone", "required": False}
        ],
        "submit_button_text": "Submit",
        "success_message": "Thanks! We'll be in touch soon."
    }

    return config


# Public endpoint for form submissions (no auth required) - MUST be before /{bot_id}/{lead_id}
@router.post("/{bot_id}/submit")
async def submit_lead_form(
    bot_id: str,
    submission: LeadFormSubmission
):
    """Public endpoint to submit lead form from chat widget."""
    db = get_mongodb()

    # Get chatbot
    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Check if lead form is enabled
    form_config = bot.get("lead_form_config", {})
    if not form_config.get("enabled", False):
        raise HTTPException(status_code=400, detail="Lead form not enabled")

    # Extract standard fields
    fields = submission.fields
    lead_data = {
        "name": fields.get("name"),
        "email": fields.get("email"),
        "phone": fields.get("phone"),
        "company": fields.get("company"),
        "custom_fields": {k: v for k, v in fields.items()
                        if k not in ["name", "email", "phone", "company"]}
    }

    lead = await create_lead(
        bot_id=bot_id,
        tenant_id=bot["tenant_id"],
        data=lead_data,
        session_id=submission.session_id
    )

    return {
        "success": True,
        "message": form_config.get("success_message", "Thanks! We'll be in touch soon.")
    }


# Routes with {lead_id} parameter - MUST be after public endpoints
@router.get("/{bot_id}/{lead_id}", response_model=LeadResponse)
async def get_single_lead(
    bot_id: str,
    lead_id: str,
    user: dict = Depends(get_current_user)
):
    """Get a single lead by ID."""
    lead = await get_lead(lead_id, user["tenant_id"])
    if not lead or lead["bot_id"] != bot_id:
        raise HTTPException(status_code=404, detail="Lead not found")

    return lead_to_response(lead)


@router.patch("/{bot_id}/{lead_id}", response_model=LeadResponse)
async def update_single_lead(
    bot_id: str,
    lead_id: str,
    data: LeadUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a lead."""
    lead = await get_lead(lead_id, user["tenant_id"])
    if not lead or lead["bot_id"] != bot_id:
        raise HTTPException(status_code=404, detail="Lead not found")

    updated = await update_lead(lead_id, user["tenant_id"], data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Lead not found")

    return lead_to_response(updated)


@router.delete("/{bot_id}/{lead_id}")
async def delete_single_lead(
    bot_id: str,
    lead_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a lead."""
    lead = await get_lead(lead_id, user["tenant_id"])
    if not lead or lead["bot_id"] != bot_id:
        raise HTTPException(status_code=404, detail="Lead not found")

    success = await delete_lead(lead_id, user["tenant_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {"message": "Lead deleted"}
