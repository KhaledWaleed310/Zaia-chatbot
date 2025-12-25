"""
Marketing schemas for pixel configuration and campaign analytics.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PixelSource(str, Enum):
    """Tracking pixel source types."""
    FACEBOOK = "facebook"
    GOOGLE = "google"
    DIRECT = "direct"
    ORGANIC = "organic"


class PixelConfig(BaseModel):
    """Pixel configuration for tracking."""
    facebook_pixel_id: Optional[str] = None
    facebook_pixel_code: Optional[str] = None  # Full embed code snippet
    google_analytics_id: Optional[str] = None
    google_analytics_code: Optional[str] = None  # Full embed code snippet
    custom_head_code: Optional[str] = None  # Any additional tracking code for <head>
    custom_body_code: Optional[str] = None  # Any additional tracking code for <body>
    enabled: bool = True
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class PixelConfigUpdate(BaseModel):
    """Partial update for pixel configuration."""
    facebook_pixel_id: Optional[str] = None
    facebook_pixel_code: Optional[str] = None
    google_analytics_id: Optional[str] = None
    google_analytics_code: Optional[str] = None
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    enabled: Optional[bool] = None


class CampaignStats(BaseModel):
    """Campaign performance statistics."""
    campaign_id: str
    campaign_name: str
    source: str
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    cost: float = 0.0
    revenue: float = 0.0
    ctr: float = Field(default=0.0, description="Click-through rate")
    cpa: float = Field(default=0.0, description="Cost per acquisition")
    roi: float = Field(default=0.0, description="Return on investment")


class CampaignAnalyticsSummary(BaseModel):
    """Aggregated campaign analytics summary."""
    total_impressions: int = 0
    total_clicks: int = 0
    total_conversions: int = 0
    total_cost: float = 0.0
    total_revenue: float = 0.0
    avg_ctr: float = 0.0
    avg_cpa: float = 0.0
    overall_roi: float = 0.0


class AudienceInsight(BaseModel):
    """Audience demographic insight."""
    segment: str
    count: int = 0
    percentage: float = 0.0
    conversion_rate: float = 0.0


class DailyTrend(BaseModel):
    """Daily trend data point."""
    date: str
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    cost: float = 0.0
    revenue: float = 0.0


class ConversionEvent(BaseModel):
    """A single conversion event."""
    event_type: str
    source: str
    campaign_id: Optional[str] = None
    visitor_id: Optional[str] = None
    bot_id: Optional[str] = None
    metadata: Optional[dict] = None
    timestamp: Optional[datetime] = None


class TrackingEventBody(BaseModel):
    """Request body for tracking events."""
    metadata: Optional[dict] = None


class ConversionSummary(BaseModel):
    """Conversion analytics summary."""
    total_conversions: int = 0
    by_type: dict = Field(default_factory=dict)
    by_source: dict = Field(default_factory=dict)
    conversion_rate: float = 0.0
    trend: List[dict] = Field(default_factory=list)


class MarketingDashboardResponse(BaseModel):
    """Complete marketing dashboard response."""
    summary: CampaignAnalyticsSummary
    campaigns: List[CampaignStats] = Field(default_factory=list)
    audience_insights: List[AudienceInsight] = Field(default_factory=list)
    daily_trend: List[DailyTrend] = Field(default_factory=list)
    top_performing_campaigns: List[CampaignStats] = Field(default_factory=list)
    pixel_config: Optional[PixelConfig] = None


class CampaignListResponse(BaseModel):
    """Paginated campaign list response."""
    items: List[CampaignStats] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    pages: int = 1
    per_page: int = 20
