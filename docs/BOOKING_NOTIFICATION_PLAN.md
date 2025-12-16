# Booking Notification Workflow - Implementation Plan

## Overview

Implement a workflow where Aiden (the chatbot) notifies the SpotIN team when a client submits a room booking request. This plan uses the **existing handoff system** instead of LLM function calling for a simpler, more reliable implementation.

---

## Problem Statement

When a client provides booking details through chat:
- Guest name: Mohamed Bakr
- Phone: 01027764824
- Date: Tomorrow at 9 PM
- People: 9
- Purpose: Urgent meeting
- Extras: Whiteboard, Screen

Aiden says "I'll notify the team" but there's no actual notification mechanism.

---

## Proposed Solution: Handoff-Based Booking Notifications

Use the existing handoff system to create "booking" type handoffs that notify agents in real-time.

### Why Use Handoff System?

| Feature | Already Built | Needs Building |
|---------|---------------|----------------|
| Real-time WebSocket notifications | ✅ | |
| Redis pub/sub messaging | ✅ | |
| Agent availability tracking | ✅ | |
| Auto-assignment to available agents | ✅ | |
| MongoDB persistence | ✅ | |
| Admin dashboard UI | ✅ | |
| Multi-tenant isolation | ✅ | |
| Email notifications | | ✅ (optional) |
| Booking-specific trigger | | ✅ |
| Booking data extraction | | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER CHAT FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User: "I want to book a room for tomorrow at 9 PM"           │
│                           ↓                                     │
│   Aiden: Collects details (name, phone, date, time, people)    │
│                           ↓                                     │
│   User: "Mohamed Bakr, 01027764824, 9 people, whiteboard"      │
│                           ↓                                     │
│   Aiden: "I'll send this to the team!"                         │
│                           ↓                                     │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  TRIGGER: Booking keywords detected OR LLM tool call    │  │
│   └─────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BOOKING HANDOFF CREATED                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   {                                                             │
│     "_id": "booking-uuid",                                      │
│     "session_id": "chat-session-id",                           │
│     "bot_id": "spotin-bot-id",                                 │
│     "tenant_id": "spotin-tenant",                              │
│     "status": "PENDING",                                        │
│     "priority": "HIGH",                                         │
│     "trigger": "BOOKING",           ← NEW TRIGGER TYPE          │
│     "trigger_reason": "Room booking request",                   │
│     "booking_details": {            ← NEW FIELD                 │
│       "guest_name": "Mohamed Bakr",                            │
│       "phone": "01027764824",                                  │
│       "date": "Tomorrow",                                       │
│       "time": "9 PM",                                          │
│       "people_count": 9,                                        │
│       "purpose": "Urgent meeting",                              │
│       "extras": ["whiteboard", "screen"]                       │
│     },                                                          │
│     "conversation_context": [...last 20 messages...],          │
│     "created_at": "2024-12-15T..."                             │
│   }                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION DISPATCH                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Redis Pub/Sub → handoff:{tenant_id}                       │
│      {                                                          │
│        "type": "new_booking",                                   │
│        "handoff_id": "booking-uuid",                           │
│        "booking_details": {...},                               │
│        "priority": "HIGH"                                       │
│      }                                                          │
│                                                                 │
│   2. WebSocket Broadcast → All connected agents                │
│      Real-time notification in admin dashboard                  │
│                                                                 │
│   3. Auto-Assignment (if configured)                           │
│      Assigns to first available agent                          │
│                                                                 │
│   4. Email Notification (optional)                             │
│      Send to bot owner email via Resend                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT DASHBOARD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  🏠 NEW BOOKING REQUEST                    [HIGH]        │  │
│   │  ─────────────────────────────────────────────────────  │  │
│   │  Guest: Mohamed Bakr                                     │  │
│   │  Phone: 01027764824 (WhatsApp)                          │  │
│   │  Date: Tomorrow | Time: 9 PM | People: 9                │  │
│   │  Purpose: Urgent meeting                                 │  │
│   │  Extras: Whiteboard, Screen                             │  │
│   │  ─────────────────────────────────────────────────────  │  │
│   │  [Contact Guest]  [Mark Confirmed]  [Mark Cancelled]    │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Add Booking Trigger Type

