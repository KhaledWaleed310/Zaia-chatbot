"""
Marketing API endpoints for pixel configuration and campaign analytics.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional
import logging

from ..core.security import get_current_marketing_user
from ..core.database import get_mongodb
from ..schemas.marketing import (
    PixelConfig,
    PixelConfigUpdate,
    CampaignStats,
    CampaignAnalyticsSummary,
    AudienceInsight,
    DailyTrend,
    ConversionSummary,
    MarketingDashboardResponse,
    CampaignListResponse,
    TrackingEventBody,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/marketing", tags=["marketing"])




@router.get("/dashboard", response_model=MarketingDashboardResponse)
async def get_marketing_dashboard(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_marketing_user)
):
    """
    Get comprehensive marketing dashboard data.
    Returns summary metrics, campaigns, audience insights, and trends.
    Data comes from the database - shows empty state if no data exists.
    """
    try:
        db = get_mongodb()
        start_date = datetime.utcnow() - timedelta(days=days)

        # Get pixel configuration
        config_doc = await db.marketing_config.find_one({"_id": "global"})
        pixel_config = None
        if config_doc:
            pixel_config = PixelConfig(
                facebook_pixel_id=config_doc.get("facebook_pixel_id"),
                facebook_pixel_code=config_doc.get("facebook_pixel_code"),
                google_analytics_id=config_doc.get("google_analytics_id"),
                google_analytics_code=config_doc.get("google_analytics_code"),
                custom_head_code=config_doc.get("custom_head_code"),
                custom_body_code=config_doc.get("custom_body_code"),
                enabled=config_doc.get("enabled", True),
                updated_at=config_doc.get("updated_at"),
                updated_by=config_doc.get("updated_by"),
            )

        # Get real campaign data from database
        campaigns_cursor = db.campaign_analytics.find({
            "date": {"$gte": start_date}
        }).sort("date", -1)

        campaigns_data = await campaigns_cursor.to_list(length=100)

        # Aggregate campaigns by campaign_id
        campaign_map = {}
        for c in campaigns_data:
            cid = c.get("campaign_id", "unknown")
            if cid not in campaign_map:
                campaign_map[cid] = {
                    "campaign_id": cid,
                    "campaign_name": c.get("campaign_name", "Unknown Campaign"),
                    "source": c.get("source", "direct"),
                    "impressions": 0,
                    "clicks": 0,
                    "conversions": 0,
                    "cost": 0.0,
                    "revenue": 0.0,
                }
            campaign_map[cid]["impressions"] += c.get("impressions", 0)
            campaign_map[cid]["clicks"] += c.get("clicks", 0)
            campaign_map[cid]["conversions"] += c.get("conversions", 0)
            campaign_map[cid]["cost"] += c.get("cost", 0.0)
            campaign_map[cid]["revenue"] += c.get("revenue", 0.0)

        # Convert to CampaignStats objects
        campaigns = []
        for cid, data in campaign_map.items():
            impressions = data["impressions"]
            clicks = data["clicks"]
            conversions = data["conversions"]
            cost = data["cost"]
            revenue = data["revenue"]

            campaigns.append(CampaignStats(
                campaign_id=data["campaign_id"],
                campaign_name=data["campaign_name"],
                source=data["source"],
                impressions=impressions,
                clicks=clicks,
                conversions=conversions,
                cost=round(cost, 2),
                revenue=round(revenue, 2),
                ctr=round((clicks / impressions * 100) if impressions > 0 else 0, 2),
                cpa=round((cost / conversions) if conversions > 0 else 0, 2),
                roi=round(((revenue - cost) / cost * 100) if cost > 0 else 0, 2),
            ))

        # Get conversion events for summary
        conversion_count = await db.conversion_events.count_documents({
            "timestamp": {"$gte": start_date}
        })

        # Calculate summary from real data
        total_impressions = sum(c.impressions for c in campaigns)
        total_clicks = sum(c.clicks for c in campaigns)
        total_conversions = sum(c.conversions for c in campaigns) or conversion_count
        total_cost = sum(c.cost for c in campaigns)
        total_revenue = sum(c.revenue for c in campaigns)

        summary = CampaignAnalyticsSummary(
            total_impressions=total_impressions,
            total_clicks=total_clicks,
            total_conversions=total_conversions,
            total_cost=round(total_cost, 2),
            total_revenue=round(total_revenue, 2),
            avg_ctr=round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
            avg_cpa=round((total_cost / total_conversions) if total_conversions > 0 else 0, 2),
            overall_roi=round(((total_revenue - total_cost) / total_cost * 100) if total_cost > 0 else 0, 2),
        )

        # Get daily trend from conversion events
        daily_trend = []
        for i in range(days):
            date = datetime.utcnow() - timedelta(days=days - i - 1)
            date_str = date.strftime("%Y-%m-%d")

            # Count conversions for this day
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_conversions = await db.conversion_events.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end}
            })

            daily_trend.append(DailyTrend(
                date=date_str,
                impressions=0,
                clicks=0,
                conversions=day_conversions,
                cost=0,
                revenue=0,
            ))

        # Sort campaigns by ROI for top performers
        top_campaigns = sorted(campaigns, key=lambda x: x.roi, reverse=True)[:5]

        return MarketingDashboardResponse(
            summary=summary,
            campaigns=campaigns,
            audience_insights=[],  # Real data only - no mock
            daily_trend=daily_trend,
            top_performing_campaigns=top_campaigns,
            pixel_config=pixel_config,
        )

    except Exception as e:
        logger.error(f"Error fetching marketing dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch marketing data")


@router.get("/campaigns", response_model=CampaignListResponse)
async def list_campaigns(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    source: Optional[str] = None,
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_marketing_user)
):
    """List all campaigns with performance metrics from database."""
    try:
        db = get_mongodb()
        start_date = datetime.utcnow() - timedelta(days=days)

        # Build query
        query = {"date": {"$gte": start_date}}
        if source:
            query["source"] = source

        # Get campaign data
        campaigns_cursor = db.campaign_analytics.find(query).sort("date", -1)
        campaigns_data = await campaigns_cursor.to_list(length=500)

        # Aggregate by campaign_id
        campaign_map = {}
        for c in campaigns_data:
            cid = c.get("campaign_id", "unknown")
            if cid not in campaign_map:
                campaign_map[cid] = {
                    "campaign_id": cid,
                    "campaign_name": c.get("campaign_name", "Unknown"),
                    "source": c.get("source", "direct"),
                    "impressions": 0, "clicks": 0, "conversions": 0,
                    "cost": 0.0, "revenue": 0.0,
                }
            campaign_map[cid]["impressions"] += c.get("impressions", 0)
            campaign_map[cid]["clicks"] += c.get("clicks", 0)
            campaign_map[cid]["conversions"] += c.get("conversions", 0)
            campaign_map[cid]["cost"] += c.get("cost", 0.0)
            campaign_map[cid]["revenue"] += c.get("revenue", 0.0)

        # Convert to list
        all_campaigns = []
        for data in campaign_map.values():
            imp, clk, conv = data["impressions"], data["clicks"], data["conversions"]
            cost, rev = data["cost"], data["revenue"]
            all_campaigns.append(CampaignStats(
                campaign_id=data["campaign_id"],
                campaign_name=data["campaign_name"],
                source=data["source"],
                impressions=imp, clicks=clk, conversions=conv,
                cost=round(cost, 2), revenue=round(rev, 2),
                ctr=round((clk / imp * 100) if imp > 0 else 0, 2),
                cpa=round((cost / conv) if conv > 0 else 0, 2),
                roi=round(((rev - cost) / cost * 100) if cost > 0 else 0, 2),
            ))

        # Paginate
        total = len(all_campaigns)
        pages = max((total + per_page - 1) // per_page, 1)
        start = (page - 1) * per_page
        end = start + per_page
        items = all_campaigns[start:end]

        return CampaignListResponse(
            items=items,
            total=total,
            page=page,
            pages=pages,
            per_page=per_page,
        )

    except Exception as e:
        logger.error(f"Error listing campaigns: {e}")
        raise HTTPException(status_code=500, detail="Failed to list campaigns")


@router.get("/campaigns/{campaign_id}", response_model=CampaignStats)
async def get_campaign_details(
    campaign_id: str,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get detailed campaign analytics from database."""
    try:
        db = get_mongodb()

        # Get all data for this campaign
        campaigns_cursor = db.campaign_analytics.find({"campaign_id": campaign_id})
        campaigns_data = await campaigns_cursor.to_list(length=500)

        if not campaigns_data:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Aggregate data
        data = {
            "campaign_id": campaign_id,
            "campaign_name": campaigns_data[0].get("campaign_name", "Unknown"),
            "source": campaigns_data[0].get("source", "direct"),
            "impressions": 0, "clicks": 0, "conversions": 0,
            "cost": 0.0, "revenue": 0.0,
        }
        for c in campaigns_data:
            data["impressions"] += c.get("impressions", 0)
            data["clicks"] += c.get("clicks", 0)
            data["conversions"] += c.get("conversions", 0)
            data["cost"] += c.get("cost", 0.0)
            data["revenue"] += c.get("revenue", 0.0)

        imp, clk, conv = data["impressions"], data["clicks"], data["conversions"]
        cost, rev = data["cost"], data["revenue"]

        return CampaignStats(
            campaign_id=data["campaign_id"],
            campaign_name=data["campaign_name"],
            source=data["source"],
            impressions=imp, clicks=clk, conversions=conv,
            cost=round(cost, 2), revenue=round(rev, 2),
            ctr=round((clk / imp * 100) if imp > 0 else 0, 2),
            cpa=round((cost / conv) if conv > 0 else 0, 2),
            roi=round(((rev - cost) / cost * 100) if cost > 0 else 0, 2),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch campaign details")


@router.get("/pixel-config", response_model=PixelConfig)
async def get_pixel_config(
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get pixel configuration."""
    try:
        db = get_mongodb()
        config = await db.marketing_config.find_one({"_id": "global"})

        if not config:
            return PixelConfig()

        return PixelConfig(
            facebook_pixel_id=config.get("facebook_pixel_id"),
            facebook_pixel_code=config.get("facebook_pixel_code"),
            google_analytics_id=config.get("google_analytics_id"),
            google_analytics_code=config.get("google_analytics_code"),
            custom_head_code=config.get("custom_head_code"),
            custom_body_code=config.get("custom_body_code"),
            enabled=config.get("enabled", True),
            updated_at=config.get("updated_at"),
            updated_by=config.get("updated_by"),
        )

    except Exception as e:
        logger.error(f"Error fetching pixel config: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pixel configuration")


@router.put("/pixel-config", response_model=dict)
async def update_pixel_config(
    config: PixelConfigUpdate,
    current_user: dict = Depends(get_current_marketing_user)
):
    """Update pixel configuration."""
    try:
        db = get_mongodb()

        update_dict = config.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = current_user.get("_id")

        await db.marketing_config.update_one(
            {"_id": "global"},
            {"$set": update_dict},
            upsert=True
        )

        logger.info(f"Pixel config updated by user {current_user.get('email')}")

        return {"message": "Pixel configuration updated successfully"}

    except Exception as e:
        logger.error(f"Error updating pixel config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update pixel configuration")


@router.get("/conversions", response_model=ConversionSummary)
async def get_conversion_analytics(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get conversion analytics from database."""
    try:
        db = get_mongodb()
        start_date = datetime.utcnow() - timedelta(days=days)

        # Get all conversion events
        conversions_cursor = db.conversion_events.find({
            "timestamp": {"$gte": start_date}
        })
        conversions_data = await conversions_cursor.to_list(length=10000)

        total_conversions = len(conversions_data)

        # Aggregate by type
        by_type = {}
        for c in conversions_data:
            event_type = c.get("event_type", "unknown")
            by_type[event_type] = by_type.get(event_type, 0) + 1

        # Aggregate by source
        by_source = {}
        for c in conversions_data:
            source = c.get("source", "direct")
            by_source[source] = by_source.get(source, 0) + 1

        # Daily trend
        trend = []
        for i in range(days):
            date = datetime.utcnow() - timedelta(days=days - i - 1)
            date_str = date.strftime("%Y-%m-%d")
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_count = sum(1 for c in conversions_data
                           if day_start <= c.get("timestamp", datetime.min) < day_end)
            trend.append({"date": date_str, "conversions": day_count})

        return ConversionSummary(
            total_conversions=total_conversions,
            by_type=by_type,
            by_source=by_source,
            conversion_rate=0,  # Would need total visitors to calculate
            trend=trend,
        )

    except Exception as e:
        logger.error(f"Error fetching conversion analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversion analytics")


@router.get("/audience-insights")
async def get_audience_insights(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_marketing_user)
):
    """Get audience demographic insights from database."""
    try:
        db = get_mongodb()
        start_date = datetime.utcnow() - timedelta(days=days)

        # Get conversion events for audience analysis
        conversions_cursor = db.conversion_events.find({
            "timestamp": {"$gte": start_date}
        })
        conversions_data = await conversions_cursor.to_list(length=10000)

        # Aggregate by region from metadata
        region_counts = {}
        device_counts = {}
        age_counts = {}

        for c in conversions_data:
            metadata = c.get("metadata", {})

            # Region
            region = metadata.get("region", "Unknown")
            region_counts[region] = region_counts.get(region, 0) + 1

            # Device
            device = metadata.get("device", "Unknown")
            device_counts[device] = device_counts.get(device, 0) + 1

            # Age group
            age_group = metadata.get("age_group", "Unknown")
            age_counts[age_group] = age_counts.get(age_group, 0) + 1

        total = len(conversions_data) or 1  # Avoid division by zero

        # Format geographic insights
        geo_insights = [
            {"region": region, "percentage": round(count / total * 100, 1), "count": count}
            for region, count in sorted(region_counts.items(), key=lambda x: x[1], reverse=True)
            if region != "Unknown"
        ]

        # Format device insights
        device_insights = [
            {"device": device, "percentage": round(count / total * 100, 1), "count": count}
            for device, count in sorted(device_counts.items(), key=lambda x: x[1], reverse=True)
            if device != "Unknown"
        ]

        # Format age group insights
        age_insights = [
            {"segment": age, "percentage": round(count / total * 100, 1), "count": count}
            for age, count in sorted(age_counts.items(), key=lambda x: x[1], reverse=True)
            if age != "Unknown"
        ]

        return {
            "age_groups": age_insights,
            "geographic": geo_insights,
            "devices": device_insights,
            "total_events": len(conversions_data),
        }

    except Exception as e:
        logger.error(f"Error fetching audience insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch audience insights")


@router.post("/track-conversion")
async def track_conversion(
    event_type: str = Query(..., description="Type of event"),
    visitor_id: Optional[str] = Query(None, description="Visitor ID"),
    source: str = Query("direct", description="Traffic source"),
    campaign_id: Optional[str] = Query(None, description="Campaign ID"),
    bot_id: Optional[str] = Query(None, description="Bot ID"),
    body: Optional[TrackingEventBody] = None,
):
    """
    Track a conversion event (public endpoint for widget/website).
    This endpoint can be called from the frontend to track conversions.
    Accepts metadata in the request body.
    """
    try:
        db = get_mongodb()

        # Extract metadata from body if provided
        metadata = {}
        if body and body.metadata:
            metadata = body.metadata

        conversion_event = {
            "event_type": event_type,
            "source": source,
            "campaign_id": campaign_id,
            "visitor_id": visitor_id,
            "bot_id": bot_id,
            "metadata": metadata,
            "timestamp": datetime.utcnow(),
        }

        await db.conversion_events.insert_one(conversion_event)

        logger.info(f"Conversion tracked: {event_type} from {source}")

        return {"message": "Conversion tracked successfully"}

    except Exception as e:
        logger.error(f"Error tracking conversion: {e}")
        raise HTTPException(status_code=500, detail="Failed to track conversion")


@router.get("/embed-codes")
async def get_embed_codes():
    """
    Get the tracking embed codes for injection into pages (public endpoint).
    Returns HTML code snippets that should be added to the page.
    """
    try:
        db = get_mongodb()
        config = await db.marketing_config.find_one({"_id": "global"})

        if not config or not config.get("enabled", True):
            return {
                "head_code": "",
                "body_code": "",
                "enabled": False,
            }

        # Combine all head codes
        head_codes = []
        if config.get("facebook_pixel_code"):
            head_codes.append(config["facebook_pixel_code"])
        if config.get("google_analytics_code"):
            head_codes.append(config["google_analytics_code"])
        if config.get("custom_head_code"):
            head_codes.append(config["custom_head_code"])

        # Body codes
        body_codes = []
        if config.get("custom_body_code"):
            body_codes.append(config["custom_body_code"])

        return {
            "head_code": "\n".join(head_codes),
            "body_code": "\n".join(body_codes),
            "enabled": True,
            "facebook_pixel_id": config.get("facebook_pixel_id"),
            "google_analytics_id": config.get("google_analytics_id"),
        }

    except Exception as e:
        logger.error(f"Error fetching embed codes: {e}")
        return {"head_code": "", "body_code": "", "enabled": False}
