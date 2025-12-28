"""
Google PageSpeed Insights API integration for performance analysis.
Uses the free Google PageSpeed Insights API.
"""
import httpx
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import os


# Google PageSpeed Insights API endpoint
PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


async def analyze_page_speed(
    url: str,
    strategy: str = "mobile",
    categories: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyze page speed using Google PageSpeed Insights API.

    Args:
        url: The URL to analyze
        strategy: 'mobile' or 'desktop'
        categories: List of categories to analyze (performance, accessibility, best-practices, seo)

    Returns:
        PageSpeed analysis results
    """
    if categories is None:
        categories = ["performance", "accessibility", "best-practices", "seo"]

    # Get API key from environment (optional - API works without key but with rate limits)
    api_key = os.getenv("GOOGLE_PAGESPEED_API_KEY", "")

    params = {
        "url": url,
        "strategy": strategy,
    }

    # Add categories
    for category in categories:
        params[f"category"] = category

    if api_key:
        params["key"] = api_key

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(PAGESPEED_API_URL, params={
                "url": url,
                "strategy": strategy,
                "category": categories,
                "key": api_key if api_key else None
            })

            if response.status_code == 200:
                data = response.json()
                return _parse_pagespeed_response(data, strategy)
            else:
                return {
                    "success": False,
                    "error": f"API returned status {response.status_code}",
                    "message": response.text[:500]
                }
    except httpx.TimeoutException:
        return {
            "success": False,
            "error": "timeout",
            "message": "PageSpeed API request timed out. The page may be slow to load."
        }
    except Exception as e:
        return {
            "success": False,
            "error": "request_failed",
            "message": str(e)
        }


def _parse_pagespeed_response(data: Dict[str, Any], strategy: str) -> Dict[str, Any]:
    """Parse the PageSpeed Insights API response."""
    lighthouse = data.get("lighthouseResult", {})
    categories = lighthouse.get("categories", {})
    audits = lighthouse.get("audits", {})

    # Extract scores
    scores = {}
    for cat_id, cat_data in categories.items():
        scores[cat_id] = {
            "score": int((cat_data.get("score") or 0) * 100),
            "title": cat_data.get("title", cat_id)
        }

    # Extract Core Web Vitals
    core_web_vitals = _extract_core_web_vitals(audits)

    # Extract key metrics
    metrics = _extract_metrics(audits)

    # Extract opportunities (improvements)
    opportunities = _extract_opportunities(audits)

    # Extract diagnostics
    diagnostics = _extract_diagnostics(audits)

    return {
        "success": True,
        "url": data.get("id", ""),
        "strategy": strategy,
        "fetch_time": data.get("analysisUTCTimestamp", ""),
        "scores": scores,
        "core_web_vitals": core_web_vitals,
        "metrics": metrics,
        "opportunities": opportunities,
        "diagnostics": diagnostics,
        "overall_score": scores.get("performance", {}).get("score", 0)
    }


def _extract_core_web_vitals(audits: Dict[str, Any]) -> Dict[str, Any]:
    """Extract Core Web Vitals metrics."""
    vitals = {}

    # Largest Contentful Paint (LCP)
    lcp = audits.get("largest-contentful-paint", {})
    if lcp:
        vitals["lcp"] = {
            "value": lcp.get("numericValue", 0),
            "display_value": lcp.get("displayValue", ""),
            "score": int((lcp.get("score") or 0) * 100),
            "description": "Largest Contentful Paint marks when the largest content element is visible",
            "rating": _get_metric_rating(lcp.get("score", 0))
        }

    # First Input Delay (FID) - Now replaced by Interaction to Next Paint (INP) in lab
    # Using Total Blocking Time as proxy
    tbt = audits.get("total-blocking-time", {})
    if tbt:
        vitals["tbt"] = {
            "value": tbt.get("numericValue", 0),
            "display_value": tbt.get("displayValue", ""),
            "score": int((tbt.get("score") or 0) * 100),
            "description": "Total Blocking Time measures total time when main thread was blocked",
            "rating": _get_metric_rating(tbt.get("score", 0))
        }

    # Cumulative Layout Shift (CLS)
    cls = audits.get("cumulative-layout-shift", {})
    if cls:
        vitals["cls"] = {
            "value": cls.get("numericValue", 0),
            "display_value": cls.get("displayValue", ""),
            "score": int((cls.get("score") or 0) * 100),
            "description": "Cumulative Layout Shift measures visual stability",
            "rating": _get_metric_rating(cls.get("score", 0))
        }

    # First Contentful Paint (FCP)
    fcp = audits.get("first-contentful-paint", {})
    if fcp:
        vitals["fcp"] = {
            "value": fcp.get("numericValue", 0),
            "display_value": fcp.get("displayValue", ""),
            "score": int((fcp.get("score") or 0) * 100),
            "description": "First Contentful Paint marks when first content is visible",
            "rating": _get_metric_rating(fcp.get("score", 0))
        }

    # Time to First Byte (TTFB)
    ttfb = audits.get("server-response-time", {})
    if ttfb:
        vitals["ttfb"] = {
            "value": ttfb.get("numericValue", 0),
            "display_value": ttfb.get("displayValue", ""),
            "score": int((ttfb.get("score") or 0) * 100),
            "description": "Time to First Byte measures server response time",
            "rating": _get_metric_rating(ttfb.get("score", 0))
        }

    # Speed Index
    si = audits.get("speed-index", {})
    if si:
        vitals["speed_index"] = {
            "value": si.get("numericValue", 0),
            "display_value": si.get("displayValue", ""),
            "score": int((si.get("score") or 0) * 100),
            "description": "Speed Index shows how quickly content is visually displayed",
            "rating": _get_metric_rating(si.get("score", 0))
        }

    return vitals


def _extract_metrics(audits: Dict[str, Any]) -> Dict[str, Any]:
    """Extract additional performance metrics."""
    metrics = {}

    metric_keys = [
        "interactive",
        "max-potential-fid",
        "time-to-first-byte",
        "first-meaningful-paint",
        "mainthread-work-breakdown",
        "bootup-time",
        "network-requests",
        "network-rtt",
        "network-server-latency",
        "total-byte-weight",
        "dom-size"
    ]

    for key in metric_keys:
        audit = audits.get(key, {})
        if audit and audit.get("numericValue") is not None:
            metrics[key.replace("-", "_")] = {
                "value": audit.get("numericValue", 0),
                "display_value": audit.get("displayValue", ""),
                "score": int((audit.get("score") or 0) * 100) if audit.get("score") is not None else None
            }

    return metrics


def _extract_opportunities(audits: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract improvement opportunities."""
    opportunities = []

    opportunity_keys = [
        "render-blocking-resources",
        "unused-css-rules",
        "unused-javascript",
        "modern-image-formats",
        "offscreen-images",
        "unminified-css",
        "unminified-javascript",
        "efficient-animated-content",
        "duplicated-javascript",
        "legacy-javascript",
        "preload-lcp-image",
        "total-byte-weight",
        "uses-responsive-images",
        "uses-optimized-images",
        "uses-text-compression",
        "uses-rel-preconnect",
        "server-response-time",
        "redirects",
        "uses-rel-preload",
        "font-display"
    ]

    for key in opportunity_keys:
        audit = audits.get(key, {})
        if audit and audit.get("score") is not None and audit.get("score") < 1:
            savings = audit.get("details", {}).get("overallSavingsMs", 0)
            opportunities.append({
                "id": key,
                "title": audit.get("title", key),
                "description": audit.get("description", ""),
                "score": int((audit.get("score") or 0) * 100),
                "savings_ms": savings,
                "display_value": audit.get("displayValue", ""),
                "priority": "high" if savings > 500 else "medium" if savings > 100 else "low"
            })

    # Sort by savings (highest first)
    opportunities.sort(key=lambda x: x.get("savings_ms", 0), reverse=True)

    return opportunities[:10]  # Top 10 opportunities


def _extract_diagnostics(audits: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract diagnostic information."""
    diagnostics = []

    diagnostic_keys = [
        "dom-size",
        "critical-request-chains",
        "long-tasks",
        "layout-shift-elements",
        "largest-contentful-paint-element",
        "third-party-summary",
        "bootup-time",
        "mainthread-work-breakdown",
        "font-size",
        "tap-targets"
    ]

    for key in diagnostic_keys:
        audit = audits.get(key, {})
        if audit and audit.get("score") is not None:
            diagnostics.append({
                "id": key,
                "title": audit.get("title", key),
                "description": audit.get("description", ""),
                "score": int((audit.get("score") or 0) * 100),
                "display_value": audit.get("displayValue", ""),
                "passed": audit.get("score", 0) >= 0.9
            })

    return diagnostics


def _get_metric_rating(score: float) -> str:
    """Get rating based on score."""
    if score >= 0.9:
        return "good"
    elif score >= 0.5:
        return "needs_improvement"
    else:
        return "poor"


async def get_core_web_vitals(url: str) -> Dict[str, Any]:
    """
    Get Core Web Vitals for a URL (both mobile and desktop).
    """
    # Run both analyses in parallel
    mobile_task = analyze_page_speed(url, "mobile", ["performance"])
    desktop_task = analyze_page_speed(url, "desktop", ["performance"])

    mobile_result, desktop_result = await asyncio.gather(mobile_task, desktop_task)

    return {
        "url": url,
        "analyzed_at": datetime.utcnow().isoformat(),
        "mobile": {
            "success": mobile_result.get("success", False),
            "score": mobile_result.get("overall_score", 0),
            "core_web_vitals": mobile_result.get("core_web_vitals", {})
        },
        "desktop": {
            "success": desktop_result.get("success", False),
            "score": desktop_result.get("overall_score", 0),
            "core_web_vitals": desktop_result.get("core_web_vitals", {})
        }
    }


async def check_mobile_friendliness(url: str) -> Dict[str, Any]:
    """
    Check mobile friendliness of a URL.
    Uses PageSpeed mobile analysis with specific checks.
    """
    result = await analyze_page_speed(url, "mobile", ["performance", "accessibility"])

    if not result.get("success"):
        return result

    audits_to_check = [
        "viewport",
        "font-size",
        "tap-targets",
        "content-width"
    ]

    issues = []
    passed_checks = []

    # Check mobile-specific audits from the original response
    # Since we're using the parsed response, we need to check diagnostics
    for diag in result.get("diagnostics", []):
        if diag["id"] in ["font-size", "tap-targets"]:
            if not diag.get("passed", False):
                issues.append({
                    "id": diag["id"],
                    "title": diag["title"],
                    "description": diag["description"]
                })
            else:
                passed_checks.append(diag["id"])

    # Overall mobile friendliness based on performance score
    mobile_score = result.get("overall_score", 0)
    is_mobile_friendly = mobile_score >= 50 and len(issues) < 3

    return {
        "success": True,
        "url": url,
        "is_mobile_friendly": is_mobile_friendly,
        "mobile_score": mobile_score,
        "issues": issues,
        "passed_checks": passed_checks,
        "recommendations": [
            "Ensure text is readable without zooming",
            "Size tap targets appropriately (48x48 pixels minimum)",
            "Configure viewport for mobile devices",
            "Avoid horizontal scrolling"
        ] if not is_mobile_friendly else []
    }


def get_score_interpretation(score: int) -> Dict[str, str]:
    """
    Get interpretation of a PageSpeed score.
    """
    if score >= 90:
        return {
            "rating": "good",
            "color": "green",
            "message": "Performance is excellent. Keep up the good work!"
        }
    elif score >= 50:
        return {
            "rating": "needs_improvement",
            "color": "orange",
            "message": "Performance could be improved. Review the opportunities below."
        }
    else:
        return {
            "rating": "poor",
            "color": "red",
            "message": "Performance needs significant improvement. Prioritize the suggestions below."
        }