**File**: `backend/app/services/handoff.py`

Add `BOOKING` to the trigger types and create booking detection:

```python
# Add to HandoffTrigger enum or constants
HANDOFF_TRIGGERS = ["USER_REQUEST", "KEYWORD", "SENTIMENT", "UNANSWERED", "MANUAL", "BOOKING"]

async def check_booking_trigger(message: str, conversation_history: list) -> dict:
    """
    Check if conversation contains a complete booking request.

    Returns:
        {"is_booking": True, "booking_details": {...}} or {"is_booking": False}
    """
    # Option A: Keyword-based detection
    booking_keywords = ["booking request", "i'll send this", "notify the team", "reserve", "book a room"]

    # Option B: LLM-based extraction (more accurate)
    # Use a quick LLM call to extract booking details from conversation

    # Option C: Pattern matching on collected fields
    # Check if name, phone, date, time, people are all present in recent messages
```

### Step 2: Create Booking Handoff Function

**File**: `backend/app/services/handoff.py`

```python
async def create_booking_handoff(
    session_id: str,
    bot_id: str,
    tenant_id: str,
    booking_details: dict,
    conversation_context: list = None
) -> dict:
    """
    Create a booking-type handoff to notify agents.

    Args:
        session_id: Chat session ID
        bot_id: Chatbot ID
        tenant_id: Tenant ID
        booking_details: {
            "guest_name": str,
            "phone": str,
            "date": str,
            "time": str,
            "people_count": int,
            "purpose": str (optional),
            "extras": list (optional)
        }
        conversation_context: Last N messages from conversation

    Returns:
        Created handoff document
    """
    db = get_mongodb()
    redis = get_redis()

    handoff_id = str(uuid.uuid4())

    handoff = {
        "_id": handoff_id,
        "session_id": session_id,
        "bot_id": bot_id,
        "tenant_id": tenant_id,
        "status": "PENDING",
        "priority": "HIGH",  # Bookings are high priority
        "trigger": "BOOKING",
        "trigger_reason": f"Room booking request from {booking_details.get('guest_name')}",
        "booking_details": booking_details,  # NEW FIELD
        "visitor_info": {
            "name": booking_details.get("guest_name"),
            "phone": booking_details.get("phone")
        },
        "conversation_context": conversation_context or [],
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db.handoffs.insert_one(handoff)

    # Publish to Redis for real-time notification
    await redis.publish(
        f"handoff:{tenant_id}",
        json.dumps({
            "type": "new_booking",
            "handoff_id": handoff_id,
            "bot_id": bot_id,
            "booking_details": booking_details,
            "priority": "HIGH"
        })
    )

    # Try auto-assign if configured
    bot = await db.chatbots.find_one({"_id": bot_id})
    if bot and bot.get("handoff_config", {}).get("auto_assign"):
        await try_auto_assign(handoff_id, tenant_id)

    # Optional: Send email notification
    await send_booking_email_notification(bot_id, booking_details)

    return handoff
```

### Step 3: Add Email Notification (Optional)

**File**: `backend/app/services/email.py`

