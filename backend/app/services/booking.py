"""
Booking Service for universal reservation requests.

Handles creating bookings, extracting booking details from conversations,
and triggering notifications to bot owners.

Supports multiple booking types:
- Room bookings (co-working spaces)
- Meeting/appointment bookings
- Table reservations (restaurants)
- Service appointments (salons, clinics)
- Event bookings
"""
import logging
import uuid
import json
import re
from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple
from calendar import monthrange
from zoneinfo import ZoneInfo

from ..core.database import get_mongodb


def get_current_date_in_timezone(timezone_str: str = None) -> date:
    """
    Get the current date in the specified timezone.

    Args:
        timezone_str: Timezone string (e.g., "Africa/Cairo", "America/New_York")
                     If None, uses UTC.

    Returns:
        Current date in the specified timezone
    """
    if timezone_str:
        try:
            tz = ZoneInfo(timezone_str)
            result = datetime.now(tz).date()
            logging.info(f"Current date in {timezone_str}: {result}")
            return result
        except Exception as e:
            logging.warning(f"Invalid timezone '{timezone_str}', using UTC: {e}")

    result = datetime.utcnow().date()
    logging.info(f"Current date in UTC: {result}")
    return result

logger = logging.getLogger(__name__)


# Default trigger keywords that indicate a booking has been collected
DEFAULT_BOOKING_KEYWORDS = [
    # English triggers
    "i'll send this request",
    "i will send this request",
    "notify the team",
    "notifying the team",
    "booking request",
    "reservation confirmed",
    "i'll forward this",
    "i will forward this",
    "team will contact you",
    "someone will reach out",
    "we'll get back to you",
    "we will get back to you",
    "booking has been submitted",
    "request has been sent",
    "i've noted your booking",
    "i have noted your booking",
    # Arabic triggers
    "سأرسل هذا الطلب",
    "سوف أرسل هذا الطلب",
    "سأبلغ الفريق",
    "تم تأكيد الحجز",
    "طلب الحجز",
    "سيتواصل معك",
    "سنتواصل معك",
    "تم إرسال الطلب",
    "تم تسجيل حجزك",
    "سأقوم بإرسال",
    "تم استلام طلب الحجز",
]


# Tool definition for LLM function calling (updated for universal booking)
BOOKING_TOOL = {
    "type": "function",
    "function": {
        "name": "submit_booking_request",
        "description": "Submit a booking request when you have collected all required details from the customer. Call this function to notify the team about the booking. Required: guest name, phone/WhatsApp number, date, and time.",
        "parameters": {
            "type": "object",
            "properties": {
                "booking_type": {
                    "type": "string",
                    "enum": ["room", "meeting", "table", "appointment", "service", "event", "other"],
                    "description": "Type of booking: room (co-working), meeting, table (restaurant), appointment, service, event, or other"
                },
                "guest_name": {
                    "type": "string",
                    "description": "Full name of the guest making the booking"
                },
                "phone": {
                    "type": "string",
                    "description": "Phone or WhatsApp number of the guest"
                },
                "date": {
                    "type": "string",
                    "description": "Date for the booking (e.g., 'tomorrow', '2024-12-16', 'next Monday')"
                },
                "time": {
                    "type": "string",
                    "description": "Time for the booking (e.g., '9 PM', '14:00', 'morning')"
                },
                "people_count": {
                    "type": "integer",
                    "description": "Number of people attending (optional for some booking types)"
                },
                "purpose": {
                    "type": "string",
                    "description": "Purpose of the booking (e.g., 'meeting', 'workshop', 'dinner', 'consultation')"
                },
                "duration": {
                    "type": "string",
                    "description": "Duration of the booking (e.g., '1 hour', '30 minutes', 'full day')"
                },
                "extras": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Extra equipment or services requested (e.g., ['whiteboard', 'screen', 'vegetarian menu'])"
                },
                "notes": {
                    "type": "string",
                    "description": "Any additional notes or special requests"
                }
            },
            "required": ["guest_name", "phone", "date", "time"]
        }
    }
}


