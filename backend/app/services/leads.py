from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid
import csv
import io
import json
from ..core.database import get_mongodb
from ..schemas.leads import LeadStatus, LeadSource


async def create_lead(
    bot_id: str,
    tenant_id: str,
    data: Dict[str, Any],
    session_id: Optional[str] = None,
    source: LeadSource = LeadSource.CHATBOT
) -> Dict[str, Any]:
    """Create a new lead from form submission or API."""
    db = get_mongodb()

    lead = {
        "_id": str(uuid.uuid4()),
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "name": data.get("name"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "company": data.get("company"),
        "status": LeadStatus.NEW.value,
        "source": source.value,
        "custom_fields": data.get("custom_fields", {}),
        "session_id": session_id,
        "conversation_summary": None,
        "notes": data.get("notes"),
        "assigned_to": None,
        "tags": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    # Get conversation summary if session exists
    if session_id:
        conversation = await db.conversations.find_one({"session_id": session_id})
        if conversation:
            messages = conversation.get("messages", [])
            if messages:
                # Create brief summary from messages
                user_messages = [m["content"] for m in messages if m.get("role") == "user"]
                lead["conversation_summary"] = " | ".join(user_messages[:5])[:500]

    await db.leads.insert_one(lead)

    # Trigger CRM sync if configured
    await sync_lead_to_crm(tenant_id, bot_id, lead)

    return lead


async def get_lead(lead_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """Get a lead by ID."""
    db = get_mongodb()
    return await db.leads.find_one({"_id": lead_id, "tenant_id": tenant_id})


async def list_leads(
    bot_id: str,
    tenant_id: str,
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    search: Optional[str] = None
) -> Dict[str, Any]:
    """List leads with filtering and pagination."""
    db = get_mongodb()

    query = {"bot_id": bot_id, "tenant_id": tenant_id}

    # Filter out "undefined" string that frontend may send
    if status and status != "undefined":
        query["status"] = status

    # Filter out "undefined" string that frontend may send
    if search and search != "undefined":
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]

    total = await db.leads.count_documents(query)
    pages = (total + per_page - 1) // per_page

    skip = (page - 1) * per_page
    leads = await db.leads.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)

    return {
        "items": leads,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages
    }


async def update_lead(
    lead_id: str,
    tenant_id: str,
    data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update a lead."""
    db = get_mongodb()

    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    result = await db.leads.find_one_and_update(
        {"_id": lead_id, "tenant_id": tenant_id},
        {"$set": update_data},
        return_document=True
    )

    return result


async def delete_lead(lead_id: str, tenant_id: str) -> bool:
    """Delete a lead."""
    db = get_mongodb()
    result = await db.leads.delete_one({"_id": lead_id, "tenant_id": tenant_id})
    return result.deleted_count > 0


async def export_leads(
    bot_id: str,
    tenant_id: str,
    format: str = "csv",
    status: Optional[str] = None
) -> str:
    """Export leads to CSV or JSON format."""
    db = get_mongodb()

    query = {"bot_id": bot_id, "tenant_id": tenant_id}
    if status:
        query["status"] = status

    leads = await db.leads.find(query).sort("created_at", -1).to_list(None)

    if format == "json":
        # Convert dates to strings for JSON
        for lead in leads:
            lead["id"] = lead.pop("_id")
            lead["created_at"] = lead["created_at"].isoformat()
            lead["updated_at"] = lead["updated_at"].isoformat()
        return json.dumps(leads, indent=2)

    # CSV format
    output = io.StringIO()

    if leads:
        # Standard fields
        fieldnames = ["id", "name", "email", "phone", "company", "status", "source",
                     "tags", "notes", "created_at", "updated_at"]

        # Add custom fields from first lead
        custom_fields = set()
        for lead in leads:
            custom_fields.update(lead.get("custom_fields", {}).keys())
        fieldnames.extend(sorted(custom_fields))

        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()

        for lead in leads:
            row = {
                "id": lead["_id"],
                "name": lead.get("name", ""),
                "email": lead.get("email", ""),
                "phone": lead.get("phone", ""),
                "company": lead.get("company", ""),
                "status": lead.get("status", ""),
                "source": lead.get("source", ""),
                "tags": ",".join(lead.get("tags", [])),
                "notes": lead.get("notes", ""),
                "created_at": lead["created_at"].isoformat(),
                "updated_at": lead["updated_at"].isoformat()
            }
            # Add custom fields
            for field in custom_fields:
                row[field] = lead.get("custom_fields", {}).get(field, "")
            writer.writerow(row)

    return output.getvalue()


async def get_lead_stats(bot_id: str, tenant_id: str, days: int = 30) -> Dict[str, Any]:
    """Get lead statistics for dashboard."""
    db = get_mongodb()
    from datetime import timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    query = {"bot_id": bot_id, "tenant_id": tenant_id}

    # Total leads
    total_leads = await db.leads.count_documents(query)

    # New leads in period
    new_leads = await db.leads.count_documents({
        **query,
        "created_at": {"$gte": start_date}
    })

    # By status
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = {}
    async for doc in db.leads.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]

    # By source
    source_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]
    source_counts = {}
    async for doc in db.leads.aggregate(source_pipeline):
        source_counts[doc["_id"]] = doc["count"]

    # Conversion rate (converted / total)
    converted = status_counts.get("converted", 0)
    conversion_rate = (converted / total_leads * 100) if total_leads > 0 else 0

    # Daily leads trend
    daily_pipeline = [
        {"$match": {**query, "created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"},
                "day": {"$dayOfMonth": "$created_at"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]

    daily_leads = []
    async for doc in db.leads.aggregate(daily_pipeline):
        date = f"{doc['_id']['year']}-{doc['_id']['month']:02d}-{doc['_id']['day']:02d}"
        daily_leads.append({"date": date, "count": doc["count"]})

    # Calculate this week's leads
    week_start = datetime.utcnow() - timedelta(days=7)
    this_week_count = await db.leads.count_documents({
        **query,
        "created_at": {"$gte": week_start}
    })

    return {
        # Fields expected by frontend
        "total": total_leads,
        "this_week": this_week_count,
        "qualified": status_counts.get("qualified", 0),
        "converted": status_counts.get("converted", 0),
        # Additional stats
        "total_leads": total_leads,
        "new_leads": new_leads,
        "conversion_rate": round(conversion_rate, 1),
        "by_status": status_counts,
        "by_source": source_counts,
        "daily_trend": daily_leads
    }


async def sync_lead_to_crm(tenant_id: str, bot_id: str, lead: Dict[str, Any]):
    """Sync a lead to configured CRM integrations."""
    db = get_mongodb()

    # Get CRM integrations for this tenant
    crm_config = await db.crm_integrations.find_one({
        "tenant_id": tenant_id,
        "enabled": True
    })

    if not crm_config:
        return

    # Would implement actual CRM API calls here
    # For now just log the sync
    await db.crm_sync_logs.insert_one({
        "_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "bot_id": bot_id,
        "lead_id": lead["_id"],
        "provider": crm_config.get("provider"),
        "status": "pending",
        "created_at": datetime.utcnow()
    })


async def get_lead_form_config(bot_id: str) -> Optional[Dict[str, Any]]:
    """Get lead form configuration for a bot."""
    db = get_mongodb()
    bot = await db.chatbots.find_one({"_id": bot_id})
    if bot:
        return bot.get("lead_form_config")
    return None


async def update_lead_form_config(
    bot_id: str,
    tenant_id: str,
    config: Dict[str, Any]
) -> bool:
    """Update lead form configuration for a bot."""
    db = get_mongodb()
    result = await db.chatbots.update_one(
        {"_id": bot_id, "tenant_id": tenant_id},
        {"$set": {"lead_form_config": config}}
    )
    return result.modified_count > 0
