"""
Booking API Router - Calendar view and booking management.

Endpoints for:
- Listing bookings with filters
- Calendar view (bookings grouped by date)
- Availability checking
- Updating booking status
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

from ..core.security import get_current_user
from ..core.database import get_mongodb
from ..services.booking import (
    get_bookings_by_bot,
    get_bookings_for_calendar,
    check_availability,
    update_booking_status,
    get_booking
)

router = APIRouter(prefix="/bookings", tags=["bookings"])


def booking_to_response(booking: dict) -> dict:
    """Convert booking document to API response format."""
    return {
        "id": booking["_id"],
        "booking_type": booking.get("booking_type", "other"),
        "guest_name": booking.get("guest_name", ""),
        "phone": booking.get("phone", ""),
        "email": booking.get("email"),
        "date": booking.get("date", ""),
        "time": booking.get("time", ""),
        "people_count": booking.get("people_count"),
        "purpose": booking.get("purpose"),
        "extras": booking.get("extras", []),
        "duration": booking.get("duration"),
        "notes": booking.get("notes"),
        "status": booking.get("status", "pending"),
        "created_at": booking.get("created_at"),
        "notified_at": booking.get("notified_at")
    }


@router.get("/{bot_id}")
async def list_bookings(
    bot_id: str,
    status: Optional[str] = Query(None, description="Filter by status: pending, confirmed, cancelled"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """
    List bookings for a bot with optional filtering.

    Returns paginated list of bookings sorted by creation date (newest first).
    """
    db = get_mongodb()
    tenant_id = current_user["tenant_id"]

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": tenant_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    bookings = await get_bookings_by_bot(
        bot_id=bot_id,
        tenant_id=tenant_id,
        status=status,
        limit=limit,
        offset=offset
    )

    return {
        "bookings": [booking_to_response(b) for b in bookings],
        "total": len(bookings),
        "limit": limit,
        "offset": offset
    }


@router.get("/{bot_id}/calendar")
async def get_calendar(
    bot_id: str,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    current_user: dict = Depends(get_current_user)
):
    """
    Get bookings grouped by date for calendar display.

    Returns:
    - days: Dictionary mapping dates (YYYY-MM-DD) to booking lists
    - stats: Counts by status (pending, confirmed, cancelled, total)
    """
    db = get_mongodb()
    tenant_id = current_user["tenant_id"]

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": tenant_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    calendar_data = await get_bookings_for_calendar(
        bot_id=bot_id,
        tenant_id=tenant_id,
        year=year,
        month=month
    )

    return calendar_data


@router.get("/{bot_id}/check-availability")
async def check_slot_availability(
    bot_id: str,
    date: str = Query(..., description="Date to check (e.g., 'tomorrow', '2024-12-15')"),
    time: str = Query(..., description="Time to check (e.g., '9 PM', '14:00')"),
    duration: Optional[str] = Query(None, description="Duration (e.g., '1 hour', '30 minutes')"),
    current_user: dict = Depends(get_current_user)
):
    """
    Check if a time slot is available for booking.

    Returns:
    - available: Boolean indicating if the slot is free
    - conflicts: List of conflicting bookings if not available
    - message: Human-readable status message
    """
    db = get_mongodb()
    tenant_id = current_user["tenant_id"]

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": tenant_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    availability = await check_availability(
        bot_id=bot_id,
        tenant_id=tenant_id,
        date_str=date,
        time_str=time,
        duration_str=duration
    )

    return availability


@router.get("/{bot_id}/{booking_id}")
async def get_booking_detail(
    bot_id: str,
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get details of a specific booking."""
    db = get_mongodb()
    tenant_id = current_user["tenant_id"]

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": tenant_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    booking = await get_booking(booking_id)
    if not booking or booking.get("bot_id") != bot_id:
        raise HTTPException(status_code=404, detail="Booking not found")

    return booking_to_response(booking)


@router.patch("/{bot_id}/{booking_id}")
async def update_status(
    bot_id: str,
    booking_id: str,
    status: str = Query(..., description="New status: pending, confirmed, cancelled"),
    current_user: dict = Depends(get_current_user)
):
    """
    Update the status of a booking.

    Valid statuses: pending, confirmed, cancelled
    """
    db = get_mongodb()
    tenant_id = current_user["tenant_id"]

    # Validate status
    if status not in ["pending", "confirmed", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Must be: pending, confirmed, or cancelled"
        )

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": tenant_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Verify booking exists and belongs to this bot
    booking = await get_booking(booking_id)
    if not booking or booking.get("bot_id") != bot_id:
        raise HTTPException(status_code=404, detail="Booking not found")

    success = await update_booking_status(booking_id, status)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update booking status")

    # Get updated booking
    updated_booking = await get_booking(booking_id)

    # Send confirmation email if status changed to "confirmed" and customer email exists
    customer_email = booking.get("email")
    logger.info(f"[BOOKING CONFIRM] Status={status}, Customer email={customer_email}")

    if status == "confirmed" and customer_email:
        from ..services.email import send_booking_confirmation_to_customer
        try:
            logger.info(f"[BOOKING CONFIRM] Sending confirmation email to {customer_email}")
            await send_booking_confirmation_to_customer(
                to_email=customer_email,
                booking_details=booking,
                bot_name=bot.get("name", "Our Team")
            )
            logger.info(f"[BOOKING CONFIRM] Confirmation email sent successfully to {customer_email}")
        except Exception as e:
            logger.error(f"[BOOKING CONFIRM] Failed to send booking confirmation: {e}", exc_info=True)
    elif status == "confirmed" and not customer_email:
        logger.warning(f"[BOOKING CONFIRM] No customer email in booking {booking_id}, skipping confirmation email")

    return {
        "success": True,
        "booking": booking_to_response(updated_booking)
    }


@router.delete("/{bot_id}/{booking_id}")
async def cancel_booking(
    bot_id: str,
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel a booking (sets status to 'cancelled').

    This is a convenience endpoint equivalent to PATCH with status=cancelled.
    """
    db = get_mongodb()
    tenant_id = current_user["tenant_id"]

    # Verify bot ownership
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": tenant_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # Verify booking exists and belongs to this bot
    booking = await get_booking(booking_id)
    if not booking or booking.get("bot_id") != bot_id:
        raise HTTPException(status_code=404, detail="Booking not found")

    success = await update_booking_status(booking_id, "cancelled")
    if not success:
        raise HTTPException(status_code=500, detail="Failed to cancel booking")

    return {"success": True, "message": "Booking cancelled"}