def check_booking_trigger(response_text: str, custom_keywords: List[str] = None) -> bool:
    """
    Check if LLM response indicates a booking was made.

    Args:
        response_text: The assistant's response text
        custom_keywords: Optional custom keywords to check (overrides defaults)

    Returns:
        True if booking trigger keywords found, False otherwise
    """
    keywords = custom_keywords if custom_keywords else DEFAULT_BOOKING_KEYWORDS
    response_lower = response_text.lower()

    for keyword in keywords:
        if keyword.lower() in response_lower:
            logger.debug(f"Booking trigger detected: '{keyword}'")
            return True

    return False


async def extract_booking_details(
    conversation_history: list,
    tenant_id: str = None,
    bot_id: str = None,
    customer_timezone: str = None
) -> Optional[dict]:
    """
    Extract structured booking details from conversation using LLM.

    Uses a fast LLM call to extract booking information from the conversation.

    Args:
        conversation_history: List of conversation messages
        tenant_id: Optional tenant ID for context
        bot_id: Optional bot ID for context
        customer_timezone: Customer's timezone (e.g., "Africa/Cairo")

    Returns:
        Dictionary with extracted booking details or None if extraction fails
    """
    # Build conversation text from last 15 messages
    conversation_text = "\n".join([
        f"{m.get('role', 'user')}: {m.get('content', '')}"
        for m in conversation_history[-15:]
    ])

    logger.debug(f"[EXTRACTION] Starting extraction from {len(conversation_history)} messages")
    logger.debug(f"[EXTRACTION] Conversation text:\n{conversation_text[:1000]}...")

    extraction_prompt = f"""Extract booking info from this Arabic/English chat. Return JSON only.

Chat:
{conversation_text}

Return this exact JSON format:
{{"guest_name": "customer name from chat", "phone": "phone number from chat", "date": "date mentioned", "time": "time mentioned", "people_count": null, "booking_type": "meeting"}}

IMPORTANT:
- Look for the customer's name in Arabic (like محمد, أحمد) or English
- Look for phone numbers (like 01028308630, 01027764824)
- For date: keep original words (today, tomorrow, اليوم, غدا, بكرة)
- For time: keep original format (9 PM, 7 مساء)
- Return ONLY valid JSON, nothing else"""

    try:
        # Use simple LLM call for extraction
        from .llm import generate_response_simple
        response = await generate_response_simple(
            prompt=extraction_prompt,
            max_tokens=500,
            temperature=0.1
        )

        logger.debug(f"[EXTRACTION] LLM response: {response}")

        # Try to extract JSON from response - use non-greedy match to get first JSON object
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response)
        if not json_match:
            # Fallback to greedy match
            json_match = re.search(r'\{[\s\S]*?\}(?=\s*$|\s*[^,\s])', response)
        if not json_match:
            # Last resort - find first { and matching }
            json_match = re.search(r'\{[\s\S]*\}', response)

        if json_match:
            json_str = json_match.group()
            logger.debug(f"[EXTRACTION] Extracted JSON: {json_str}")
            extracted = json.loads(json_str)

            # Validate required fields
            if extracted.get("guest_name") and extracted.get("phone"):
                # Normalize date to YYYY-MM-DD format using customer timezone
                raw_date = extracted.get("date", "")
                if raw_date:
                    # Get reference date in customer's timezone
                    reference_date = get_current_date_in_timezone(customer_timezone)
                    parsed_date = parse_date_string(raw_date, reference_date)
                    if parsed_date:
                        extracted["date"] = parsed_date.isoformat()
                        extracted["date_raw"] = raw_date  # Keep original for display
                        extracted["customer_timezone"] = customer_timezone  # Store timezone
                        logger.info(f"Booking date normalized: '{raw_date}' -> '{extracted['date']}' (timezone: {customer_timezone})")

                logger.info(f"Booking extracted: {extracted.get('guest_name')} - {extracted.get('booking_type', 'other')}")
                return extracted
            else:
                logger.debug(f"Extraction incomplete - missing name or phone")
                return None

        logger.warning(f"Could not parse JSON from extraction response")
        return None

    except json.JSONDecodeError as e:
        logger.error(f"[EXTRACTION] JSON decode error: {e} - Response was: {response if 'response' in locals() else 'N/A'}")
        return None
    except Exception as e:
        logger.error(f"[EXTRACTION] Exception: {e}")
        import traceback
        logger.error(f"[EXTRACTION] Traceback: {traceback.format_exc()}")
        return None


