from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SourceType(str, Enum):
    FILE = "file"
    URL = "url"
    API = "api"
    TEXT = "text"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class KBStats(BaseModel):
    """Knowledge base statistics."""
    chunks: int = 0
    tokens: int = 0
    entities: int = 0
    files: int = 0


class KnowledgeBase(BaseModel):
    """Knowledge Base model."""
    id: Optional[str] = None
    tenant_id: str
    name: str
    description: Optional[str] = None
    source_type: SourceType
    status: ProcessingStatus = ProcessingStatus.PENDING
    stats: KBStats = Field(default_factory=KBStats)
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class KnowledgeBaseCreate(BaseModel):
    """Schema for creating a knowledge base."""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    source_type: SourceType = SourceType.FILE


class KnowledgeBaseInDB(KnowledgeBase):
    """Knowledge base as stored in database."""
    source_files: List[str] = []
    source_urls: List[str] = []


class ChunkMetadata(BaseModel):
    """Metadata for a document chunk."""
    source_file: Optional[str] = None
    source_url: Optional[str] = None
    page_number: Optional[int] = None
    section: Optional[str] = None
    chunk_index: int = 0
    parent_chunk_id: Optional[str] = None


class ChunkDocument(BaseModel):
    """Document chunk for storage."""
    id: Optional[str] = None
    tenant_id: str
    kb_id: str
    text: str
    metadata: ChunkMetadata
    entities: List[str] = []
    token_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
