"""
SEO schemas for page optimization, keyword tracking, and SEO audits.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
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


# ==================== Keyword Research Models ====================

class KeywordResearchRequest(BaseModel):
    """Request for keyword research."""
    seed_keyword: str = Field(..., min_length=1, max_length=100)
    language: str = Field(default="en", pattern="^(en|ar)$")
    limit: int = Field(default=20, ge=1, le=100)


class KeywordSuggestion(BaseModel):
    """Single keyword suggestion from research."""
    keyword: str
    seed_keyword: str
    difficulty_score: int = Field(ge=0, le=100)
    competition: str  # low, medium, high
    search_volume: int
    volume_category: str  # very_low, low, medium, high, very_high
    keyword_type: str  # short_tail, long_tail, question
    source: Optional[str] = None
    question_type: Optional[str] = None


class KeywordResearchResponse(BaseModel):
    """Response from keyword research."""
    seed_keyword: str
    total_suggestions: int
    suggestions: List[KeywordSuggestion]
    clusters: Optional[Dict[str, List[KeywordSuggestion]]] = None


class KeywordAnalysisRequest(BaseModel):
    """Request for keyword analysis."""
    keyword: str = Field(..., min_length=1, max_length=200)


class KeywordAnalysisResponse(BaseModel):
    """Full analysis of a single keyword."""
    keyword: str
    difficulty_score: int = Field(ge=0, le=100)
    competition: str
    search_volume: int
    volume_category: str
    keyword_type: str
    word_count: int
    character_count: int
    related_keywords: List[KeywordSuggestion]
    question_keywords: List[KeywordSuggestion]
    long_tail_keywords: List[KeywordSuggestion]
    lsi_keywords: List[str]
    recommendations: List[str]
    analyzed_at: str


class QuestionKeywordsRequest(BaseModel):
    """Request for question-based keywords."""
    seed_keyword: str = Field(..., min_length=1, max_length=100)
    language: str = Field(default="en", pattern="^(en|ar)$")
    limit: int = Field(default=20, ge=1, le=50)


class LongTailKeywordsRequest(BaseModel):
    """Request for long-tail keywords."""
    seed_keyword: str = Field(..., min_length=1, max_length=100)
    limit: int = Field(default=20, ge=1, le=50)


class SavedKeywordResearch(BaseModel):
    """Saved keyword research result."""
    id: str
    seed_keyword: str
    tenant_id: str
    total_keywords: int
    difficulty_avg: float
    suggestions: List[KeywordSuggestion]
    clusters: Optional[Dict[str, List[Dict]]] = None
    created_at: datetime
    created_by: Optional[str] = None


class SavedKeywordResearchListResponse(BaseModel):
    """List of saved keyword research results."""
    items: List[SavedKeywordResearch]
    total: int


# ==================== Content Analysis Models ====================

class ContentAnalysisRequest(BaseModel):
    """Request for content analysis."""
    content: str = Field(..., min_length=1, max_length=100000)
    html_content: Optional[str] = Field(None, max_length=200000)
    primary_keyword: Optional[str] = Field(None, max_length=100)
    secondary_keywords: Optional[List[str]] = Field(default_factory=list)
    content_type: str = Field(default="article", pattern="^(article|blog_post|landing_page|product_page)$")
    url: Optional[str] = None


class ReadabilityScores(BaseModel):
    """Readability metric scores."""
    flesch_reading_ease: float
    flesch_kincaid_grade: float
    smog_index: float
    coleman_liau_index: float
    automated_readability_index: float
    gunning_fog_index: float
    average_grade_level: float


class ReadabilityMetrics(BaseModel):
    """Text metrics used for readability calculations."""
    characters: int
    words: int
    sentences: int
    syllables: int
    complex_words: int
    paragraphs: int
    avg_word_length: float
    avg_sentence_length: float
    avg_syllables_per_word: float


class ReadabilityInterpretation(BaseModel):
    """Interpretation of readability scores."""
    reading_level: str
    grade_level_description: str
    target_audience: str


class ReadabilityResult(BaseModel):
    """Complete readability analysis result."""
    metrics: ReadabilityMetrics
    scores: ReadabilityScores
    interpretation: ReadabilityInterpretation
    recommendations: List[str]


class SecondaryKeywordResult(BaseModel):
    """Analysis of a secondary keyword."""
    keyword: str
    count: int
    density: float
    status: str


class KeywordDensityResult(BaseModel):
    """Keyword density analysis result."""
    primary_keyword: str
    primary_count: int
    primary_density: float
    primary_status: Optional[str] = None
    secondary_keywords: List[SecondaryKeywordResult]
    total_words: int
    issues: List[str]
    recommendations: List[str]
    score: int


class HeadingItem(BaseModel):
    """Single heading in content."""
    level: int
    tag: str
    text: str


class HeadingAnalysisResult(BaseModel):
    """Heading structure analysis result."""
    h1_count: int
    h2_count: int
    h3_count: int
    h4_count: int
    h5_count: int
    h6_count: int
    total_headings: int
    headings: List[HeadingItem]
    issues: List[str]
    recommendations: List[str]
    score: int


class ImageItem(BaseModel):
    """Single image in content."""
    src: Optional[str] = None
    filename: str
    alt: Optional[str] = None
    status: str  # good, empty, missing


class ImageAnalysisResult(BaseModel):
    """Image audit result."""
    total_images: int
    with_alt: int
    without_alt: int
    empty_alt: int
    images: List[ImageItem]
    issues: List[str]
    recommendations: List[str]
    score: int


class ContentLengthResult(BaseModel):
    """Content length analysis result."""
    word_count: int
    content_type: str
    status: str  # too_short, short, ideal, long, too_long
    recommended_min: int
    recommended_max: int
    score: int
    recommendation: str


class OverallScoreResult(BaseModel):
    """Overall content score breakdown."""
    overall_score: int
    component_scores: Dict[str, int]
    grade: str  # A, B, C, D, F


class ContentAnalysisResponse(BaseModel):
    """Complete content analysis response."""
    url: Optional[str] = None
    content_type: str
    overall: OverallScoreResult
    readability: ReadabilityResult
    keyword_analysis: KeywordDensityResult
    heading_analysis: HeadingAnalysisResult
    image_analysis: ImageAnalysisResult
    length_analysis: ContentLengthResult
    all_recommendations: List[str]
    all_issues: List[str]


class QuickScoreRequest(BaseModel):
    """Request for quick content score."""
    content: str = Field(..., min_length=1, max_length=100000)
    primary_keyword: Optional[str] = None


class QuickScoreResponse(BaseModel):
    """Quick content score response."""
    score: int
    grade: str
    word_count: int
    readability_score: float
    issues_count: int
    top_issues: List[str]


class ReadabilityRequest(BaseModel):
    """Request for readability analysis only."""
    content: str = Field(..., min_length=1, max_length=100000)


class HeadingAnalysisRequest(BaseModel):
    """Request for heading structure analysis."""
    html_content: str = Field(..., min_length=1, max_length=200000)


class ImageAuditRequest(BaseModel):
    """Request for image alt text audit."""
    html_content: str = Field(..., min_length=1, max_length=200000)


# ==================== Technical SEO Models ====================

class PageSpeedRequest(BaseModel):
    """Request for PageSpeed analysis."""
    url: str = Field(..., min_length=1, max_length=2000)
    strategy: str = Field(default="mobile", pattern="^(mobile|desktop)$")


class CoreWebVital(BaseModel):
    """Single Core Web Vital metric."""
    value: float
    display_value: str
    score: int = Field(ge=0, le=100)
    description: str
    rating: str  # good, needs_improvement, poor


class PageSpeedScores(BaseModel):
    """PageSpeed category scores."""
    performance: Optional[Dict[str, Any]] = None
    accessibility: Optional[Dict[str, Any]] = None
    best_practices: Optional[Dict[str, Any]] = None
    seo: Optional[Dict[str, Any]] = None


class PageSpeedOpportunity(BaseModel):
    """PageSpeed improvement opportunity."""
    id: str
    title: str
    description: str
    score: int
    savings_ms: float
    display_value: str
    priority: str  # high, medium, low


class PageSpeedResponse(BaseModel):
    """PageSpeed analysis response."""
    success: bool
    url: str = ""
    strategy: str = ""
    fetch_time: str = ""
    scores: Dict[str, Any] = Field(default_factory=dict)
    core_web_vitals: Dict[str, Any] = Field(default_factory=dict)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    opportunities: List[Dict[str, Any]] = Field(default_factory=list)
    diagnostics: List[Dict[str, Any]] = Field(default_factory=list)
    overall_score: int = 0
    error: Optional[str] = None
    message: Optional[str] = None


class CoreWebVitalsResponse(BaseModel):
    """Core Web Vitals response for both mobile and desktop."""
    url: str
    analyzed_at: str
    mobile: Dict[str, Any]
    desktop: Dict[str, Any]


class MobileFriendlinessResponse(BaseModel):
    """Mobile friendliness check response."""
    success: bool
    url: str
    is_mobile_friendly: bool
    mobile_score: int
    issues: List[Dict[str, str]] = Field(default_factory=list)
    passed_checks: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class BrokenLinkRequest(BaseModel):
    """Request for broken link scan."""
    url: str = Field(..., min_length=1, max_length=2000)
    check_external: bool = True
    max_links: int = Field(default=100, ge=1, le=500)


class BrokenLink(BaseModel):
    """Single broken link result."""
    url: str
    text: str
    type: str  # anchor, image, script, stylesheet
    status_code: Optional[int] = None
    error: str = ""
    is_internal: bool = True


class BrokenLinkSummary(BaseModel):
    """Summary of broken link scan."""
    total: int
    ok: int
    broken: int
    redirects: int
    errors: int
    internal: int
    external: int


class BrokenLinkResponse(BaseModel):
    """Broken link scan response."""
    url: str
    scanned_at: str
    total_links: int
    internal_links: List[Dict[str, Any]] = Field(default_factory=list)
    external_links: List[Dict[str, Any]] = Field(default_factory=list)
    broken_links: List[Dict[str, Any]] = Field(default_factory=list)
    redirects: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    summary: Dict[str, int] = Field(default_factory=dict)
    error: Optional[str] = None


class SSLCheckRequest(BaseModel):
    """Request for SSL certificate check."""
    url: str = Field(..., min_length=1, max_length=2000)


class SSLCheckResponse(BaseModel):
    """SSL certificate check response."""
    url: str
    checked_at: str
    has_ssl: bool
    valid: bool
    issuer: Optional[str] = None
    subject: Optional[str] = None
    expires: Optional[str] = None
    days_until_expiry: Optional[int] = None
    protocol: Optional[str] = None
    errors: List[str] = Field(default_factory=list)


class SchemaValidationRequest(BaseModel):
    """Request for structured data validation."""
    url: str = Field(..., min_length=1, max_length=2000)


class SchemaValidationItem(BaseModel):
    """Single schema validation result."""
    valid: bool
    type: Optional[str] = None
    format: str = "JSON-LD"
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    missing_required: List[str] = Field(default_factory=list)
    missing_recommended: List[str] = Field(default_factory=list)
    present_properties: List[str] = Field(default_factory=list)


class SchemaValidationResponse(BaseModel):
    """Structured data validation response."""
    url: str
    validated_at: str
    total_schemas: int
    schema_types: List[str] = Field(default_factory=list)
    valid_schemas: int
    invalid_schemas: int
    validations: List[Dict[str, Any]] = Field(default_factory=list)
    overall_score: int
    issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    extraction_errors: List[str] = Field(default_factory=list)


class SchemaTemplateRequest(BaseModel):
    """Request for schema template."""
    schema_type: str = Field(..., min_length=1, max_length=100)


class SchemaTemplateResponse(BaseModel):
    """Schema template response."""
    schema_type: str
    template: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class TechnicalAuditRequest(BaseModel):
    """Request for full technical SEO audit."""
    url: str = Field(..., min_length=1, max_length=2000)


class TechnicalAuditCategory(BaseModel):
    """Single category in technical audit."""
    score: int = Field(ge=0, le=100)
    details: Dict[str, Any] = Field(default_factory=dict)


class TechnicalAuditIssue(BaseModel):
    """Single issue found in technical audit."""
    category: str
    issue: str
    impact: str = "medium"  # critical, high, medium, low


class TechnicalAuditRecommendation(BaseModel):
    """Single recommendation from technical audit."""
    category: str
    priority: str  # critical, high, medium, low
    title: str
    description: str


class TechnicalAuditResponse(BaseModel):
    """Full technical SEO audit response."""
    url: str
    audited_at: str
    overall_score: int = Field(ge=0, le=100)
    grade: str  # A, B, C, D, F
    categories: Dict[str, Any] = Field(default_factory=dict)
    critical_issues: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    passed_checks: List[str] = Field(default_factory=list)
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None


class QuickTechnicalCheckRequest(BaseModel):
    """Request for quick technical check."""
    url: str = Field(..., min_length=1, max_length=2000)


class QuickTechnicalCheck(BaseModel):
    """Single check in quick technical audit."""
    name: str
    passed: bool
    value: str


class QuickTechnicalCheckResponse(BaseModel):
    """Quick technical check response."""
    url: str
    checked_at: str
    quick_score: int = Field(ge=0, le=100)
    checks: List[Dict[str, Any]] = Field(default_factory=list)
    critical_issues: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class RedirectRule(BaseModel):
    """Single redirect rule."""
    id: str
    source_url: str
    target_url: str
    redirect_type: str = Field(default="301", pattern="^(301|302|307|308)$")
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RedirectRuleCreate(BaseModel):
    """Create a new redirect rule."""
    source_url: str = Field(..., min_length=1, max_length=2000)
    target_url: str = Field(..., min_length=1, max_length=2000)
    redirect_type: str = Field(default="301", pattern="^(301|302|307|308)$")
    is_active: bool = True


class RedirectRuleUpdate(BaseModel):
    """Update an existing redirect rule."""
    source_url: Optional[str] = None
    target_url: Optional[str] = None
    redirect_type: Optional[str] = None
    is_active: Optional[bool] = None


class RedirectListResponse(BaseModel):
    """List of redirect rules."""
    redirects: List[RedirectRule] = Field(default_factory=list)
    total: int = 0