async def get_bot_owner_email(bot_id: str) -> Optional[str]:
    """
    Get the email of the user who owns this bot.

    Args:
        bot_id: The chatbot ID

    Returns:
        Owner's email address or None if not found
    """
    db = get_mongodb()

    # Get the bot to find tenant_id
    bot = await db.chatbots.find_one({"_id": bot_id})
    if not bot:
        logger.warning(f"Bot not found: {bot_id}")
        return None

    tenant_id = bot.get("tenant_id")
    if not tenant_id:
        logger.warning(f"Bot {bot_id} has no tenant_id")
        return None

    # Find the user with this tenant_id
    user = await db.users.find_one({"tenant_id": tenant_id})
    if not user:
        logger.warning(f"No user found for tenant_id: {tenant_id}")
        return None

    return user.get("email")


async def get_booking_notification_email(bot_id: str, booking_config: dict = None) -> Optional[str]:
    """
    Get the email to send booking notifications to.

    Checks for override in booking_config first, falls back to owner email.

    Args:
        bot_id: The chatbot ID
        booking_config: Optional booking configuration with notification_email override

    Returns:
        Email address to notify or None if not found
    """
    # Check for override in booking config
    if booking_config and booking_config.get("notification_email"):
        return booking_config.get("notification_email")

    # Fall back to owner email
    return await get_bot_owner_email(bot_id)


async def create_booking(
    bot_id: str,
    tenant_id: str,
    session_id: str,
    booking_data: dict
) -> dict:
    """
    Create a booking record and trigger notification.

    Args:
        bot_id: The chatbot ID
        tenant_id: The tenant ID
        session_id: The chat session ID
        booking_data: Booking details from extraction or tool call

    Returns:
        Created booking record
    """
    db = get_mongodb()

    booking_id = str(uuid.uuid4())

    booking = {
        "_id": booking_id,
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "session_id": session_id,
        "booking_type": booking_data.get("booking_type", "other"),
        "guest_name": booking_data.get("guest_name"),
        "phone": booking_data.get("phone"),
        "date": booking_data.get("date"),
        "time": booking_data.get("time"),
        "people_count": booking_data.get("people_count"),
        "purpose": booking_data.get("purpose"),
        "duration": booking_data.get("duration"),
        "extras": booking_data.get("extras", []),
        "notes": booking_data.get("notes"),
        "status": "pending",
        "created_at": datetime.utcnow(),
        "notified_at": None
    }

    await db.bookings.insert_one(booking)
    logger.info(f"Created booking {booking_id} for {booking_data.get('guest_name')} ({booking_data.get('booking_type', 'other')})")

    # Queue notification task
    try:
        from ..tasks import send_booking_notification_task

        # Get booking config for email override
        bot = await db.chatbots.find_one({"_id": bot_id})
        booking_config = bot.get("booking_config", {}) if bot else {}

        notification_email = await get_booking_notification_email(bot_id, booking_config)
        if notification_email:
            send_booking_notification_task.delay(booking_id, notification_email)
            logger.info(f"Queued booking notification for {notification_email}")
        else:
            logger.warning(f"Could not find notification email for bot {bot_id}")
    except ImportError:
        logger.warning("send_booking_notification_task not available, skipping email notification")
    except Exception as e:
        logger.error(f"Failed to queue booking notification: {e}")

    return booking


async def get_booking(booking_id: str) -> Optional[dict]:
    """Get a booking by ID."""
    db = get_mongodb()
    return await db.bookings.find_one({"_id": booking_id})


async def get_bookings_by_bot(
    bot_id: str,
    tenant_id: str,
    status: str = None,
    limit: int = 50,
    offset: int = 0
) -> List[dict]:
    """Get bookings for a bot."""
    db = get_mongodb()

    query = {"bot_id": bot_id, "tenant_id": tenant_id}
    if status:
        query["status"] = status

    cursor = db.bookings.find(query).sort("created_at", -1).skip(offset).limit(limit)
    return await cursor.to_list(length=limit)


