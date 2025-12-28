"""
Technical SEO audit service combining all technical checks.
Performs comprehensive technical SEO analysis of web pages.
"""
import asyncio
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

from .page_speed import analyze_page_speed, get_core_web_vitals
from .link_checker import scan_page_links, check_ssl_certificate, get_link_health_score
from .schema_validator import validate_page_structured_data


async def run_full_technical_audit(url: str) -> Dict[str, Any]:
    """
    Run a comprehensive technical SEO audit on a URL.

    This combines:
    - PageSpeed analysis (mobile & desktop) - optional, may hit API limits
    - Core Web Vitals
    - SSL certificate check
    - Broken link scan
    - Structured data validation
    - Meta tag analysis
    - Mobile friendliness
    - Additional technical checks
    """
    result = {
        "url": url,
        "audited_at": datetime.utcnow().isoformat(),
        "overall_score": 0,
        "grade": "F",
        "categories": {},
        "critical_issues": [],
        "warnings": [],
        "passed_checks": [],
        "recommendations": []
    }

    try:
        # Run non-PageSpeed audits first (these don't have API limits)
        core_tasks = [
            check_ssl_certificate(url),
            scan_page_links(url, check_external=True, max_links=50),
            validate_page_structured_data(url),
            _analyze_meta_tags(url),
            _check_technical_elements(url)
        ]

        core_results = await asyncio.gather(*core_tasks, return_exceptions=True)

        ssl_result = core_results[0] if not isinstance(core_results[0], Exception) else {"valid": False, "errors": [str(core_results[0])]}
        links_result = core_results[1] if not isinstance(core_results[1], Exception) else {"summary": {}}
        schema_result = core_results[2] if not isinstance(core_results[2], Exception) else {"overall_score": 0}
        meta_result = core_results[3] if not isinstance(core_results[3], Exception) else {"score": 0}
        technical_result = core_results[4] if not isinstance(core_results[4], Exception) else {"score": 0}

        # Try PageSpeed analysis separately (may fail due to API limits)
        mobile_speed = {"success": False, "error": "skipped"}
        desktop_speed = {"success": False, "error": "skipped"}

        try:
            pagespeed_tasks = [
                analyze_page_speed(url, "mobile"),
                analyze_page_speed(url, "desktop"),
            ]
            pagespeed_results = await asyncio.gather(*pagespeed_tasks, return_exceptions=True)
            mobile_speed = pagespeed_results[0] if not isinstance(pagespeed_results[0], Exception) else {"success": False, "error": str(pagespeed_results[0])}
            desktop_speed = pagespeed_results[1] if not isinstance(pagespeed_results[1], Exception) else {"success": False, "error": str(pagespeed_results[1])}
        except Exception as e:
            # PageSpeed failed, continue with other checks
            pass

        # Calculate category scores
        categories = {}

        # Performance Category (PageSpeed) - may be unavailable due to API limits
        pagespeed_available = mobile_speed.get("success", False) or desktop_speed.get("success", False)
        performance_score = 0
        if mobile_speed.get("success"):
            performance_score = mobile_speed.get("overall_score", 0)
        elif desktop_speed.get("success"):
            performance_score = desktop_speed.get("overall_score", 0)

        categories["performance"] = {
            "score": performance_score,
            "available": pagespeed_available,
            "mobile_score": mobile_speed.get("overall_score", 0) if mobile_speed.get("success") else None,
            "desktop_score": desktop_speed.get("overall_score", 0) if desktop_speed.get("success") else None,
            "core_web_vitals": mobile_speed.get("core_web_vitals", {}),
            "opportunities": mobile_speed.get("opportunities", [])[:5],
            "error": mobile_speed.get("error") if not mobile_speed.get("success") else None
        }

        # Security Category (SSL)
        security_score = 100 if ssl_result.get("valid") else 0
        if ssl_result.get("days_until_expiry") and ssl_result["days_until_expiry"] < 30:
            security_score = max(50, security_score - 30)
        categories["security"] = {
            "score": security_score,
            "ssl_valid": ssl_result.get("valid", False),
            "ssl_issuer": ssl_result.get("issuer"),
            "ssl_expires": ssl_result.get("expires"),
            "days_until_expiry": ssl_result.get("days_until_expiry"),
            "errors": ssl_result.get("errors", [])
        }

        # Links Category
        links_score = get_link_health_score(links_result)
        categories["links"] = {
            "score": links_score,
            "total_links": links_result.get("summary", {}).get("total", 0),
            "broken_links": len(links_result.get("broken_links", [])),
            "redirects": len(links_result.get("redirects", [])),
            "broken_link_details": links_result.get("broken_links", [])[:10]
        }

        # Structured Data Category
        schema_score = schema_result.get("overall_score", 0)
        categories["structured_data"] = {
            "score": schema_score,
            "total_schemas": schema_result.get("total_schemas", 0),
            "valid_schemas": schema_result.get("valid_schemas", 0),
            "schema_types": schema_result.get("schema_types", []),
            "issues": schema_result.get("issues", [])[:5]
        }

        # Meta Tags Category
        meta_score = meta_result.get("score", 0)
        categories["meta_tags"] = {
            "score": meta_score,
            "title": meta_result.get("title", {}),
            "description": meta_result.get("description", {}),
            "open_graph": meta_result.get("open_graph", {}),
            "twitter_cards": meta_result.get("twitter_cards", {}),
            "issues": meta_result.get("issues", [])
        }

        # Technical Elements Category
        technical_score = technical_result.get("score", 0)
        categories["technical"] = {
            "score": technical_score,
            "viewport": technical_result.get("viewport", {}),
            "canonical": technical_result.get("canonical", {}),
            "robots": technical_result.get("robots", {}),
            "language": technical_result.get("language", {}),
            "issues": technical_result.get("issues", [])
        }

        result["categories"] = categories

        # Calculate overall score (weighted average)
        # If PageSpeed is not available, redistribute its weight to other categories
        if pagespeed_available:
            weights = {
                "performance": 0.30,
                "security": 0.15,
                "links": 0.15,
                "structured_data": 0.10,
                "meta_tags": 0.15,
                "technical": 0.15
            }
        else:
            # Redistribute performance weight when PageSpeed unavailable
            weights = {
                "security": 0.20,
                "links": 0.20,
                "structured_data": 0.15,
                "meta_tags": 0.22,
                "technical": 0.23
            }
            result["pagespeed_unavailable"] = True
            result["warnings"].append({
                "category": "Performance",
                "issue": "PageSpeed data unavailable (API quota exceeded). Score based on other metrics only."
            })

        overall_score = sum(
            categories[cat]["score"] * weight
            for cat, weight in weights.items()
            if cat in categories
        )
        result["overall_score"] = int(overall_score)
        result["grade"] = _get_grade(overall_score)

        # Collect critical issues
        _collect_issues(result, categories, mobile_speed, ssl_result, links_result, meta_result, technical_result)

        # Generate recommendations
        _generate_recommendations(result, categories)

    except Exception as e:
        result["error"] = str(e)

    return result


