from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import structlog

from ...models import KnowledgeBase, KnowledgeBaseCreate, KnowledgeBaseInDB, ProcessingStatus
from ...dependencies import get_mongo_db
from ...middleware.auth import get_current_tenant
from ...config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/knowledge")


@router.post("/upload", response_model=KnowledgeBase)
async def upload_knowledge(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Upload a file to create a new knowledge base."""
    # Validate file extension
    file_ext = f".{file.filename.split('.')[-1].lower()}" if '.' in file.filename else ""
    if file_ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {settings.allowed_extensions}"
        )

    # Check file size
    content = await file.read()
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.max_upload_size_mb}MB"
        )
    await file.seek(0)

    # Create knowledge base record
    kb_data = {
        "tenant_id": tenant_id,
        "name": name,
        "description": description,
        "source_type": "file",
        "status": ProcessingStatus.PENDING.value,
        "stats": {"chunks": 0, "tokens": 0, "entities": 0, "files": 1},
        "source_files": [file.filename],
        "source_urls": [],
        "created_at": datetime.utcnow(),
    }

    result = await db.knowledge_bases.insert_one(kb_data)
    kb_id = str(result.inserted_id)

    # Queue ingestion task
    from ...ingestion.pipeline import ingest_document_task
    background_tasks.add_task(ingest_document_task, tenant_id, kb_id, content, file.filename)

    logger.info("Knowledge base created", kb_id=kb_id, tenant_id=tenant_id, filename=file.filename)

    return KnowledgeBase(
        id=kb_id,
        tenant_id=tenant_id,
        name=name,
        description=description,
        source_type="file",
        status=ProcessingStatus.PENDING,
    )


@router.post("/upload-url", response_model=KnowledgeBase)
async def upload_url(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    url: str = Form(...),
    description: Optional[str] = Form(None),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Create a knowledge base from a URL."""
    # Create knowledge base record
    kb_data = {
        "tenant_id": tenant_id,
        "name": name,
        "description": description,
        "source_type": "url",
        "status": ProcessingStatus.PENDING.value,
        "stats": {"chunks": 0, "tokens": 0, "entities": 0, "files": 0},
        "source_files": [],
        "source_urls": [url],
        "created_at": datetime.utcnow(),
    }

    result = await db.knowledge_bases.insert_one(kb_data)
    kb_id = str(result.inserted_id)

    # Queue URL ingestion task
    from ...ingestion.pipeline import ingest_url_task
    background_tasks.add_task(ingest_url_task, tenant_id, kb_id, url)

    logger.info("Knowledge base created from URL", kb_id=kb_id, tenant_id=tenant_id, url=url)

    return KnowledgeBase(
        id=kb_id,
        tenant_id=tenant_id,
        name=name,
        description=description,
        source_type="url",
        status=ProcessingStatus.PENDING,
    )


@router.get("", response_model=List[KnowledgeBase])
async def list_knowledge_bases(
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """List all knowledge bases for the current tenant."""
    cursor = db.knowledge_bases.find({"tenant_id": tenant_id}).sort("created_at", -1)
    knowledge_bases = []
    async for kb in cursor:
        knowledge_bases.append(KnowledgeBase(
            id=str(kb["_id"]),
            tenant_id=kb["tenant_id"],
            name=kb["name"],
            description=kb.get("description"),
            source_type=kb["source_type"],
            status=kb["status"],
            stats=kb.get("stats", {}),
            created_at=kb["created_at"],
        ))
    return knowledge_bases


@router.get("/{kb_id}", response_model=KnowledgeBase)
async def get_knowledge_base(
    kb_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get a specific knowledge base."""
    try:
        kb = await db.knowledge_bases.find_one({
            "_id": ObjectId(kb_id),
            "tenant_id": tenant_id
        })
    except:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    return KnowledgeBase(
        id=str(kb["_id"]),
        tenant_id=kb["tenant_id"],
        name=kb["name"],
        description=kb.get("description"),
        source_type=kb["source_type"],
        status=kb["status"],
        stats=kb.get("stats", {}),
        error_message=kb.get("error_message"),
        created_at=kb["created_at"],
    )


@router.get("/{kb_id}/status")
async def get_knowledge_base_status(
    kb_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Get the processing status of a knowledge base."""
    try:
        kb = await db.knowledge_bases.find_one(
            {"_id": ObjectId(kb_id), "tenant_id": tenant_id},
            {"status": 1, "stats": 1, "error_message": 1}
        )
    except:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    return {
        "status": kb["status"],
        "stats": kb.get("stats", {}),
        "error_message": kb.get("error_message")
    }


@router.delete("/{kb_id}")
async def delete_knowledge_base(
    kb_id: str,
    background_tasks: BackgroundTasks,
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_mongo_db)
):
    """Delete a knowledge base and all its data."""
    try:
        result = await db.knowledge_bases.delete_one({
            "_id": ObjectId(kb_id),
            "tenant_id": tenant_id
        })
    except:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    # Queue cleanup of vector/mongo/graph data
    from ...ingestion.pipeline import delete_kb_data_task
    background_tasks.add_task(delete_kb_data_task, tenant_id, kb_id)

    logger.info("Knowledge base deleted", kb_id=kb_id, tenant_id=tenant_id)

    return {"status": "deleted", "kb_id": kb_id}