```python
async def send_booking_notification(to_email: str, booking_details: dict, bot_name: str = "Aiden") -> bool:
    """
    Send booking notification email to bot owner.
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return False

    guest_name = booking_details.get("guest_name", "Guest")
    phone = booking_details.get("phone", "N/A")
    date = booking_details.get("date", "N/A")
    time = booking_details.get("time", "N/A")
    people = booking_details.get("people_count", "N/A")
    purpose = booking_details.get("purpose", "Not specified")
    extras = booking_details.get("extras", [])
    extras_text = ", ".join(extras) if extras else "None"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🏠 New Booking Request</h1>
                                <p style="color: #fef3c7; margin: 5px 0 0 0; font-size: 14px;">via {bot_name} Chatbot</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Guest Details</h2>

                                <table width="100%" style="margin-bottom: 25px;">
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                            <strong style="color: #6b7280;">Name:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            {guest_name}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                            <strong style="color: #6b7280;">Phone/WhatsApp:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            <a href="https://wa.me/{phone.replace(' ', '').replace('-', '')}" style="color: #25D366; text-decoration: none;">{phone}</a>
                                        </td>
                                    </tr>
                                </table>

                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Booking Details</h2>

                                <table width="100%" style="margin-bottom: 25px;">
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                            <strong style="color: #6b7280;">Date:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            {date}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                            <strong style="color: #6b7280;">Time:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            {time}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                            <strong style="color: #6b7280;">Number of People:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            {people}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                            <strong style="color: #6b7280;">Purpose:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            {purpose}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                                            <strong style="color: #6b7280;">Extras Requested:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            {extras_text}
                                        </td>
                                    </tr>
                                </table>

                                <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 20px 0; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
                                    <strong>Action Required:</strong> Please contact the guest via WhatsApp to confirm availability and pricing.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    This notification was sent by {bot_name} - AI Customer Support
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    text_content = f"""
NEW BOOKING REQUEST
==================

Guest Details:
- Name: {guest_name}
- Phone/WhatsApp: {phone}

Booking Details:
- Date: {date}
- Time: {time}
- Number of People: {people}
- Purpose: {purpose}
- Extras Requested: {extras_text}

ACTION REQUIRED: Please contact the guest via WhatsApp to confirm availability and pricing.

---
Sent by {bot_name} Chatbot
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": f"🏠 New Booking Request - {guest_name}",
            "html": html_content,
            "text": text_content
        })

        logger.info(f"Booking notification sent to {to_email}")
        await track_email_sent("booking_notification", to_email, True, response.get("id"))
        return True

    except Exception as e:
        logger.error(f"Failed to send booking notification to {to_email}: {e}")
        await track_email_sent("booking_notification", to_email, False)
        return False
```

### Step 4: Integrate with Chat Endpoint

**File**: `backend/app/api/chat.py`

Add booking detection after LLM response:

```python
# After generating response, check for booking trigger
from ..services.handoff import create_booking_handoff, extract_booking_details

# Option A: Keyword-based trigger
booking_keywords = ["i'll send this request", "notify the team", "booking request"]
if any(kw in response_text.lower() for kw in booking_keywords):
    # Extract booking details from conversation
    booking_details = await extract_booking_details(conversation_history + [user_msg])

    if booking_details and booking_details.get("guest_name") and booking_details.get("phone"):
        await create_booking_handoff(
            session_id=session_id,
            bot_id=bot_id,
            tenant_id=tenant_id,
            booking_details=booking_details,
            conversation_context=history[-20:]
        )
        logger.info(f"Booking handoff created for {booking_details.get('guest_name')}")

# Option B: LLM tool call (if using function calling)
if llm_result.get("tool_calls"):
    for tool_call in llm_result["tool_calls"]:
        if tool_call["function"]["name"] == "submit_booking_request":
            booking_details = json.loads(tool_call["function"]["arguments"])
            await create_booking_handoff(...)
```

### Step 5: Update Frontend Dashboard

**File**: `frontend/src/pages/ChatbotHandoff.jsx`

Add booking-specific UI:

```jsx
// Add booking details display in handoff card
{handoff.trigger === 'BOOKING' && handoff.booking_details && (
  <div className="booking-details bg-amber-50 p-4 rounded-lg mt-4">
    <h4 className="font-semibold text-amber-800 mb-2">🏠 Booking Details</h4>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div><span className="text-gray-600">Guest:</span> {handoff.booking_details.guest_name}</div>
      <div><span className="text-gray-600">Phone:</span>
        <a href={`https://wa.me/${handoff.booking_details.phone}`} className="text-green-600 ml-1">
          {handoff.booking_details.phone}
        </a>
      </div>
      <div><span className="text-gray-600">Date:</span> {handoff.booking_details.date}</div>
      <div><span className="text-gray-600">Time:</span> {handoff.booking_details.time}</div>
      <div><span className="text-gray-600">People:</span> {handoff.booking_details.people_count}</div>
      <div><span className="text-gray-600">Purpose:</span> {handoff.booking_details.purpose || 'N/A'}</div>
      {handoff.booking_details.extras?.length > 0 && (
        <div className="col-span-2">
          <span className="text-gray-600">Extras:</span> {handoff.booking_details.extras.join(', ')}
        </div>
      )}
    </div>
    <div className="mt-3 flex gap-2">
      <a
        href={`https://wa.me/${handoff.booking_details.phone}`}
        target="_blank"
        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
      >
        Contact on WhatsApp
      </a>
    </div>
  </div>
)}
```

---

## Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `backend/app/services/handoff.py` | Modify | Add `create_booking_handoff()`, `extract_booking_details()` |
| `backend/app/services/email.py` | Modify | Add `send_booking_notification()` |
| `backend/app/api/chat.py` | Modify | Add booking trigger detection after LLM response |
| `backend/app/schemas/handoff.py` | Modify | Add `booking_details` field to schema |
| `frontend/src/pages/ChatbotHandoff.jsx` | Modify | Add booking details UI |

---

## Booking Details Extraction Options

### Option A: Pattern Matching (Simple)

```python
import re