async def _analyze_meta_tags(url: str) -> Dict[str, Any]:
    """Analyze meta tags on a page."""
    result = {
        "score": 0,
        "title": {},
        "description": {},
        "open_graph": {},
        "twitter_cards": {},
        "issues": [],
        "passed": []
    }

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code != 200:
                result["issues"].append(f"Could not fetch page: HTTP {response.status_code}")
                return result

            soup = BeautifulSoup(response.text, "html.parser")

            # Title tag
            title_tag = soup.find("title")
            title_text = title_tag.get_text(strip=True) if title_tag else ""
            title_length = len(title_text)
            result["title"] = {
                "content": title_text[:100],
                "length": title_length,
                "status": "good" if 30 <= title_length <= 60 else "warning"
            }

            if not title_text:
                result["issues"].append("Missing title tag")
            elif title_length < 30:
                result["issues"].append(f"Title too short ({title_length} chars, recommended: 30-60)")
            elif title_length > 60:
                result["issues"].append(f"Title too long ({title_length} chars, recommended: 30-60)")
            else:
                result["passed"].append("Title tag is optimal length")

            # Meta description
            desc_tag = soup.find("meta", attrs={"name": "description"})
            desc_text = desc_tag.get("content", "") if desc_tag else ""
            desc_length = len(desc_text)
            result["description"] = {
                "content": desc_text[:200],
                "length": desc_length,
                "status": "good" if 120 <= desc_length <= 160 else "warning"
            }

            if not desc_text:
                result["issues"].append("Missing meta description")
            elif desc_length < 120:
                result["issues"].append(f"Meta description too short ({desc_length} chars, recommended: 120-160)")
            elif desc_length > 160:
                result["issues"].append(f"Meta description too long ({desc_length} chars, recommended: 120-160)")
            else:
                result["passed"].append("Meta description is optimal length")

            # Open Graph tags
            og_tags = {}
            for tag in soup.find_all("meta", property=lambda x: x and x.startswith("og:")):
                prop = tag.get("property", "").replace("og:", "")
                og_tags[prop] = tag.get("content", "")[:200]

            result["open_graph"] = og_tags
            required_og = ["title", "description", "image", "url"]
            missing_og = [t for t in required_og if t not in og_tags]
            if missing_og:
                result["issues"].append(f"Missing Open Graph tags: {', '.join(missing_og)}")
            elif len(og_tags) >= 4:
                result["passed"].append("Open Graph tags properly configured")

            # Twitter Card tags
            twitter_tags = {}
            for tag in soup.find_all("meta", attrs={"name": lambda x: x and x.startswith("twitter:")}):
                name = tag.get("name", "").replace("twitter:", "")
                twitter_tags[name] = tag.get("content", "")[:200]

            result["twitter_cards"] = twitter_tags
            if "card" not in twitter_tags:
                result["issues"].append("Missing Twitter Card meta tags")
            else:
                result["passed"].append("Twitter Card meta tags present")

            # Calculate score
            score = 100
            score -= len(result["issues"]) * 10
            result["score"] = max(0, min(100, score))

    except Exception as e:
        result["issues"].append(f"Error analyzing meta tags: {str(e)[:100]}")

    return result