async def update_booking_status(booking_id: str, status: str) -> bool:
    """Update booking status."""
    db = get_mongodb()
    result = await db.bookings.update_one(
        {"_id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    return result.modified_count > 0


async def mark_booking_notified(booking_id: str) -> bool:
    """Mark booking as notified."""
    db = get_mongodb()
    result = await db.bookings.update_one(
        {"_id": booking_id},
        {"$set": {"notified_at": datetime.utcnow()}}
    )
    return result.modified_count > 0


def parse_time_string(time_str: str) -> Tuple[int, int]:
    """
    Parse various time string formats into (hour, minute) tuple.

    Handles formats like:
    - "9 PM", "9PM", "9:00 PM"
    - "21:00", "21:30"
    - "9:30pm", "9:30 pm"
    - "morning", "afternoon", "evening"

    Returns:
        Tuple of (hour in 24h format, minute)
    """
    if not time_str:
        return (12, 0)  # Default to noon

    time_str = time_str.strip().lower()

    # Handle descriptive times
    if "morning" in time_str:
        return (9, 0)
    if "afternoon" in time_str:
        return (14, 0)
    if "evening" in time_str:
        return (18, 0)
    if "noon" in time_str or "midday" in time_str:
        return (12, 0)
    if "midnight" in time_str:
        return (0, 0)

    # Check for AM/PM
    is_pm = "pm" in time_str or "p.m" in time_str
    is_am = "am" in time_str or "a.m" in time_str

    # Remove am/pm indicators
    time_str = re.sub(r'\s*(am|pm|a\.m\.?|p\.m\.?)\s*', '', time_str, flags=re.IGNORECASE).strip()

    # Try to parse HH:MM format
    match = re.match(r'^(\d{1,2}):(\d{2})$', time_str)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))
    else:
        # Try single number (just hour)
        match = re.match(r'^(\d{1,2})$', time_str)
        if match:
            hour = int(match.group(1))
            minute = 0
        else:
            return (12, 0)  # Default if parsing fails

    # Apply AM/PM conversion
    if is_pm and hour < 12:
        hour += 12
    elif is_am and hour == 12:
        hour = 0

    return (hour, minute)


def parse_date_string(date_str: str, reference_date: date = None) -> Optional[date]:
    """
    Parse various date string formats into a date object.

    Handles formats like:
    - "2024-12-15", "15/12/2024", "12/15/2024"
    - "tomorrow", "today", "day after tomorrow"
    - "next Monday", "this Friday"
    - "December 15", "Dec 15"

    Args:
        date_str: The date string to parse
        reference_date: Reference date for relative dates (defaults to today)

    Returns:
        date object or None if parsing fails
    """
    if not date_str:
        return None

    if reference_date is None:
        reference_date = date.today()

    date_str_original = date_str.strip()
    date_str = date_str_original.lower()

    # Handle relative dates (English)
    if date_str == "today":
        return reference_date
    if date_str == "tomorrow":
        return reference_date + timedelta(days=1)
    if "day after tomorrow" in date_str:
        return reference_date + timedelta(days=2)

    # Handle relative dates (Arabic)
    if "اليوم" in date_str_original:  # today
        return reference_date
    if "غدا" in date_str_original or "غداً" in date_str_original or "بكرة" in date_str_original or "بكره" in date_str_original:  # tomorrow
        return reference_date + timedelta(days=1)
    if "بعد غد" in date_str_original or "بعد بكرة" in date_str_original:  # day after tomorrow
        return reference_date + timedelta(days=2)

    # Handle "next [weekday]" or "this [weekday]"
    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, day_name in enumerate(weekdays):
        if day_name in date_str:
            current_weekday = reference_date.weekday()
            target_weekday = i
            days_ahead = target_weekday - current_weekday
            if days_ahead <= 0:  # Target day already happened this week
                days_ahead += 7
            if "next" in date_str and days_ahead < 7:
                days_ahead += 7  # Jump to next week
            return reference_date + timedelta(days=days_ahead)

    # Try ISO format: 2024-12-15
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        pass

    # Try DD/MM/YYYY format
    try:
        return datetime.strptime(date_str, "%d/%m/%Y").date()
    except ValueError:
        pass

    # Try MM/DD/YYYY format
    try:
        return datetime.strptime(date_str, "%m/%d/%Y").date()
    except ValueError:
        pass

    # Try "Month Day" formats
    months = {
        "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
        "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
        "aug": 8, "august": 8, "sep": 9, "september": 9, "oct": 10, "october": 10,
        "nov": 11, "november": 11, "dec": 12, "december": 12
    }

    for month_name, month_num in months.items():
        if month_name in date_str:
            # Extract day number
            day_match = re.search(r'(\d{1,2})', date_str)
            if day_match:
                day = int(day_match.group(1))
                year = reference_date.year
                # If the date is in the past this year, use next year
                try:
                    result = date(year, month_num, day)
                    if result < reference_date:
                        result = date(year + 1, month_num, day)
                    return result
                except ValueError:
                    pass

    return None


