"""
SEO API endpoints for page optimization, keyword tracking, and SEO audits.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import Optional, List
import logging
import uuid
import os

from ..core.security import get_current_marketing_user
from ..core.database import get_mongodb
from ..schemas.seo import (
    PageSEO,
    PageSEOUpdate,
    PageSEOResponse,
    Keyword,
    KeywordCreate,
    KeywordUpdate,
    KeywordListResponse,
    SEOAuditItem,
    SEOAuditResult,
    SEOAuditHistoryResponse,
    SitemapEntry,
    SitemapUpdate,
    SitemapResponse,
    RobotsConfig,
    RobotsUpdate,
    RobotsResponse,
    FileGenerationResponse,
    # Keyword Research schemas
    KeywordResearchRequest,
    KeywordSuggestion,
    KeywordResearchResponse,
    KeywordAnalysisRequest,
    KeywordAnalysisResponse,
    QuestionKeywordsRequest,
    LongTailKeywordsRequest,
    SavedKeywordResearch,
    SavedKeywordResearchListResponse,
    # Content Analysis schemas
    ContentAnalysisRequest,
    ContentAnalysisResponse,
    QuickScoreRequest,
    QuickScoreResponse,
    ReadabilityRequest,
    ReadabilityResult,
    HeadingAnalysisRequest,
    HeadingAnalysisResult,
    ImageAuditRequest,
    ImageAnalysisResult,
    KeywordDensityResult,
    # Technical SEO schemas
    PageSpeedRequest,
    PageSpeedResponse,
    CoreWebVitalsResponse,
    MobileFriendlinessResponse,
    BrokenLinkRequest,
    BrokenLinkResponse,
    SSLCheckRequest,
    SSLCheckResponse,
    SchemaValidationRequest,
    SchemaValidationResponse,
    SchemaTemplateRequest,
    SchemaTemplateResponse,
    TechnicalAuditRequest,
    TechnicalAuditResponse,
    QuickTechnicalCheckRequest,
    QuickTechnicalCheckResponse,
    RedirectRule,
    RedirectRuleCreate,
    RedirectRuleUpdate,
    RedirectListResponse,
)
from ..services.seo import (
    generate_related_keywords,
    generate_long_tail_keywords,
    generate_question_keywords,
    cluster_keywords_by_topic,
    analyze_keyword,
    # Content Analysis
    analyze_content,
    analyze_readability,
    analyze_keyword_density,
    analyze_heading_structure,
    analyze_images,
    clean_html,
    # Technical SEO
    analyze_page_speed,
    get_core_web_vitals,
    check_mobile_friendliness,
    scan_page_links,
    check_ssl_certificate,
    validate_page_structured_data,
    get_schema_template,
    get_available_schema_types,
    run_full_technical_audit,
    get_quick_technical_check,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/seo", tags=["seo"])

# Default page configurations (seeded if not in database)
# Title: 30-60 chars, Description: 120-160 chars for optimal SEO
DEFAULT_PAGES = [
    {
        "page_id": "landing",
        "page_name": "Landing Page",
        "url": "/",
        "title": "Aiden Link - AI Chatbot Platform for Smart Customer Support",  # 54 chars
        "description": "Transform your customer support with Aiden Link AI chatbots. Intelligent automation, 24/7 availability, seamless integration. Start your free trial today.",  # 153 chars
        "keywords": ["AI chatbot", "customer support", "business automation", "chatbot platform", "customer service AI"],
        "og_title": "Aiden Link - AI Chatbot Platform for Smart Customer Support",
        "og_description": "Transform your customer support with intelligent AI chatbots. 24/7 availability and seamless integration.",
        "og_image": "/og-image.svg",
        "canonical_url": "https://aidenlink.cloud/",
        "robots": "index, follow",
    },
    {
        "page_id": "login",
        "page_name": "Login",
        "url": "/login",
        "title": "Login - Aiden Link AI Chatbot Dashboard",  # 36 chars
        "description": "Sign in to your Aiden Link account to manage your AI chatbots, view analytics, and optimize your customer support automation.",  # 123 chars
        "keywords": ["Aiden Link login", "chatbot dashboard", "sign in"],
        "og_title": "Login to Aiden Link AI Platform",
        "og_description": "Access your AI chatbot dashboard and manage your customer support",
        "og_image": "/og-image.svg",
        "canonical_url": "https://aidenlink.cloud/login",
        "robots": "noindex, follow",
    },
    {
        "page_id": "register",
        "page_name": "Register",
        "url": "/register",
        "title": "Sign Up Free - Aiden Link AI Chatbot Platform",  # 42 chars
        "description": "Create your free Aiden Link account and start building intelligent AI chatbots for your business. No credit card required to get started.",  # 135 chars
        "keywords": ["Aiden Link signup", "create chatbot", "free trial", "register"],
        "og_title": "Get Started with Aiden Link - Free AI Chatbots",
        "og_description": "Create your free account and start building AI chatbots for your business",
        "og_image": "/og-image.svg",
        "canonical_url": "https://aidenlink.cloud/register",
        "robots": "index, follow",
    },
    {
        "page_id": "privacy",
        "page_name": "Privacy Policy",
        "url": "/privacy",
        "title": "Privacy Policy - Aiden Link AI Platform",  # 36 chars
        "description": "Learn how Aiden Link protects your data and privacy. Our comprehensive policy covers data collection, usage, security practices, and GDPR compliance.",  # 147 chars
        "keywords": ["privacy policy", "data protection", "GDPR", "security"],
        "og_title": "Aiden Link Privacy Policy - Data Protection",
        "og_description": "How we protect your data and privacy with enterprise-grade security",
        "og_image": "/og-image.svg",
        "canonical_url": "https://aidenlink.cloud/privacy",
        "robots": "index, follow",
    },
]


async def ensure_default_pages(db):
    """Ensure default pages exist in database."""
    for page in DEFAULT_PAGES:
        existing = await db.seo_pages.find_one({"page_id": page["page_id"]})
        if not existing:
            page["created_at"] = datetime.utcnow()
            page["updated_at"] = datetime.utcnow()
            await db.seo_pages.insert_one(page)


# ==================== Page SEO Endpoints ====================

@router.get("/pages", response_model=PageSEOResponse)
async def list_pages(
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get SEO data for all public pages."""
    try:
        db = get_mongodb()
        await ensure_default_pages(db)

        pages_cursor = db.seo_pages.find({})
        pages_data = await pages_cursor.to_list(length=100)

        pages = []
        for p in pages_data:
            pages.append(PageSEO(
                page_id=p.get("page_id"),
                page_name=p.get("page_name"),
                url=p.get("url"),
                title=p.get("title", ""),
                description=p.get("description", ""),
                keywords=p.get("keywords", []),
                og_title=p.get("og_title"),
                og_description=p.get("og_description"),
                og_image=p.get("og_image"),
                canonical_url=p.get("canonical_url"),
                robots=p.get("robots", "index, follow"),
                updated_at=p.get("updated_at"),
                updated_by=p.get("updated_by"),
            ))

        return PageSEOResponse(pages=pages)

    except Exception as e:
        logger.error(f"Error listing SEO pages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch SEO pages")


