"""
Booking schemas for universal reservation requests.

Supports multiple booking types:
- Room bookings (co-working spaces)
- Meeting/appointment bookings
- Table reservations (restaurants)
- Service appointments (salons, clinics)
- Event bookings
- Any other booking type
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class BookingType(str, Enum):
    """Types of bookings supported."""
    ROOM = "room"
    MEETING = "meeting"
    TABLE = "table"
    APPOINTMENT = "appointment"
    SERVICE = "service"
    EVENT = "event"
    OTHER = "other"


class BookingCreate(BaseModel):
    """Schema for creating a new booking from chatbot."""
    booking_type: BookingType = BookingType.OTHER
    guest_name: str
    phone: str
    date: str  # e.g., "tomorrow", "2024-12-16"
    time: str  # e.g., "9 PM", "14:00"
    people_count: Optional[int] = None  # Optional - not needed for all booking types
    purpose: Optional[str] = None  # meeting, workshop, study group, dinner, etc.
    extras: Optional[List[str]] = None  # whiteboard, screen, projector, vegetarian menu, etc.
    duration: Optional[str] = None  # "1 hour", "30 minutes", "full day"
    notes: Optional[str] = None


class BookingInDB(BookingCreate):
    """Schema for booking stored in database."""
    id: str
    bot_id: str
    tenant_id: str
    session_id: str
    status: str = "pending"  # pending, confirmed, cancelled
    created_at: datetime
    notified_at: Optional[datetime] = None


class BookingResponse(BaseModel):
    """Schema for booking API response."""
    id: str
    booking_type: BookingType = BookingType.OTHER
    guest_name: str
    phone: str
    date: str
    time: str
    people_count: Optional[int] = None
    purpose: Optional[str] = None
    extras: Optional[List[str]] = None
    duration: Optional[str] = None
    status: str
    created_at: datetime


DEFAULT_BOOKING_PROMPT = """When a customer wants to make a booking or reservation:

1. Ask for their full name
2. Ask for their phone/WhatsApp number
3. Ask for the preferred date and time
4. Ask how many people will be attending (if applicable)
5. Ask about any special requests or requirements

Once you have collected all the information, confirm the details with the customer and say:
"I'll send this booking request to the team. They will contact you shortly to confirm."

Important:
- Be friendly and helpful throughout the booking process
- If the customer provides multiple details at once, acknowledge all of them
- Always confirm the booking details before submitting"""


class BookingConfig(BaseModel):
    """Per-bot booking configuration."""
    enabled: bool = False
    notification_email: Optional[str] = None  # Override owner email
    trigger_keywords: Optional[List[str]] = None  # Custom trigger keywords
    default_booking_type: BookingType = BookingType.OTHER
    required_fields: List[str] = ["guest_name", "phone", "date", "time"]
    booking_prompt: Optional[str] = None  # Custom booking instructions for the bot


class BookingStatusUpdate(BaseModel):
    """Schema for updating booking status."""
    status: str  # pending, confirmed, cancelled


class BookingCalendarDay(BaseModel):
    """Bookings for a single day in the calendar."""
    date: str  # YYYY-MM-DD format
    bookings: List[BookingResponse]
    total: int


class CalendarResponse(BaseModel):
    """Calendar month data structure."""
    year: int
    month: int
    days: dict  # { "2024-12-15": BookingCalendarDay, ... }
    stats: dict  # { "pending": 3, "confirmed": 12, "cancelled": 2, "total": 17 }


class AvailabilityResponse(BaseModel):
    """Availability check result."""
    available: bool
    date: str
    time: str
    conflicts: Optional[List[BookingResponse]] = None
    message: Optional[str] = None