async def get_bookings_for_calendar(
    bot_id: str,
    tenant_id: str,
    year: int,
    month: int
) -> dict:
    """
    Get bookings grouped by date for calendar display.

    Args:
        bot_id: The chatbot ID
        tenant_id: The tenant ID
        year: Year (e.g., 2024)
        month: Month (1-12)

    Returns:
        Dictionary with:
        - days: { "2024-12-15": { "date": "...", "bookings": [...], "total": N }, ... }
        - stats: { "pending": N, "confirmed": N, "cancelled": N, "total": N }
    """
    db = get_mongodb()

    # Get first and last day of month
    _, last_day = monthrange(year, month)
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{last_day:02d}"

    # Query bookings for this month
    # We need to handle both normalized dates (YYYY-MM-DD) and freeform dates
    cursor = db.bookings.find({
        "bot_id": bot_id,
        "tenant_id": tenant_id
    }).sort("created_at", -1)

    bookings = await cursor.to_list(length=500)

    # Group by normalized date
    days = {}
    stats = {"pending": 0, "confirmed": 0, "cancelled": 0, "total": 0}

    for booking in bookings:
        # Try to normalize the date
        raw_date = booking.get("date", "")
        normalized_date = None

        # Check if already in YYYY-MM-DD format
        if re.match(r'^\d{4}-\d{2}-\d{2}$', raw_date):
            normalized_date = raw_date
        else:
            # Try to parse the date
            parsed = parse_date_string(raw_date, date(year, month, 1))
            if parsed:
                normalized_date = parsed.isoformat()

        # Only include bookings for this month
        if normalized_date and normalized_date.startswith(f"{year}-{month:02d}"):
            if normalized_date not in days:
                days[normalized_date] = {
                    "date": normalized_date,
                    "bookings": [],
                    "total": 0
                }

            # Format booking for response
            booking_data = {
                "id": booking["_id"],
                "booking_type": booking.get("booking_type", "other"),
                "guest_name": booking.get("guest_name", ""),
                "phone": booking.get("phone", ""),
                "date": booking.get("date", ""),
                "time": booking.get("time", ""),
                "people_count": booking.get("people_count"),
                "purpose": booking.get("purpose"),
                "extras": booking.get("extras", []),
                "duration": booking.get("duration"),
                "status": booking.get("status", "pending"),
                "created_at": booking.get("created_at")
            }

            days[normalized_date]["bookings"].append(booking_data)
            days[normalized_date]["total"] += 1

            # Update stats
            status = booking.get("status", "pending")
            if status in stats:
                stats[status] += 1
            stats["total"] += 1

    return {
        "year": year,
        "month": month,
        "days": days,
        "stats": stats
    }