async def _check_technical_elements(url: str) -> Dict[str, Any]:
    """Check technical HTML elements."""
    result = {
        "score": 0,
        "viewport": {},
        "canonical": {},
        "robots": {},
        "language": {},
        "charset": {},
        "issues": [],
        "passed": []
    }

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return result

            soup = BeautifulSoup(response.text, "html.parser")
            parsed_url = urlparse(url)

            # Viewport meta tag
            viewport = soup.find("meta", attrs={"name": "viewport"})
            if viewport:
                viewport_content = viewport.get("content", "")
                result["viewport"] = {
                    "present": True,
                    "content": viewport_content
                }
                if "width=device-width" in viewport_content:
                    result["passed"].append("Viewport meta tag properly configured")
                else:
                    result["issues"].append("Viewport meta tag missing 'width=device-width'")
            else:
                result["viewport"] = {"present": False}
                result["issues"].append("Missing viewport meta tag (important for mobile)")

            # Canonical URL
            canonical = soup.find("link", rel="canonical")
            if canonical:
                canonical_href = canonical.get("href", "")
                result["canonical"] = {
                    "present": True,
                    "url": canonical_href
                }
                # Check if canonical is properly set
                if canonical_href and (canonical_href.startswith("/") or parsed_url.netloc in canonical_href):
                    result["passed"].append("Canonical URL is set")
                else:
                    result["issues"].append("Canonical URL may be incorrectly configured")
            else:
                result["canonical"] = {"present": False}
                result["issues"].append("Missing canonical URL tag")

            # Robots meta tag
            robots = soup.find("meta", attrs={"name": "robots"})
            result["robots"] = {
                "present": robots is not None,
                "content": robots.get("content", "") if robots else "index, follow (default)"
            }
            if robots:
                robots_content = robots.get("content", "").lower()
                if "noindex" in robots_content:
                    result["issues"].append("Page is set to noindex")
                else:
                    result["passed"].append("Page is indexable")

            # Language attribute
            html_tag = soup.find("html")
            lang = html_tag.get("lang", "") if html_tag else ""
            result["language"] = {
                "present": bool(lang),
                "value": lang
            }
            if lang:
                result["passed"].append(f"Language attribute set: {lang}")
            else:
                result["issues"].append("Missing language attribute on <html> tag")

            # Charset
            charset = soup.find("meta", charset=True)
            if not charset:
                charset = soup.find("meta", attrs={"http-equiv": "Content-Type"})
            result["charset"] = {
                "present": charset is not None,
                "value": charset.get("charset", "") if charset else ""
            }
            if charset:
                result["passed"].append("Character encoding specified")
            else:
                result["issues"].append("Missing charset declaration")

            # Check for HTTPS
            if parsed_url.scheme == "https":
                result["passed"].append("Site uses HTTPS")
            else:
                result["issues"].append("Site not using HTTPS")

            # Calculate score
            score = 100
            score -= len(result["issues"]) * 12
            result["score"] = max(0, min(100, score))

    except Exception as e:
        result["issues"].append(f"Error checking technical elements: {str(e)[:100]}")

    return result


