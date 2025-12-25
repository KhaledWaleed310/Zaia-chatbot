"""
SEO schemas for page optimization, keyword tracking, and SEO audits.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class PageId(str, Enum):
    """Public page identifiers."""
    LANDING = "landing"
    LOGIN = "login"
    REGISTER = "register"
    PRIVACY = "privacy"


class Priority(str, Enum):
    """Keyword priority levels."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AuditStatus(str, Enum):
    """SEO audit item status."""
    PASS = "pass"
    WARNING = "warning"
    FAIL = "fail"


class AuditCategory(str, Enum):
    """SEO audit categories."""
    META = "meta"
    CONTENT = "content"
    TECHNICAL = "technical"
    PERFORMANCE = "performance"


class ChangeFreq(str, Enum):
    """Sitemap change frequency options."""
    ALWAYS = "always"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    NEVER = "never"


# Page SEO Models
class PageSEO(BaseModel):
    """SEO configuration for a single page."""
    page_id: str
    page_name: str
    url: str
    title: str
    description: str
    keywords: List[str] = Field(default_factory=list)
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    canonical_url: Optional[str] = None
    robots: str = "index, follow"
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class PageSEOUpdate(BaseModel):
    """Partial update for page SEO."""
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    canonical_url: Optional[str] = None
    robots: Optional[str] = None


class PageSEOResponse(BaseModel):
    """Response for page SEO data."""
    pages: List[PageSEO] = Field(default_factory=list)


# Keyword Models
class Keyword(BaseModel):
    """Tracked keyword."""
    id: str
    keyword: str
    target_pages: List[str] = Field(default_factory=list)
    priority: str = "medium"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class KeywordCreate(BaseModel):
    """Create a new keyword."""
    keyword: str
    target_pages: List[str] = Field(default_factory=list)
    priority: str = "medium"
    notes: Optional[str] = None


class KeywordUpdate(BaseModel):
    """Update an existing keyword."""
    keyword: Optional[str] = None
    target_pages: Optional[List[str]] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class KeywordListResponse(BaseModel):
    """Response for keyword list."""
    keywords: List[Keyword] = Field(default_factory=list)
    total: int = 0


# SEO Audit Models
class SEOAuditItem(BaseModel):
    """Single SEO audit check result."""
    id: str
    category: str
    check_name: str
    status: str  # pass, warning, fail
    message: str
    page_id: Optional[str] = None
    recommendation: Optional[str] = None


class SEOAuditResult(BaseModel):
    """Complete SEO audit result."""
    id: str
    audit_date: datetime
    overall_score: int = Field(ge=0, le=100, description="Score from 0-100")
    items: List[SEOAuditItem] = Field(default_factory=list)
    summary: Dict[str, int] = Field(default_factory=dict)  # {"pass": 10, "warning": 3, "fail": 2}


class SEOAuditHistoryResponse(BaseModel):
    """Response for audit history."""
    audits: List[SEOAuditResult] = Field(default_factory=list)


# Sitemap Models
class SitemapEntry(BaseModel):
    """Single sitemap entry."""
    url: str
    lastmod: Optional[str] = None
    changefreq: str = "weekly"
    priority: float = Field(default=0.5, ge=0.0, le=1.0)


class SitemapUpdate(BaseModel):
    """Update sitemap entries."""
    entries: List[SitemapEntry] = Field(default_factory=list)


class SitemapResponse(BaseModel):
    """Response for sitemap data."""
    entries: List[SitemapEntry] = Field(default_factory=list)
    last_generated: Optional[datetime] = None


# Robots.txt Models
class RobotsConfig(BaseModel):
    """Robots.txt configuration."""
    user_agent: str = "*"
    allow: List[str] = Field(default_factory=list)
    disallow: List[str] = Field(default_factory=list)
    sitemap_url: str = ""


class RobotsUpdate(BaseModel):
    """Update robots.txt configuration."""
    user_agent: Optional[str] = None
    allow: Optional[List[str]] = None
    disallow: Optional[List[str]] = None
    sitemap_url: Optional[str] = None


class RobotsResponse(BaseModel):
    """Response for robots.txt config."""
    config: RobotsConfig
    preview: str = ""  # Generated robots.txt content preview
    last_generated: Optional[datetime] = None


# File Generation Response
class FileGenerationResponse(BaseModel):
    """Response after generating sitemap/robots files."""
    success: bool
    message: str
    sitemap_path: Optional[str] = None
    robots_path: Optional[str] = None
    generated_at: datetime
