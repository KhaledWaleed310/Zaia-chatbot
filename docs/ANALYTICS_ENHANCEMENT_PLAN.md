# Analytics Enhancement Plan

## Overview
Add three analytics features to address current gaps:
1. **Conversion Funnel Tracking** - Visualize customer journey from visitor to conversion
2. **ROI/Revenue Attribution** - Track deal values and calculate return on investment
3. **Comparison Reports** - This week vs last week period-over-period analysis

---

## Feature 1: Conversion Funnel Tracking

### Backend Changes

**File: `backend/app/schemas/leads.py`**
- Add `stage_entered_at: Optional[datetime]` field to track when current status started
- Add `stage_history: List[dict]` field to track all status transitions with timestamps and duration

**File: `backend/app/schemas/analytics.py`**
Add new schemas:
```python
class FunnelStage(BaseModel):
    stage: str  # visitors, lead_captured, contacted, qualified, converted, lost
    count: int
    conversion_rate: float
    avg_time_in_stage_hours: float

class FunnelAnalytics(BaseModel):
    stages: List[FunnelStage]
    total_visitors: int
    total_leads: int
    total_converted: int
    overall_conversion_rate: float
```

**File: `backend/app/services/leads.py`**
- Modify `update_lead()` to track status transitions with timestamps and duration

**File: `backend/app/api/analytics.py`**
- Add `GET /{bot_id}/funnel` endpoint
- Add `GET /funnel/aggregate` endpoint for cross-bot funnel

### Frontend Changes

**File: `frontend/src/utils/api.js`**
- Add `getFunnel(botId, days)` method

**File: `frontend/src/pages/ChatbotAnalytics.jsx`**
- Add "Funnel" tab
- Add horizontal bar funnel visualization (following existing custom viz patterns)
- Show conversion rates between stages and avg time in each stage

---

## Feature 2: ROI/Revenue Attribution

### Backend Changes

**File: `backend/app/schemas/leads.py`**
Add to LeadCreate, LeadUpdate, LeadResponse:
- `deal_value: Optional[float]` - Potential deal value
- `actual_revenue: Optional[float]` - Actual revenue when converted
- `currency: str = "USD"`

**File: `backend/app/schemas/analytics.py`**
Add new schemas:
```python
class ROIMetrics(BaseModel):
    total_revenue: float
    subscription_cost: float  # Monthly cost based on Aiden plan
    roi_percentage: float
    avg_deal_value: float
    converted_count: int
    revenue_by_bot: List[dict]
    subscription_tier: str
```

**File: `backend/app/services/analytics.py`**
- Add `calculate_roi_metrics()` function
- Define subscription tier pricing map:
  ```python
  SUBSCRIPTION_COSTS = {
      "free": 0,
      "starter": 29,
      "professional": 79,
      "business": 199,
      "enterprise": 499
  }
  ```
- Get user's subscription_tier and map to monthly cost
- Aggregate revenue from converted leads with actual_revenue or deal_value
- Calculate ROI = ((revenue - cost) / cost) * 100

**File: `backend/app/api/analytics.py`**
- Add `GET /{bot_id}/roi` endpoint
- Add `GET /roi/aggregate` endpoint

### Frontend Changes

**File: `frontend/src/utils/api.js`**
- Add `getROI(botId, days)` method

**File: `frontend/src/pages/ChatbotAnalytics.jsx`**
- Add "ROI" tab
- Display: Total Revenue, Total Cost, ROI %, Avg Deal Value cards
- Revenue attribution bar chart by bot (for aggregate view)

**File: `frontend/src/pages/ChatbotLeads.jsx`**
- Add deal_value input field when creating/editing leads
- Add actual_revenue field (editable when status = converted)

---

## Feature 3: Comparison Reports (This Week vs Last)

### Backend Changes

**File: `backend/app/schemas/analytics.py`**
Add new schemas:
```python
class MetricComparison(BaseModel):
    current: float
    previous: float
    change: float
    change_percentage: float
    trend: str  # "up", "down", "stable"

class ComparisonReport(BaseModel):
    period: str  # "week" or "month"
    current_period_start: datetime
    current_period_end: datetime
    previous_period_start: datetime
    previous_period_end: datetime
    messages: MetricComparison
    sessions: MetricComparison
    leads: MetricComparison
    conversions: MetricComparison
    conversion_rate: MetricComparison
    sentiment_score: MetricComparison
    quality_score: MetricComparison
```

**File: `backend/app/services/analytics.py`**
- Add `get_comparison_report()` function
- Calculate metrics for current vs previous period (week or month)
- Compute changes and trend direction

**File: `backend/app/api/analytics.py`**
- Add `GET /{bot_id}/comparison?period=week` endpoint

### Frontend Changes

**File: `frontend/src/utils/api.js`**
- Add `getComparison(botId, period)` method

**File: `frontend/src/pages/ChatbotAnalytics.jsx`**
- Add "Compare" tab
- Period selector (This Week vs Last / This Month vs Last)
- Grid of comparison cards showing:
  - Current value, Previous value
  - Change with trend arrow (TrendingUp/TrendingDown icons)
  - Percentage change (green for up, red for down on negative metrics like cost)

---

## Files to Modify

### Backend (7 files)
1. `backend/app/schemas/leads.py` - Add deal_value, actual_revenue, stage_history fields
2. `backend/app/schemas/analytics.py` - Add FunnelAnalytics, ROIMetrics, ComparisonReport schemas
3. `backend/app/services/leads.py` - Track stage transitions
4. `backend/app/services/analytics.py` - Add get_conversion_funnel, calculate_roi_metrics, get_comparison_report
5. `backend/app/api/analytics.py` - Add /funnel, /roi, /comparison endpoints
6. `backend/app/api/leads.py` - Handle deal_value/actual_revenue in create/update

### Frontend (3 files)
1. `frontend/src/utils/api.js` - Add new API methods
2. `frontend/src/pages/ChatbotAnalytics.jsx` - Add Funnel, ROI, Compare tabs
3. `frontend/src/pages/ChatbotLeads.jsx` - Add deal value fields

---

## Implementation Order

1. **Phase 1: Schema Updates** - Update leads.py and analytics.py schemas
2. **Phase 2: Backend Services** - Implement analytics calculation functions
3. **Phase 3: API Endpoints** - Add new REST endpoints
4. **Phase 4: Frontend API** - Add api.js methods
5. **Phase 5: Frontend UI** - Build tabs and visualizations

---

## Data Migration

For existing leads without stage_history:
- Create migration script to initialize `stage_history` with single entry based on `created_at`
- Set `stage_entered_at` to `created_at` for existing leads

For deal_value/actual_revenue:
- Existing leads will have null values (handled gracefully in calculations)
- Users can manually update via leads management UI

---

## UI Design Notes

Following existing patterns in ChatbotAnalytics.jsx:
- Use Tailwind CSS for styling
- Use lucide-react icons (TrendingUp, TrendingDown, DollarSign, etc.)
- Custom visualizations (horizontal bars, grids) - no external chart libraries
- Mobile-responsive grid layouts (grid-cols-2 lg:grid-cols-4)
- White cards with shadow-sm, rounded-xl styling