def _get_grade(score: int) -> str:
    """Convert score to letter grade."""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"


def _collect_issues(
    result: Dict[str, Any],
    categories: Dict[str, Any],
    mobile_speed: Dict[str, Any],
    ssl_result: Dict[str, Any],
    links_result: Dict[str, Any],
    meta_result: Dict[str, Any],
    technical_result: Dict[str, Any]
) -> None:
    """Collect all issues into critical issues and warnings."""

    # Performance issues (only report if PageSpeed data is available)
    if categories["performance"].get("available", False):
        if categories["performance"]["score"] < 50:
            result["critical_issues"].append({
                "category": "Performance",
                "issue": f"Poor mobile performance score: {categories['performance']['score']}/100",
                "impact": "High"
            })
        elif categories["performance"]["score"] < 70:
            result["warnings"].append({
                "category": "Performance",
                "issue": f"Mobile performance needs improvement: {categories['performance']['score']}/100"
            })
        else:
            result["passed_checks"].append("Mobile performance is good")
    else:
        result["passed_checks"].append("PageSpeed analysis skipped (API quota exceeded)")

    # SSL issues
    if not ssl_result.get("valid"):
        result["critical_issues"].append({
            "category": "Security",
            "issue": "SSL certificate is invalid or missing",
            "impact": "Critical"
        })
    elif ssl_result.get("days_until_expiry") and ssl_result["days_until_expiry"] < 30:
        result["warnings"].append({
            "category": "Security",
            "issue": f"SSL certificate expires in {ssl_result['days_until_expiry']} days"
        })
    else:
        result["passed_checks"].append("SSL certificate is valid")

    # Broken links
    broken_count = len(links_result.get("broken_links", []))
    if broken_count > 5:
        result["critical_issues"].append({
            "category": "Links",
            "issue": f"Found {broken_count} broken links",
            "impact": "High"
        })
    elif broken_count > 0:
        result["warnings"].append({
            "category": "Links",
            "issue": f"Found {broken_count} broken link(s)"
        })
    else:
        result["passed_checks"].append("No broken links found")

    # Structured data
    if categories["structured_data"]["total_schemas"] == 0:
        result["warnings"].append({
            "category": "Structured Data",
            "issue": "No structured data found"
        })
    elif categories["structured_data"]["valid_schemas"] < categories["structured_data"]["total_schemas"]:
        result["warnings"].append({
            "category": "Structured Data",
            "issue": "Some structured data has validation errors"
        })
    else:
        result["passed_checks"].append("Structured data is valid")

    # Meta tags
    for issue in meta_result.get("issues", []):
        if "Missing" in issue:
            result["critical_issues"].append({
                "category": "Meta Tags",
                "issue": issue,
                "impact": "Medium"
            })
        else:
            result["warnings"].append({
                "category": "Meta Tags",
                "issue": issue
            })

    # Technical elements
    for issue in technical_result.get("issues", []):
        if "noindex" in issue.lower() or "missing viewport" in issue.lower():
            result["critical_issues"].append({
                "category": "Technical",
                "issue": issue,
                "impact": "High"
            })
        else:
            result["warnings"].append({
                "category": "Technical",
                "issue": issue
            })


