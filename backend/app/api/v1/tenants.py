"""Tenant management API endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog

from ...models import Tenant, TenantUpdate, TenantInDB
from ...dependencies import get_mongo_db
from ...middleware import get_current_tenant

logger = structlog.get_logger()

router = APIRouter()


@router.get("/me", response_model=Tenant)
async def get_current_tenant_info(
    current_tenant: TenantInDB = Depends(get_current_tenant),
) -> Tenant:
    """
    Get current authenticated tenant's information.

    Args:
        current_tenant: Currently authenticated tenant

    Returns:
        Tenant information (without sensitive data like password_hash and API keys)
    """
    # Convert TenantInDB to Tenant (excludes password_hash and api_keys)
    tenant_info = Tenant(
        id=current_tenant.id,
        name=current_tenant.name,
        email=current_tenant.email,
        plan=current_tenant.plan,
        usage=current_tenant.usage,
        created_at=current_tenant.created_at,
        updated_at=current_tenant.updated_at,
    )

    return tenant_info


@router.put("/me", response_model=Tenant)
async def update_current_tenant(
    tenant_update: TenantUpdate,
    current_tenant: TenantInDB = Depends(get_current_tenant),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> Tenant:
    """
    Update current authenticated tenant's information.

    Args:
        tenant_update: Tenant update data
        current_tenant: Currently authenticated tenant
        db: MongoDB database instance

    Returns:
        Updated tenant information

    Raises:
        HTTPException: If update fails
    """
    # Build update document with only provided fields
    update_data = {}

    if tenant_update.name is not None:
        update_data["name"] = tenant_update.name

    # If no fields to update, return current tenant
    if not update_data:
        return Tenant(
            id=current_tenant.id,
            name=current_tenant.name,
            email=current_tenant.email,
            plan=current_tenant.plan,
            usage=current_tenant.usage,
            created_at=current_tenant.created_at,
            updated_at=current_tenant.updated_at,
        )

    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()

    # Update tenant in database
    result = await db.tenants.update_one(
        {"_id": current_tenant.id},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tenant"
        )

    # Fetch updated tenant
    updated_tenant_doc = await db.tenants.find_one({"_id": current_tenant.id})

    if not updated_tenant_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found after update"
        )

    # Convert to Tenant model
    updated_tenant_doc["id"] = str(updated_tenant_doc.pop("_id"))

    logger.info(
        "Tenant updated",
        tenant_id=current_tenant.id,
        updated_fields=list(update_data.keys())
    )

    return Tenant(**updated_tenant_doc)