def extract_booking_from_conversation(messages: list) -> dict:
    """Extract booking details using pattern matching."""
    text = " ".join([m.get("content", "") for m in messages])

    booking = {}

    # Phone patterns
    phone_match = re.search(r'(\+?[\d\s-]{10,})', text)
    if phone_match:
        booking["phone"] = phone_match.group(1).strip()

    # People count
    people_match = re.search(r'(\d+)\s*(?:people|persons|guests|attendees)', text, re.I)
    if people_match:
        booking["people_count"] = int(people_match.group(1))

    # Name (after "name is" or "I am" or "my name")
    name_match = re.search(r'(?:name is|I am|my name[\'s]*)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', text)
    if name_match:
        booking["guest_name"] = name_match.group(1)

    # Time patterns
    time_match = re.search(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)', text)
    if time_match:
        booking["time"] = time_match.group(1)

    # Date patterns
    if "tomorrow" in text.lower():
        booking["date"] = "Tomorrow"
    elif "today" in text.lower():
        booking["date"] = "Today"

    return booking if booking.get("guest_name") and booking.get("phone") else None
```

### Option B: LLM Extraction (More Accurate)

```python
async def extract_booking_with_llm(messages: list) -> dict:
    """Use LLM to extract structured booking details."""
    conversation_text = "\n".join([
        f"{m.get('role', 'user')}: {m.get('content', '')}"
        for m in messages[-10:]
    ])

    extraction_prompt = f"""Extract booking details from this conversation. Return JSON only.

Conversation:
{conversation_text}

Extract these fields (return null if not found):
- guest_name: Full name of the guest
- phone: Phone or WhatsApp number
- date: Booking date
- time: Booking time
- people_count: Number of people (integer)
- purpose: Purpose of booking
- extras: List of requested extras (whiteboard, screen, etc.)

Return ONLY valid JSON, no explanation."""

    # Quick LLM call for extraction
    response = await quick_llm_call(extraction_prompt)

    try:
        return json.loads(response)
    except:
        return None
```

---

## Data Flow Summary

```
1. User provides booking details through chat
2. Aiden collects: name, phone, date, time, people, purpose, extras
3. Aiden responds: "I'll send this request to the team"
4. System detects booking trigger (keyword or pattern)
5. System extracts booking details from conversation
6. System creates BOOKING-type handoff
7. Redis publishes notification to tenant channel
8. Connected agents receive WebSocket notification
9. (Optional) Email sent to bot owner
10. Agent views booking in dashboard
11. Agent contacts guest via WhatsApp
12. Agent marks handoff as RESOLVED/CONFIRMED
```

---

## Testing Checklist

- [ ] Booking trigger detection works with keyword patterns
- [ ] Booking details extraction captures all fields
- [ ] Booking handoff created in MongoDB
- [ ] Redis notification published
- [ ] WebSocket delivers to connected agents
- [ ] Dashboard displays booking details correctly
- [ ] WhatsApp link works
- [ ] Email notification sent (if configured)
- [ ] Handoff can be resolved/marked as confirmed

---

## Future Enhancements

1. **Booking Calendar Integration**: Sync with Google Calendar
2. **Availability Check**: Query room availability before confirming
3. **Automated Confirmation SMS**: Send SMS to guest when confirmed
4. **Booking Analytics**: Track booking conversion rates
5. **Recurring Bookings**: Support weekly/monthly bookings
6. **Payment Integration**: Accept deposits via Stripe/PayPal