@router.get("/pages/{page_id}", response_model=PageSEO)
async def get_page(
    page_id: str,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get SEO data for a specific page."""
    try:
        db = get_mongodb()
        await ensure_default_pages(db)

        page = await db.seo_pages.find_one({"page_id": page_id})
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")

        return PageSEO(
            page_id=page.get("page_id"),
            page_name=page.get("page_name"),
            url=page.get("url"),
            title=page.get("title", ""),
            description=page.get("description", ""),
            keywords=page.get("keywords", []),
            og_title=page.get("og_title"),
            og_description=page.get("og_description"),
            og_image=page.get("og_image"),
            canonical_url=page.get("canonical_url"),
            robots=page.get("robots", "index, follow"),
            updated_at=page.get("updated_at"),
            updated_by=page.get("updated_by"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching page SEO: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch page SEO")


@router.put("/pages/{page_id}", response_model=dict)
async def update_page(
    page_id: str,
    update: PageSEOUpdate,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Update SEO data for a specific page."""
    try:
        db = get_mongodb()

        # Check page exists
        existing = await db.seo_pages.find_one({"page_id": page_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Page not found")

        update_dict = update.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = str(current_user.get("_id"))

        await db.seo_pages.update_one(
            {"page_id": page_id},
            {"$set": update_dict}
        )

        logger.info(f"SEO updated for page {page_id} by {current_user.get('email')}")
        return {"message": f"SEO data updated for {page_id}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating page SEO: {e}")
        raise HTTPException(status_code=500, detail="Failed to update page SEO")


# ==================== Keyword Endpoints ====================

@router.get("/keywords", response_model=KeywordListResponse)
async def list_keywords(
    current_user: dict = Depends(get_current_marketing_user)
):
    """List all tracked keywords."""
    try:
        db = get_mongodb()

        keywords_cursor = db.seo_keywords.find({}).sort("created_at", -1)
        keywords_data = await keywords_cursor.to_list(length=500)

        keywords = []
        for k in keywords_data:
            keywords.append(Keyword(
                id=str(k.get("_id")),
                keyword=k.get("keyword"),
                target_pages=k.get("target_pages", []),
                priority=k.get("priority", "medium"),
                notes=k.get("notes"),
                created_at=k.get("created_at"),
                updated_at=k.get("updated_at"),
            ))

        return KeywordListResponse(keywords=keywords, total=len(keywords))

    except Exception as e:
        logger.error(f"Error listing keywords: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch keywords")


@router.post("/keywords", response_model=Keyword)
async def create_keyword(
    keyword_data: KeywordCreate,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Create a new keyword."""
    try:
        db = get_mongodb()

        # Check for duplicate
        existing = await db.seo_keywords.find_one({"keyword": keyword_data.keyword.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Keyword already exists")

        keyword_id = str(uuid.uuid4())
        now = datetime.utcnow()

        doc = {
            "_id": keyword_id,
            "keyword": keyword_data.keyword.lower(),
            "target_pages": keyword_data.target_pages,
            "priority": keyword_data.priority,
            "notes": keyword_data.notes,
            "created_at": now,
            "updated_at": now,
            "created_by": str(current_user.get("_id")),
        }

        await db.seo_keywords.insert_one(doc)

        logger.info(f"Keyword '{keyword_data.keyword}' created by {current_user.get('email')}")

        return Keyword(
            id=keyword_id,
            keyword=doc["keyword"],
            target_pages=doc["target_pages"],
            priority=doc["priority"],
            notes=doc["notes"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating keyword: {e}")
        raise HTTPException(status_code=500, detail="Failed to create keyword")


@router.put("/keywords/{keyword_id}", response_model=dict)
async def update_keyword(
    keyword_id: str,
    update: KeywordUpdate,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Update a keyword."""
    try:
        db = get_mongodb()

        existing = await db.seo_keywords.find_one({"_id": keyword_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Keyword not found")

        update_dict = update.model_dump(exclude_unset=True)
        if "keyword" in update_dict:
            update_dict["keyword"] = update_dict["keyword"].lower()
        update_dict["updated_at"] = datetime.utcnow()

        await db.seo_keywords.update_one(
            {"_id": keyword_id},
            {"$set": update_dict}
        )

        logger.info(f"Keyword {keyword_id} updated by {current_user.get('email')}")
        return {"message": "Keyword updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating keyword: {e}")
        raise HTTPException(status_code=500, detail="Failed to update keyword")


@router.delete("/keywords/{keyword_id}", response_model=dict)
async def delete_keyword(
    keyword_id: str,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Delete a keyword."""
    try:
        db = get_mongodb()

        result = await db.seo_keywords.delete_one({"_id": keyword_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Keyword not found")

        logger.info(f"Keyword {keyword_id} deleted by {current_user.get('email')}")
        return {"message": "Keyword deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting keyword: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete keyword")


# ==================== SEO Audit Endpoints ====================

@router.get("/audit", response_model=SEOAuditResult)
async def run_seo_audit(
    current_user: dict = Depends(get_current_marketing_user)
):
    """Run an SEO audit and return results."""
    try:
        db = get_mongodb()
        await ensure_default_pages(db)

        # Get all pages
        pages_cursor = db.seo_pages.find({})
        pages = await pages_cursor.to_list(length=100)

        # Get sitemap entries
        sitemap_doc = await db.seo_sitemap.find_one({"_id": "global"})
        sitemap_entries = sitemap_doc.get("entries", []) if sitemap_doc else []
        sitemap_urls = [e.get("url") for e in sitemap_entries]

        audit_items = []
        pass_count = 0
        warning_count = 0
        fail_count = 0

        for page in pages:
            page_id = page.get("page_id")
            title = page.get("title", "")
            description = page.get("description", "")
            keywords = page.get("keywords", [])
            og_title = page.get("og_title")
            og_description = page.get("og_description")
            og_image = page.get("og_image")
            canonical_url = page.get("canonical_url")
            url = page.get("url", "")

            # Title checks
            if not title:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Title Tag",
                    status="fail",
                    message=f"Missing title tag on {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Add a unique, descriptive title tag (50-60 characters)"
                ))
                fail_count += 1
            elif len(title) < 30:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Title Length",
                    status="warning",
                    message=f"Title too short ({len(title)} chars) on {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Title should be 50-60 characters for optimal display"
                ))
                warning_count += 1
            elif len(title) > 60:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Title Length",
                    status="warning",
                    message=f"Title too long ({len(title)} chars) on {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Title may be truncated in search results (max 60 chars)"
                ))
                warning_count += 1
            else:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Title Tag",
                    status="pass",
                    message=f"Title tag OK ({len(title)} chars) on {page.get('page_name')}",
                    page_id=page_id,
                ))
                pass_count += 1

            # Description checks
            if not description:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Meta Description",
                    status="fail",
                    message=f"Missing meta description on {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Add a compelling meta description (120-160 characters)"
                ))
                fail_count += 1
            elif len(description) < 120:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Description Length",
                    status="warning",
                    message=f"Description too short ({len(description)} chars) on {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Description should be 120-160 characters"
                ))
                warning_count += 1
            elif len(description) > 160:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Description Length",
                    status="warning",
                    message=f"Description too long ({len(description)} chars) on {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Description may be truncated (max 160 chars)"
                ))
                warning_count += 1
            else:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Meta Description",
                    status="pass",
                    message=f"Meta description OK ({len(description)} chars) on {page.get('page_name')}",
                    page_id=page_id,
                ))
                pass_count += 1

            # Keywords check
            if not keywords:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Keywords",
                    status="warning",
                    message=f"No keywords defined for {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Add relevant keywords for content guidance"
                ))
                warning_count += 1
            else:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Keywords",
                    status="pass",
                    message=f"{len(keywords)} keywords defined for {page.get('page_name')}",
                    page_id=page_id,
                ))
                pass_count += 1

            # Open Graph checks
            if not og_title or not og_description:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Open Graph Tags",
                    status="warning",
                    message=f"Missing OG tags on {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Add og:title and og:description for social sharing"
                ))
                warning_count += 1
            else:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="Open Graph Tags",
                    status="pass",
                    message=f"OG tags present on {page.get('page_name')}",
                    page_id=page_id,
                ))
                pass_count += 1

            # OG Image check
            if not og_image:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="OG Image",
                    status="warning",
                    message=f"Missing og:image on {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Add og:image for better social media previews"
                ))
                warning_count += 1
            else:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="meta",
                    check_name="OG Image",
                    status="pass",
                    message=f"OG image present on {page.get('page_name')}",
                    page_id=page_id,
                ))
                pass_count += 1

            # Canonical URL check
            if not canonical_url:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="technical",
                    check_name="Canonical URL",
                    status="warning",
                    message=f"No canonical URL set for {page.get('page_name')}",
                    page_id=page_id,
                    recommendation="Set canonical URL to prevent duplicate content issues"
                ))
                warning_count += 1
            else:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="technical",
                    check_name="Canonical URL",
                    status="pass",
                    message=f"Canonical URL set for {page.get('page_name')}",
                    page_id=page_id,
                ))
                pass_count += 1

            # Sitemap check
            if url not in sitemap_urls and canonical_url not in sitemap_urls:
                # Only warn if page should be indexed
                robots = page.get("robots", "")
                if "noindex" not in robots.lower():
                    audit_items.append(SEOAuditItem(
                        id=str(uuid.uuid4()),
                        category="technical",
                        check_name="Sitemap",
                        status="warning",
                        message=f"{page.get('page_name')} not in sitemap",
                        page_id=page_id,
                        recommendation="Add indexable pages to sitemap.xml"
                    ))
                    warning_count += 1
                else:
                    audit_items.append(SEOAuditItem(
                        id=str(uuid.uuid4()),
                        category="technical",
                        check_name="Sitemap",
                        status="pass",
                        message=f"{page.get('page_name')} correctly excluded (noindex)",
                        page_id=page_id,
                    ))
                    pass_count += 1
            else:
                audit_items.append(SEOAuditItem(
                    id=str(uuid.uuid4()),
                    category="technical",
                    check_name="Sitemap",
                    status="pass",
                    message=f"{page.get('page_name')} included in sitemap",
                    page_id=page_id,
                ))
                pass_count += 1

        # Calculate score (simple weighted average)
        total_checks = pass_count + warning_count + fail_count
        if total_checks > 0:
            score = int((pass_count * 100 + warning_count * 50) / total_checks)
        else:
            score = 100

        # Save audit to history
        audit_id = str(uuid.uuid4())
        audit_result = {
            "_id": audit_id,
            "audit_date": datetime.utcnow(),
            "overall_score": score,
            "summary": {"pass": pass_count, "warning": warning_count, "fail": fail_count},
            "items": [item.model_dump() for item in audit_items],
            "run_by": str(current_user.get("_id")),
        }

        await db.seo_audits.insert_one(audit_result)

        return SEOAuditResult(
            id=audit_id,
            audit_date=audit_result["audit_date"],
            overall_score=score,
            items=audit_items,
            summary={"pass": pass_count, "warning": warning_count, "fail": fail_count},
        )

    except Exception as e:
        logger.error(f"Error running SEO audit: {e}")
        raise HTTPException(status_code=500, detail="Failed to run SEO audit")


@router.get("/audit/history", response_model=SEOAuditHistoryResponse)
async def get_audit_history(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get SEO audit history."""
    try:
        db = get_mongodb()

        audits_cursor = db.seo_audits.find({}).sort("audit_date", -1).limit(limit)
        audits_data = await audits_cursor.to_list(length=limit)

        audits = []
        for a in audits_data:
            items = [SEOAuditItem(**item) for item in a.get("items", [])]
            audits.append(SEOAuditResult(
                id=str(a.get("_id")),
                audit_date=a.get("audit_date"),
                overall_score=a.get("overall_score", 0),
                items=items,
                summary=a.get("summary", {}),
            ))

        return SEOAuditHistoryResponse(audits=audits)

    except Exception as e:
        logger.error(f"Error fetching audit history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit history")


# ==================== Sitemap Endpoints ====================

@router.get("/sitemap", response_model=SitemapResponse)
async def get_sitemap(
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get current sitemap configuration."""
    try:
        db = get_mongodb()

        sitemap_doc = await db.seo_sitemap.find_one({"_id": "global"})

        if not sitemap_doc:
            # Return default entries based on public indexable pages (exclude noindex pages like login)
            default_entries = [
                SitemapEntry(url="https://aidenlink.cloud/", changefreq="weekly", priority=1.0),
                SitemapEntry(url="https://aidenlink.cloud/register", changefreq="monthly", priority=0.8),
                SitemapEntry(url="https://aidenlink.cloud/privacy", changefreq="monthly", priority=0.5),
            ]
            return SitemapResponse(entries=default_entries, last_generated=None)

        entries = [SitemapEntry(**e) for e in sitemap_doc.get("entries", [])]
        return SitemapResponse(
            entries=entries,
            last_generated=sitemap_doc.get("last_generated"),
        )

    except Exception as e:
        logger.error(f"Error fetching sitemap: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sitemap")


@router.put("/sitemap", response_model=dict)
async def update_sitemap(
    update: SitemapUpdate,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Update sitemap entries."""
    try:
        db = get_mongodb()

        await db.seo_sitemap.update_one(
            {"_id": "global"},
            {
                "$set": {
                    "entries": [e.model_dump() for e in update.entries],
                    "updated_at": datetime.utcnow(),
                    "updated_by": str(current_user.get("_id")),
                }
            },
            upsert=True
        )

        logger.info(f"Sitemap updated by {current_user.get('email')}")
        return {"message": "Sitemap configuration updated"}

    except Exception as e:
        logger.error(f"Error updating sitemap: {e}")
        raise HTTPException(status_code=500, detail="Failed to update sitemap")


# ==================== Robots.txt Endpoints ====================

@router.get("/robots", response_model=RobotsResponse)
async def get_robots(
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get robots.txt configuration."""
    try:
        db = get_mongodb()

        robots_doc = await db.seo_robots.find_one({"_id": "global"})

        if not robots_doc:
            # Return default config
            default_config = RobotsConfig(
                user_agent="*",
                allow=["/", "/privacy"],
                disallow=["/dashboard", "/admin", "/api", "/settings", "/chatbots"],
                sitemap_url="https://aidenlink.cloud/sitemap.xml"
            )
            # Generate preview
            preview = generate_robots_txt(default_config)
            return RobotsResponse(config=default_config, preview=preview, last_generated=None)

        config = RobotsConfig(
            user_agent=robots_doc.get("user_agent", "*"),
            allow=robots_doc.get("allow", []),
            disallow=robots_doc.get("disallow", []),
            sitemap_url=robots_doc.get("sitemap_url", ""),
        )
        preview = generate_robots_txt(config)

        return RobotsResponse(
            config=config,
            preview=preview,
            last_generated=robots_doc.get("last_generated"),
        )

    except Exception as e:
        logger.error(f"Error fetching robots config: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch robots configuration")


@router.put("/robots", response_model=dict)
async def update_robots(
    update: RobotsUpdate,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Update robots.txt configuration."""
    try:
        db = get_mongodb()

        update_dict = update.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = str(current_user.get("_id"))

        await db.seo_robots.update_one(
            {"_id": "global"},
            {"$set": update_dict},
            upsert=True
        )

        logger.info(f"Robots config updated by {current_user.get('email')}")
        return {"message": "Robots configuration updated"}

    except Exception as e:
        logger.error(f"Error updating robots config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update robots configuration")


# ==================== File Generation ====================

def generate_robots_txt(config: RobotsConfig) -> str:
    """Generate robots.txt content from config."""
    lines = [f"User-agent: {config.user_agent}"]

    for path in config.allow:
        lines.append(f"Allow: {path}")

    for path in config.disallow:
        lines.append(f"Disallow: {path}")

    if config.sitemap_url:
        lines.append("")
        lines.append(f"Sitemap: {config.sitemap_url}")

    return "\n".join(lines)


def generate_sitemap_xml(entries: List[SitemapEntry]) -> str:
    """Generate sitemap.xml content from entries."""
    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    for entry in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{entry.url}</loc>")
        if entry.lastmod:
            lines.append(f"    <lastmod>{entry.lastmod}</lastmod>")
        lines.append(f"    <changefreq>{entry.changefreq}</changefreq>")
        lines.append(f"    <priority>{entry.priority}</priority>")
        lines.append("  </url>")

    lines.append("</urlset>")
    return "\n".join(lines)


@router.post("/generate-files", response_model=FileGenerationResponse)
async def generate_files(
    current_user: dict = Depends(get_current_marketing_user)
):
    """Generate sitemap.xml and robots.txt files."""
    try:
        db = get_mongodb()
        now = datetime.utcnow()

        # Get sitemap config
        sitemap_doc = await db.seo_sitemap.find_one({"_id": "global"})
        sitemap_entries = []
        if sitemap_doc:
            sitemap_entries = [SitemapEntry(**e) for e in sitemap_doc.get("entries", [])]
        else:
            # Use defaults - only indexable pages (exclude noindex pages like login)
            sitemap_entries = [
                SitemapEntry(url="https://aidenlink.cloud/", changefreq="weekly", priority=1.0),
                SitemapEntry(url="https://aidenlink.cloud/register", changefreq="monthly", priority=0.8),
                SitemapEntry(url="https://aidenlink.cloud/privacy", changefreq="monthly", priority=0.5),
            ]

        # Get robots config
        robots_doc = await db.seo_robots.find_one({"_id": "global"})
        if robots_doc:
            robots_config = RobotsConfig(
                user_agent=robots_doc.get("user_agent", "*"),
                allow=robots_doc.get("allow", []),
                disallow=robots_doc.get("disallow", []),
                sitemap_url=robots_doc.get("sitemap_url", ""),
            )
        else:
            robots_config = RobotsConfig(
                user_agent="*",
                allow=["/", "/privacy"],
                disallow=["/dashboard", "/admin", "/api", "/settings", "/chatbots"],
                sitemap_url="https://aidenlink.cloud/sitemap.xml"
            )

        # Generate content
        sitemap_content = generate_sitemap_xml(sitemap_entries)
        robots_content = generate_robots_txt(robots_config)

        # Determine file paths (frontend/public directory)
        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../frontend/public"))
        sitemap_path = os.path.join(base_path, "sitemap.xml")
        robots_path = os.path.join(base_path, "robots.txt")

        # Write files
        try:
            with open(sitemap_path, "w") as f:
                f.write(sitemap_content)
            with open(robots_path, "w") as f:
                f.write(robots_content)
        except IOError as e:
            logger.error(f"Error writing files: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to write files: {str(e)}")

        # Update last_generated timestamps
        await db.seo_sitemap.update_one(
            {"_id": "global"},
            {"$set": {"last_generated": now}},
            upsert=True
        )
        await db.seo_robots.update_one(
            {"_id": "global"},
            {"$set": {"last_generated": now}},
            upsert=True
        )

        logger.info(f"SEO files generated by {current_user.get('email')}")

        return FileGenerationResponse(
            success=True,
            message="Files generated successfully",
            sitemap_path=sitemap_path,
            robots_path=robots_path,
            generated_at=now,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating SEO files: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate files")


# ==================== Keyword Research Endpoints ====================

@router.post("/keywords/research", response_model=KeywordResearchResponse)
async def research_keywords(
    request: KeywordResearchRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Research keywords from a seed keyword.

    Generates related keywords, analyzes difficulty, estimates search volume,
    and clusters results by topic.
    """
    try:
        # Generate related keywords
        suggestions_raw = generate_related_keywords(
            request.seed_keyword,
            limit=request.limit
        )

        # Convert to response format
        suggestions = [
            KeywordSuggestion(
                keyword=s["keyword"],
                seed_keyword=s["seed_keyword"],
                difficulty_score=s["difficulty_score"],
                competition=s["competition"],
                search_volume=s["search_volume"],
                volume_category=s["volume_category"],
                keyword_type=s["keyword_type"],
                source=s.get("source"),
                question_type=s.get("question_type"),
            )
            for s in suggestions_raw
        ]

        # Cluster by topic
        clusters_raw = cluster_keywords_by_topic(suggestions_raw)
        clusters = {}
        for cluster_name, kws in clusters_raw.items():
            clusters[cluster_name] = [
                KeywordSuggestion(
                    keyword=s["keyword"],
                    seed_keyword=s["seed_keyword"],
                    difficulty_score=s["difficulty_score"],
                    competition=s["competition"],
                    search_volume=s["search_volume"],
                    volume_category=s["volume_category"],
                    keyword_type=s["keyword_type"],
                    source=s.get("source"),
                    question_type=s.get("question_type"),
                )
                for s in kws
            ]

        return KeywordResearchResponse(
            seed_keyword=request.seed_keyword,
            total_suggestions=len(suggestions),
            suggestions=suggestions,
            clusters=clusters,
        )

    except Exception as e:
        logger.error(f"Error researching keywords: {e}")
        raise HTTPException(status_code=500, detail="Failed to research keywords")


@router.post("/keywords/analyze", response_model=KeywordAnalysisResponse)
async def analyze_single_keyword(
    request: KeywordAnalysisRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Perform comprehensive analysis of a single keyword.

    Returns difficulty score, search volume estimates, related keywords,
    question variations, long-tail suggestions, and recommendations.
    """
    try:
        analysis = analyze_keyword(request.keyword)

        # Convert related keywords to response format
        related = [
            KeywordSuggestion(
                keyword=s["keyword"],
                seed_keyword=s["seed_keyword"],
                difficulty_score=s["difficulty_score"],
                competition=s["competition"],
                search_volume=s["search_volume"],
                volume_category=s["volume_category"],
                keyword_type=s["keyword_type"],
                source=s.get("source"),
            )
            for s in analysis["related_keywords"]
        ]

        questions = [
            KeywordSuggestion(
                keyword=s["keyword"],
                seed_keyword=s["seed_keyword"],
                difficulty_score=s["difficulty_score"],
                competition=s["competition"],
                search_volume=s["search_volume"],
                volume_category=s["volume_category"],
                keyword_type=s["keyword_type"],
                source=s.get("source"),
                question_type=s.get("question_type"),
            )
            for s in analysis["question_keywords"]
        ]

        long_tail = [
            KeywordSuggestion(
                keyword=s["keyword"],
                seed_keyword=s["seed_keyword"],
                difficulty_score=s["difficulty_score"],
                competition=s["competition"],
                search_volume=s["search_volume"],
                volume_category=s["volume_category"],
                keyword_type=s["keyword_type"],
                source=s.get("source"),
            )
            for s in analysis["long_tail_keywords"]
        ]

        return KeywordAnalysisResponse(
            keyword=analysis["keyword"],
            difficulty_score=analysis["difficulty_score"],
            competition=analysis["competition"],
            search_volume=analysis["search_volume"],
            volume_category=analysis["volume_category"],
            keyword_type=analysis["keyword_type"],
            word_count=analysis["word_count"],
            character_count=analysis["character_count"],
            related_keywords=related,
            question_keywords=questions,
            long_tail_keywords=long_tail,
            lsi_keywords=analysis["lsi_keywords"],
            recommendations=analysis["recommendations"],
            analyzed_at=analysis["analyzed_at"],
        )

    except Exception as e:
        logger.error(f"Error analyzing keyword: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze keyword")


@router.post("/keywords/questions", response_model=KeywordResearchResponse)
async def get_question_keywords(
    request: QuestionKeywordsRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Generate question-based keyword variations.

    Great for targeting featured snippets and voice search.
    """
    try:
        questions_raw = generate_question_keywords(
            request.seed_keyword,
            language=request.language,
            limit=request.limit
        )

        suggestions = [
            KeywordSuggestion(
                keyword=s["keyword"],
                seed_keyword=s["seed_keyword"],
                difficulty_score=s["difficulty_score"],
                competition=s["competition"],
                search_volume=s["search_volume"],
                volume_category=s["volume_category"],
                keyword_type=s["keyword_type"],
                source=s.get("source"),
                question_type=s.get("question_type"),
            )
            for s in questions_raw
        ]

        return KeywordResearchResponse(
            seed_keyword=request.seed_keyword,
            total_suggestions=len(suggestions),
            suggestions=suggestions,
        )

    except Exception as e:
        logger.error(f"Error generating question keywords: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate question keywords")


@router.post("/keywords/long-tail", response_model=KeywordResearchResponse)
async def get_long_tail_keywords(
    request: LongTailKeywordsRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Generate long-tail keyword variations.

    Long-tail keywords typically have lower competition and higher conversion rates.
    """
    try:
        long_tail_raw = generate_long_tail_keywords(
            request.seed_keyword,
            limit=request.limit
        )

        suggestions = [
            KeywordSuggestion(
                keyword=s["keyword"],
                seed_keyword=s["seed_keyword"],
                difficulty_score=s["difficulty_score"],
                competition=s["competition"],
                search_volume=s["search_volume"],
                volume_category=s["volume_category"],
                keyword_type=s["keyword_type"],
                source=s.get("source"),
            )
            for s in long_tail_raw
        ]

        return KeywordResearchResponse(
            seed_keyword=request.seed_keyword,
            total_suggestions=len(suggestions),
            suggestions=suggestions,
        )

    except Exception as e:
        logger.error(f"Error generating long-tail keywords: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate long-tail keywords")


@router.post("/keywords/research/save", response_model=SavedKeywordResearch)
async def save_keyword_research(
    request: KeywordResearchRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Save keyword research results to the database.
    """
    try:
        db = get_mongodb()

        # Generate research
        suggestions_raw = generate_related_keywords(
            request.seed_keyword,
            limit=request.limit
        )

        # Calculate average difficulty
        if suggestions_raw:
            avg_difficulty = sum(s["difficulty_score"] for s in suggestions_raw) / len(suggestions_raw)
        else:
            avg_difficulty = 0.0

        # Cluster keywords
        clusters_raw = cluster_keywords_by_topic(suggestions_raw)

        # Create document
        research_id = str(uuid.uuid4())
        now = datetime.utcnow()

        doc = {
            "_id": research_id,
            "seed_keyword": request.seed_keyword,
            "tenant_id": str(current_user.get("tenant_id", current_user.get("_id"))),
            "total_keywords": len(suggestions_raw),
            "difficulty_avg": round(avg_difficulty, 1),
            "suggestions": suggestions_raw,
            "clusters": {k: [dict(s) for s in v] for k, v in clusters_raw.items()},
            "created_at": now,
            "created_by": str(current_user.get("_id")),
        }

        await db.seo_keyword_research.insert_one(doc)

        logger.info(f"Keyword research saved: {request.seed_keyword} by {current_user.get('email')}")

        # Convert suggestions for response
        suggestions = [
            KeywordSuggestion(
                keyword=s["keyword"],
                seed_keyword=s["seed_keyword"],
                difficulty_score=s["difficulty_score"],
                competition=s["competition"],
                search_volume=s["search_volume"],
                volume_category=s["volume_category"],
                keyword_type=s["keyword_type"],
                source=s.get("source"),
            )
            for s in suggestions_raw
        ]

        return SavedKeywordResearch(
            id=research_id,
            seed_keyword=request.seed_keyword,
            tenant_id=doc["tenant_id"],
            total_keywords=len(suggestions_raw),
            difficulty_avg=round(avg_difficulty, 1),
            suggestions=suggestions,
            clusters=doc["clusters"],
            created_at=now,
            created_by=str(current_user.get("_id")),
        )

    except Exception as e:
        logger.error(f"Error saving keyword research: {e}")
        raise HTTPException(status_code=500, detail="Failed to save keyword research")


@router.get("/keywords/research/saved", response_model=SavedKeywordResearchListResponse)
async def list_saved_keyword_research(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    List saved keyword research results.
    """
    try:
        db = get_mongodb()
        tenant_id = str(current_user.get("tenant_id", current_user.get("_id")))

        cursor = db.seo_keyword_research.find(
            {"tenant_id": tenant_id}
        ).sort("created_at", -1).limit(limit)

        items_raw = await cursor.to_list(length=limit)

        items = []
        for doc in items_raw:
            suggestions = [
                KeywordSuggestion(
                    keyword=s["keyword"],
                    seed_keyword=s["seed_keyword"],
                    difficulty_score=s["difficulty_score"],
                    competition=s["competition"],
                    search_volume=s["search_volume"],
                    volume_category=s["volume_category"],
                    keyword_type=s["keyword_type"],
                    source=s.get("source"),
                )
                for s in doc.get("suggestions", [])
            ]

            items.append(SavedKeywordResearch(
                id=str(doc["_id"]),
                seed_keyword=doc["seed_keyword"],
                tenant_id=doc["tenant_id"],
                total_keywords=doc["total_keywords"],
                difficulty_avg=doc["difficulty_avg"],
                suggestions=suggestions,
                clusters=doc.get("clusters"),
                created_at=doc["created_at"],
                created_by=doc.get("created_by"),
            ))

        # Get total count
        total = await db.seo_keyword_research.count_documents({"tenant_id": tenant_id})

        return SavedKeywordResearchListResponse(items=items, total=total)

    except Exception as e:
        logger.error(f"Error listing saved keyword research: {e}")
        raise HTTPException(status_code=500, detail="Failed to list saved keyword research")


@router.delete("/keywords/research/saved/{research_id}", response_model=dict)
async def delete_saved_keyword_research(
    research_id: str,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Delete a saved keyword research result.
    """
    try:
        db = get_mongodb()
        tenant_id = str(current_user.get("tenant_id", current_user.get("_id")))

        result = await db.seo_keyword_research.delete_one({
            "_id": research_id,
            "tenant_id": tenant_id
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Keyword research not found")

        logger.info(f"Keyword research deleted: {research_id} by {current_user.get('email')}")
        return {"message": "Keyword research deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting keyword research: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete keyword research")


# ==================== Content Analysis Endpoints ====================

@router.post("/content/analyze", response_model=ContentAnalysisResponse)
async def analyze_content_endpoint(
    request: ContentAnalysisRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Perform comprehensive content analysis.

    Analyzes readability, keyword density, heading structure,
    image alt text, and content length. Returns overall score
    and detailed recommendations.
    """
    try:
        result = analyze_content(
            content=request.content,
            html_content=request.html_content,
            primary_keyword=request.primary_keyword,
            secondary_keywords=request.secondary_keywords,
            content_type=request.content_type,
            url=request.url,
        )

        return ContentAnalysisResponse(**result)

    except Exception as e:
        logger.error(f"Error analyzing content: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze content")


@router.post("/content/score", response_model=QuickScoreResponse)
async def get_quick_score(
    request: QuickScoreRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Get a quick content score (0-100) with minimal analysis.

    Useful for real-time feedback while writing.
    """
    try:
        # Run analysis
        result = analyze_content(
            content=request.content,
            primary_keyword=request.primary_keyword,
            content_type="article",
        )

        overall = result["overall"]
        issues = result["all_issues"]

        return QuickScoreResponse(
            score=overall["overall_score"],
            grade=overall["grade"],
            word_count=result["readability"]["metrics"]["words"],
            readability_score=result["readability"]["scores"]["flesch_reading_ease"],
            issues_count=len(issues),
            top_issues=issues[:3],
        )

    except Exception as e:
        logger.error(f"Error getting quick score: {e}")
        raise HTTPException(status_code=500, detail="Failed to get content score")


@router.post("/content/readability", response_model=ReadabilityResult)
async def analyze_readability_endpoint(
    request: ReadabilityRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Analyze content readability using multiple metrics.

    Returns Flesch Reading Ease, Flesch-Kincaid Grade Level,
    SMOG Index, Coleman-Liau Index, ARI, and Gunning Fog.
    """
    try:
        result = analyze_readability(request.content)
        return ReadabilityResult(**result)

    except Exception as e:
        logger.error(f"Error analyzing readability: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze readability")


@router.post("/content/keyword-density", response_model=KeywordDensityResult)
async def analyze_keyword_density_endpoint(
    content: str,
    primary_keyword: str,
    secondary_keywords: List[str] = Query(default=[]),
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Analyze keyword density in content.

    Returns density percentages, counts, and optimization status.
    """
    try:
        result = analyze_keyword_density(
            content=content,
            primary_keyword=primary_keyword,
            secondary_keywords=secondary_keywords,
        )
        return KeywordDensityResult(**result)

    except Exception as e:
        logger.error(f"Error analyzing keyword density: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze keyword density")


@router.post("/content/heading-structure", response_model=HeadingAnalysisResult)
async def analyze_heading_structure_endpoint(
    request: HeadingAnalysisRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Analyze heading hierarchy in HTML content.

    Checks for proper H1-H6 usage, hierarchy issues,
    and SEO best practices.
    """
    try:
        result = analyze_heading_structure(request.html_content)
        return HeadingAnalysisResult(**result)

    except Exception as e:
        logger.error(f"Error analyzing heading structure: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze heading structure")


@router.post("/content/image-audit", response_model=ImageAnalysisResult)
async def audit_images_endpoint(
    request: ImageAuditRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Audit images for alt text optimization.

    Identifies missing or empty alt attributes and
    provides recommendations.
    """
    try:
        result = analyze_images(request.html_content)
        return ImageAnalysisResult(**result)

    except Exception as e:
        logger.error(f"Error auditing images: {e}")
        raise HTTPException(status_code=500, detail="Failed to audit images")


# ==================== Technical SEO Endpoints ====================

@router.post("/technical/page-speed", response_model=PageSpeedResponse)
async def analyze_page_speed_endpoint(
    request: PageSpeedRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Analyze page speed using Google PageSpeed Insights API.

    Returns performance scores, Core Web Vitals, and improvement opportunities.
    Supports both mobile and desktop analysis.
    """
    try:
        result = await analyze_page_speed(
            url=request.url,
            strategy=request.strategy
        )
        return PageSpeedResponse(**result)

    except Exception as e:
        logger.error(f"Error analyzing page speed: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze page speed")


@router.post("/technical/core-web-vitals", response_model=CoreWebVitalsResponse)
async def get_core_web_vitals_endpoint(
    url: str,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Get Core Web Vitals for both mobile and desktop.

    Returns LCP, FID/TBT, CLS, FCP, TTFB, and Speed Index.
    """
    try:
        result = await get_core_web_vitals(url)
        return CoreWebVitalsResponse(**result)

    except Exception as e:
        logger.error(f"Error getting Core Web Vitals: {e}")
        raise HTTPException(status_code=500, detail="Failed to get Core Web Vitals")


@router.post("/technical/mobile-check", response_model=MobileFriendlinessResponse)
async def check_mobile_friendliness_endpoint(
    url: str,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Check mobile friendliness of a URL.

    Analyzes viewport, tap targets, font sizes, and content width.
    """
    try:
        result = await check_mobile_friendliness(url)
        return MobileFriendlinessResponse(**result)

    except Exception as e:
        logger.error(f"Error checking mobile friendliness: {e}")
        raise HTTPException(status_code=500, detail="Failed to check mobile friendliness")


@router.post("/technical/broken-links", response_model=BrokenLinkResponse)
async def scan_broken_links_endpoint(
    request: BrokenLinkRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Scan a page for broken links.

    Checks both internal and external links, identifies broken links,
    redirects, and connection errors.
    """
    try:
        result = await scan_page_links(
            url=request.url,
            check_external=request.check_external,
            max_links=request.max_links
        )
        return BrokenLinkResponse(**result)

    except Exception as e:
        logger.error(f"Error scanning broken links: {e}")
        raise HTTPException(status_code=500, detail="Failed to scan broken links")


@router.post("/technical/ssl-check", response_model=SSLCheckResponse)
async def check_ssl_endpoint(
    request: SSLCheckRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Check SSL certificate status for a URL.

    Returns certificate validity, issuer, expiration date,
    and any security issues.
    """
    try:
        result = await check_ssl_certificate(request.url)
        return SSLCheckResponse(**result)

    except Exception as e:
        logger.error(f"Error checking SSL: {e}")
        raise HTTPException(status_code=500, detail="Failed to check SSL certificate")


@router.post("/technical/schema-validate", response_model=SchemaValidationResponse)
async def validate_schema_endpoint(
    request: SchemaValidationRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Validate structured data (Schema.org) on a page.

    Extracts and validates JSON-LD and Microdata markup,
    checks for required/recommended properties.
    """
    try:
        result = await validate_page_structured_data(request.url)
        return SchemaValidationResponse(**result)

    except Exception as e:
        logger.error(f"Error validating schema: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate structured data")


@router.get("/technical/schema-template/{schema_type}", response_model=SchemaTemplateResponse)
async def get_schema_template_endpoint(
    schema_type: str,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Get a template for a Schema.org type.

    Returns ready-to-use JSON-LD template for common schema types.
    """
    try:
        template = get_schema_template(schema_type)
        if template is None:
            return SchemaTemplateResponse(
                schema_type=schema_type,
                template=None,
                error=f"Template not found for type: {schema_type}"
            )
        return SchemaTemplateResponse(
            schema_type=schema_type,
            template=template
        )

    except Exception as e:
        logger.error(f"Error getting schema template: {e}")
        raise HTTPException(status_code=500, detail="Failed to get schema template")


@router.get("/technical/schema-types")
async def list_schema_types(
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    List available Schema.org types with descriptions.
    """
    try:
        return get_available_schema_types()

    except Exception as e:
        logger.error(f"Error listing schema types: {e}")
        raise HTTPException(status_code=500, detail="Failed to list schema types")


@router.post("/technical/audit", response_model=TechnicalAuditResponse)
async def run_technical_audit_endpoint(
    request: TechnicalAuditRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Run a comprehensive technical SEO audit.

    Combines PageSpeed, SSL, broken links, structured data,
    meta tags, and other technical checks into one report.
    """
    try:
        result = await run_full_technical_audit(request.url)
        return TechnicalAuditResponse(**result)

    except Exception as e:
        logger.error(f"Error running technical audit: {e}")
        raise HTTPException(status_code=500, detail="Failed to run technical audit")


@router.post("/technical/quick-check", response_model=QuickTechnicalCheckResponse)
async def run_quick_check_endpoint(
    request: QuickTechnicalCheckRequest,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Run a quick technical check for essential elements.

    Faster than full audit, focuses on critical issues like
    HTTPS, title, meta description, viewport, canonical, and H1.
    """
    try:
        result = await get_quick_technical_check(request.url)
        return QuickTechnicalCheckResponse(**result)

    except Exception as e:
        logger.error(f"Error running quick check: {e}")
        raise HTTPException(status_code=500, detail="Failed to run quick check")


# ==================== Redirect Manager Endpoints ====================

@router.get("/technical/redirects", response_model=RedirectListResponse)
async def list_redirects(
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    List all redirect rules.
    """
    try:
        db = get_mongodb()

        redirects_cursor = db.seo_redirects.find({}).sort("created_at", -1)
        redirects_data = await redirects_cursor.to_list(length=500)

        redirects = []
        for r in redirects_data:
            redirects.append(RedirectRule(
                id=str(r.get("_id")),
                source_url=r.get("source_url"),
                target_url=r.get("target_url"),
                redirect_type=r.get("redirect_type", "301"),
                is_active=r.get("is_active", True),
                created_at=r.get("created_at"),
                updated_at=r.get("updated_at"),
            ))

        return RedirectListResponse(redirects=redirects, total=len(redirects))

    except Exception as e:
        logger.error(f"Error listing redirects: {e}")
        raise HTTPException(status_code=500, detail="Failed to list redirects")


@router.post("/technical/redirects", response_model=RedirectRule)
async def create_redirect(
    redirect_data: RedirectRuleCreate,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Create a new redirect rule.
    """
    try:
        db = get_mongodb()

        # Check for duplicate source URL
        existing = await db.seo_redirects.find_one({"source_url": redirect_data.source_url})
        if existing:
            raise HTTPException(status_code=400, detail="Redirect for this source URL already exists")

        redirect_id = str(uuid.uuid4())
        now = datetime.utcnow()

        doc = {
            "_id": redirect_id,
            "source_url": redirect_data.source_url,
            "target_url": redirect_data.target_url,
            "redirect_type": redirect_data.redirect_type,
            "is_active": redirect_data.is_active,
            "created_at": now,
            "updated_at": now,
            "created_by": str(current_user.get("_id")),
        }

        await db.seo_redirects.insert_one(doc)

        logger.info(f"Redirect created: {redirect_data.source_url} -> {redirect_data.target_url}")

        return RedirectRule(
            id=redirect_id,
            source_url=doc["source_url"],
            target_url=doc["target_url"],
            redirect_type=doc["redirect_type"],
            is_active=doc["is_active"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating redirect: {e}")
        raise HTTPException(status_code=500, detail="Failed to create redirect")


@router.put("/technical/redirects/{redirect_id}", response_model=dict)
async def update_redirect(
    redirect_id: str,
    update: RedirectRuleUpdate,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Update a redirect rule.
    """
    try:
        db = get_mongodb()

        existing = await db.seo_redirects.find_one({"_id": redirect_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Redirect not found")

        update_dict = update.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()

        await db.seo_redirects.update_one(
            {"_id": redirect_id},
            {"$set": update_dict}
        )

        logger.info(f"Redirect {redirect_id} updated")
        return {"message": "Redirect updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating redirect: {e}")
        raise HTTPException(status_code=500, detail="Failed to update redirect")


@router.delete("/technical/redirects/{redirect_id}", response_model=dict)
async def delete_redirect(
    redirect_id: str,
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Delete a redirect rule.
    """
    try:
        db = get_mongodb()

        result = await db.seo_redirects.delete_one({"_id": redirect_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Redirect not found")

        logger.info(f"Redirect {redirect_id} deleted")
        return {"message": "Redirect deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting redirect: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete redirect")