def times_overlap(
    time1: str,
    duration1: str,
    time2: str,
    duration2: str,
    buffer_minutes: int = 30
) -> bool:
    """
    Check if two time slots overlap (with optional buffer).

    Args:
        time1, time2: Time strings to compare
        duration1, duration2: Duration strings (e.g., "1 hour", "30 minutes")
        buffer_minutes: Buffer between bookings in minutes

    Returns:
        True if times overlap, False otherwise
    """
    def parse_duration_minutes(duration_str: str) -> int:
        """Parse duration string to minutes."""
        if not duration_str:
            return 60  # Default 1 hour

        duration_str = duration_str.lower()

        # Check for hours
        hour_match = re.search(r'(\d+)\s*(hour|hr)', duration_str)
        if hour_match:
            hours = int(hour_match.group(1))
            # Check for additional minutes
            min_match = re.search(r'(\d+)\s*(minute|min)', duration_str)
            minutes = int(min_match.group(1)) if min_match else 0
            return hours * 60 + minutes

        # Check for minutes only
        min_match = re.search(r'(\d+)\s*(minute|min)', duration_str)
        if min_match:
            return int(min_match.group(1))

        # Check for "full day" or "all day"
        if "full day" in duration_str or "all day" in duration_str:
            return 480  # 8 hours

        return 60  # Default 1 hour

    # Parse times to minutes from midnight
    h1, m1 = parse_time_string(time1)
    h2, m2 = parse_time_string(time2)

    start1 = h1 * 60 + m1
    start2 = h2 * 60 + m2

    end1 = start1 + parse_duration_minutes(duration1) + buffer_minutes
    end2 = start2 + parse_duration_minutes(duration2) + buffer_minutes

    # Check overlap
    return start1 < end2 and start2 < end1


async def check_availability(
    bot_id: str,
    tenant_id: str,
    date_str: str,
    time_str: str,
    duration_str: str = None,
    exclude_booking_id: str = None,
    customer_timezone: str = None
) -> dict:
    """
    Check if a time slot is available for booking.

    Args:
        bot_id: The chatbot ID
        tenant_id: The tenant ID
        date_str: Date to check
        time_str: Time to check
        duration_str: Duration of new booking
        exclude_booking_id: Booking ID to exclude (for rescheduling)
        customer_timezone: Customer's timezone for relative date parsing

    Returns:
        Dictionary with:
        - available: bool
        - conflicts: list of conflicting bookings
        - message: explanation message
    """
    db = get_mongodb()

    # Parse the date using customer timezone
    reference_date = get_current_date_in_timezone(customer_timezone)
    parsed_date = parse_date_string(date_str, reference_date)
    if not parsed_date:
        return {
            "available": True,
            "date": date_str,
            "time": time_str,
            "conflicts": [],
            "message": "Could not parse date, assuming available"
        }

    normalized_date = parsed_date.isoformat()

    # Query bookings for this date
    cursor = db.bookings.find({
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "status": {"$in": ["pending", "confirmed"]}  # Only check active bookings
    })

    bookings = await cursor.to_list(length=500)

    conflicts = []

    for booking in bookings:
        # Skip excluded booking (for rescheduling)
        if exclude_booking_id and booking["_id"] == exclude_booking_id:
            continue

        # Normalize the booking's date
        booking_date_str = booking.get("date", "")
        booking_parsed = None

        if re.match(r'^\d{4}-\d{2}-\d{2}$', booking_date_str):
            booking_parsed = booking_date_str
        else:
            parsed = parse_date_string(booking_date_str, parsed_date)
            if parsed:
                booking_parsed = parsed.isoformat()

        # Check if same date
        if booking_parsed == normalized_date:
            # Check if times overlap
            booking_time = booking.get("time", "")
            booking_duration = booking.get("duration")

            if times_overlap(time_str, duration_str, booking_time, booking_duration):
                conflicts.append({
                    "id": booking["_id"],
                    "booking_type": booking.get("booking_type", "other"),
                    "guest_name": booking.get("guest_name", ""),
                    "phone": booking.get("phone", ""),
                    "date": booking.get("date", ""),
                    "time": booking.get("time", ""),
                    "people_count": booking.get("people_count"),
                    "purpose": booking.get("purpose"),
                    "duration": booking.get("duration"),
                    "status": booking.get("status", "pending"),
                    "created_at": booking.get("created_at")
                })

    available = len(conflicts) == 0

    if available:
        message = f"Time slot at {time_str} on {date_str} is available"
    else:
        conflict_times = [c.get("time", "") for c in conflicts]
        message = f"Time slot conflicts with {len(conflicts)} existing booking(s) at: {', '.join(conflict_times)}"

    return {
        "available": available,
        "date": date_str,
        "time": time_str,
        "conflicts": conflicts,
        "message": message
    }