def _generate_recommendations(result: Dict[str, Any], categories: Dict[str, Any]) -> None:
    """Generate actionable recommendations based on audit results."""

    # Performance recommendations (only if PageSpeed data is available)
    if categories["performance"].get("available", False):
        if categories["performance"]["score"] < 70:
            result["recommendations"].append({
                "category": "Performance",
                "priority": "high",
                "title": "Improve Page Speed",
                "description": "Focus on reducing render-blocking resources and optimizing images"
            })

            # Add specific opportunities
            for opp in categories["performance"].get("opportunities", [])[:3]:
                result["recommendations"].append({
                    "category": "Performance",
                    "priority": opp.get("priority", "medium"),
                    "title": opp.get("title", ""),
                    "description": opp.get("description", "")[:200]
                })
    else:
        result["recommendations"].append({
            "category": "Performance",
            "priority": "medium",
            "title": "Run PageSpeed Analysis Later",
            "description": "PageSpeed API quota exceeded. Try again tomorrow to get performance recommendations."
        })

    # Security recommendations
    if not categories["security"]["ssl_valid"]:
        result["recommendations"].append({
            "category": "Security",
            "priority": "critical",
            "title": "Install Valid SSL Certificate",
            "description": "HTTPS is essential for security and SEO rankings"
        })

    # Links recommendations
    if categories["links"]["broken_links"] > 0:
        result["recommendations"].append({
            "category": "Links",
            "priority": "high",
            "title": "Fix Broken Links",
            "description": f"Update or remove {categories['links']['broken_links']} broken link(s)"
        })

    # Structured data recommendations
    if categories["structured_data"]["total_schemas"] == 0:
        result["recommendations"].append({
            "category": "Structured Data",
            "priority": "medium",
            "title": "Add Structured Data",
            "description": "Add JSON-LD schema markup to help search engines understand your content"
        })

    # Meta tag recommendations
    if categories["meta_tags"]["score"] < 80:
        result["recommendations"].append({
            "category": "Meta Tags",
            "priority": "high",
            "title": "Optimize Meta Tags",
            "description": "Ensure title (30-60 chars) and description (120-160 chars) are optimized"
        })

    # Technical recommendations
    if categories["technical"]["score"] < 80:
        result["recommendations"].append({
            "category": "Technical",
            "priority": "medium",
            "title": "Fix Technical Issues",
            "description": "Add missing viewport, canonical URL, and language attributes"
        })


async def get_quick_technical_check(url: str) -> Dict[str, Any]:
    """
    Quick technical check for essential elements.
    Faster than full audit, focuses on critical issues.
    """
    result = {
        "url": url,
        "checked_at": datetime.utcnow().isoformat(),
        "quick_score": 0,
        "checks": [],
        "critical_issues": []
    }

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            # Check if URL is accessible
            response = await client.get(url)

            result["checks"].append({
                "name": "Accessibility",
                "passed": response.status_code == 200,
                "value": f"HTTP {response.status_code}"
            })

            if response.status_code != 200:
                result["critical_issues"].append("Page is not accessible")
                return result

            soup = BeautifulSoup(response.text, "html.parser")
            parsed = urlparse(url)

            # HTTPS check
            https_check = parsed.scheme == "https"
            result["checks"].append({
                "name": "HTTPS",
                "passed": https_check,
                "value": "Enabled" if https_check else "Not enabled"
            })
            if not https_check:
                result["critical_issues"].append("Site not using HTTPS")

            # Title check
            title = soup.find("title")
            title_text = title.get_text(strip=True) if title else ""
            title_ok = 30 <= len(title_text) <= 70
            result["checks"].append({
                "name": "Title Tag",
                "passed": bool(title_text) and title_ok,
                "value": f"{len(title_text)} characters"
            })

            # Meta description check
            desc = soup.find("meta", attrs={"name": "description"})
            desc_text = desc.get("content", "") if desc else ""
            desc_ok = 100 <= len(desc_text) <= 170
            result["checks"].append({
                "name": "Meta Description",
                "passed": bool(desc_text) and desc_ok,
                "value": f"{len(desc_text)} characters"
            })

            # Viewport check
            viewport = soup.find("meta", attrs={"name": "viewport"})
            result["checks"].append({
                "name": "Viewport Meta",
                "passed": viewport is not None,
                "value": "Present" if viewport else "Missing"
            })

            # Canonical check
            canonical = soup.find("link", rel="canonical")
            result["checks"].append({
                "name": "Canonical URL",
                "passed": canonical is not None,
                "value": "Present" if canonical else "Missing"
            })

            # H1 check
            h1_tags = soup.find_all("h1")
            h1_ok = len(h1_tags) == 1
            result["checks"].append({
                "name": "H1 Tag",
                "passed": h1_ok,
                "value": f"{len(h1_tags)} found"
            })
            if len(h1_tags) == 0:
                result["critical_issues"].append("Missing H1 tag")
            elif len(h1_tags) > 1:
                result["critical_issues"].append("Multiple H1 tags found")

            # Calculate score
            passed_count = sum(1 for c in result["checks"] if c["passed"])
            result["quick_score"] = int((passed_count / len(result["checks"])) * 100)

    except Exception as e:
        result["error"] = str(e)

    return result
