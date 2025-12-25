"""
Email Service using Resend

Handles sending various notification emails:
- Password reset
- Email verification
- Password changed confirmation
- Booking notifications
"""
import logging
import re
from typing import Optional
from datetime import datetime

import resend

from ..core.config import settings
from ..core.database import get_mongodb

logger = logging.getLogger(__name__)


async def track_email_sent(email_type: str, to_email: str, success: bool, resend_id: str = None):
    """Track email sent in database for metrics"""
    try:
        db = get_mongodb()
        await db.email_logs.insert_one({
            "type": email_type,
            "to_email": to_email,
            "success": success,
            "resend_id": resend_id,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        logger.error(f"Failed to track email: {e}")


def init_resend():
    """Initialize Resend with API key"""
    if settings.RESEND_API_KEY:
        resend.api_key = settings.RESEND_API_KEY
        return True
    return False


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """
    Send password reset email via Resend.

    Args:
        to_email: Recipient email address
        reset_token: The raw reset token to include in the link

    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        logger.error("RESEND_API_KEY not configured")
        return False

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

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
                            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Aiden Link</h1>
                                <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">AI-Powered Customer Support</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Password Reset Request</h2>

                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    We received a request to reset the password for your Aiden Link account. Click the button below to create a new password:
                                </p>

                                <!-- Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                                                Reset Password
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                                    <strong>This link will expire in 1 hour.</strong>
                                </p>

                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
                                    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                                </p>

                                <!-- Divider -->
                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

                                <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
                                    If the button above doesn't work, copy and paste this URL into your browser:
                                </p>
                                <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 5px 0 0 0; word-break: break-all;">
                                    {reset_url}
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 5px 0;">
                                    This email was sent by Aiden Link - AI Customer Support Platform
                                </p>
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    &copy; 2024 ZAIA Systems. All rights reserved.
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

    # Plain text version for better deliverability
    text_content = f"""Password Reset Request

We received a request to reset the password for your Aiden Link account.

Click the link below to create a new password:
{reset_url}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
Aiden Link - AI Customer Support Platform
ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": "Password Reset - Aiden Link",
            "html": html_content,
            "text": text_content
        })

        logger.info(f"Password reset email sent to {to_email}, response: {response}")
        await track_email_sent("password_reset", to_email, True, response.get("id"))
        return True

    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        await track_email_sent("password_reset", to_email, False)
        return False


async def send_password_changed_confirmation(to_email: str) -> bool:
    """
    Send confirmation email after password has been changed.

    Args:
        to_email: Recipient email address

    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        logger.error("RESEND_API_KEY not configured")
        return False

    html_content = """
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
                            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Aiden Link</h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Password Changed Successfully</h2>

                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Your Aiden Link account password has been successfully changed.
                                </p>

                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
                                    If you did not make this change, please contact our support team immediately or reset your password again.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    &copy; 2024 ZAIA Systems. All rights reserved.
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

    # Plain text version
    text_content = """Password Changed Successfully

Your Aiden Link account password has been successfully changed.

If you did not make this change, please contact our support team immediately or reset your password again.

---
Aiden Link - AI Customer Support Platform
ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": "Password Changed - Aiden Link",
            "html": html_content,
            "text": text_content
        })

        logger.info(f"Password changed confirmation sent to {to_email}")
        await track_email_sent("password_changed", to_email, True, response.get("id"))
        return True

    except Exception as e:
        logger.error(f"Failed to send password changed confirmation to {to_email}: {e}")
        await track_email_sent("password_changed", to_email, False)
        return False


async def send_verification_email(to_email: str, verification_token: str) -> bool:
    """
    Send email verification link to new user.

    Args:
        to_email: Recipient email address
        verification_token: The raw verification token

    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        logger.error("RESEND_API_KEY not configured")
        return False

    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"

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
                            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Aiden Link</h1>
                                <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">AI-Powered Customer Support</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Welcome to Aiden Link!</h2>

                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Thanks for signing up! Please verify your email address by clicking the button below:
                                </p>

                                <!-- Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{verify_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                                                Verify Email Address
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                                    <strong>This link will expire in 24 hours.</strong>
                                </p>

                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
                                    If you didn't create an account with Aiden Link, you can safely ignore this email.
                                </p>

                                <!-- Divider -->
                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

                                <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
                                    If the button above doesn't work, copy and paste this URL into your browser:
                                </p>
                                <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 5px 0 0 0; word-break: break-all;">
                                    {verify_url}
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 5px 0;">
                                    This email was sent by Aiden Link - AI Customer Support Platform
                                </p>
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    &copy; 2024 ZAIA Systems. All rights reserved.
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

    # Plain text version for better deliverability
    text_content = f"""Welcome to Aiden Link!

Thanks for signing up! Please verify your email address by clicking the link below:

{verify_url}

This link will expire in 24 hours.

If you didn't create an account with Aiden Link, you can safely ignore this email.

---
Aiden Link - AI Customer Support Platform
ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": "Verify Your Email - Aiden Link",
            "html": html_content,
            "text": text_content
        })

        logger.info(f"Verification email sent to {to_email}, response: {response}")
        await track_email_sent("verification", to_email, True, response.get("id"))
        return True

    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")
        await track_email_sent("verification", to_email, False)
        return False


async def send_booking_notification(
    to_email: str,
    booking_details: dict,
    bot_name: str = "Aiden Link"
) -> bool:
    """
    Send booking notification email to bot owner/team.

    Args:
        to_email: Recipient email address
        booking_details: Dictionary with booking information:
            - booking_type: str
            - guest_name: str
            - phone: str
            - date: str
            - time: str
            - people_count: int (optional)
            - purpose: str (optional)
            - duration: str (optional)
            - extras: list (optional)
            - notes: str (optional)
        bot_name: Name of the chatbot

    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping booking notification email")
        return False

    # Extract and format booking details
    booking_type = booking_details.get("booking_type", "Booking").title()
    guest_name = booking_details.get("guest_name", "Guest")
    phone = booking_details.get("phone", "N/A")
    date = booking_details.get("date", "N/A")
    time = booking_details.get("time", "N/A")
    people = booking_details.get("people_count", "N/A")
    purpose = booking_details.get("purpose") or "Not specified"
    duration = booking_details.get("duration") or "Not specified"
    extras = booking_details.get("extras", [])
    notes = booking_details.get("notes") or "None"
    extras_text = ", ".join(extras) if extras else "None"

    # Clean phone for WhatsApp link (remove spaces, dashes, keep + and digits)
    clean_phone = re.sub(r'[^\d+]', '', phone)

    # Choose header color based on booking type
    type_colors = {
        "room": "#2563eb",      # Blue for rooms
        "meeting": "#2563eb",   # Blue for meetings
        "table": "#059669",     # Green for restaurants
        "appointment": "#7c3aed",  # Purple for appointments
        "service": "#d97706",   # Amber for services
        "event": "#dc2626",     # Red for events
        "other": "#f59e0b"      # Yellow for other
    }
    header_color = type_colors.get(booking_details.get("booking_type", "other").lower(), "#f59e0b")

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
                            <td style="background: linear-gradient(135deg, {header_color} 0%, {header_color}dd 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">New {booking_type} Request</h1>
                                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">via {bot_name} Chatbot</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Guest Details</h2>

                                <table width="100%" style="margin-bottom: 25px;">
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 140px;">
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
                                            <a href="https://wa.me/{clean_phone}" style="color: #25D366; text-decoration: none; font-weight: 500;">{phone}</a>
                                        </td>
                                    </tr>
                                </table>

                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">{booking_type} Details</h2>

                                <table width="100%" style="margin-bottom: 25px;">
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 140px;">
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
                                            <strong style="color: #6b7280;">People:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            {people if people != "N/A" else "Not specified"}
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
                                            <strong style="color: #6b7280;">Duration:</strong>
                                        </td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                                            {duration}
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
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <strong style="color: #6b7280;">Notes:</strong>
                                        </td>
                                        <td style="padding: 10px 0; color: #1f2937;">
                                            {notes}
                                        </td>
                                    </tr>
                                </table>

                                <!-- WhatsApp Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="https://wa.me/{clean_phone}" style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                                Contact on WhatsApp
                                            </a>
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
                                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 5px 0;">
                                    This notification was sent by {bot_name} - AI Customer Support
                                </p>
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    &copy; 2024 ZAIA Systems. All rights reserved.
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

    # Plain text version for better deliverability
    text_content = f"""NEW {booking_type.upper()} REQUEST
{'=' * 40}

Guest Details:
- Name: {guest_name}
- Phone/WhatsApp: {phone}

{booking_type} Details:
- Date: {date}
- Time: {time}
- Number of People: {people if people != "N/A" else "Not specified"}
- Purpose: {purpose}
- Duration: {duration}
- Extras Requested: {extras_text}
- Notes: {notes}

ACTION REQUIRED: Please contact the guest via WhatsApp to confirm availability and pricing.
WhatsApp Link: https://wa.me/{clean_phone}

---
Sent by {bot_name} Chatbot
ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": f"New {booking_type} Request - {guest_name}",
            "html": html_content,
            "text": text_content
        })

        logger.info(f"Booking notification sent to {to_email} for {guest_name}")
        await track_email_sent("booking_notification", to_email, True, response.get("id"))
        return True

    except Exception as e:
        logger.error(f"Failed to send booking notification to {to_email}: {e}")
        await track_email_sent("booking_notification", to_email, False)
        return False


async def send_handoff_notification(
    to_email: str,
    bot_name: str,
    conversation_preview: str = None,
    dashboard_url: str = None,
    bot_id: str = None,
    handoff_id: str = None,
    requires_password: bool = False
) -> bool:
    """
    Send handoff notification email when a visitor requests human assistance.

    Args:
        to_email: Recipient email address (bot owner/agent)
        bot_name: Name of the chatbot
        conversation_preview: Brief preview of the conversation
        dashboard_url: URL to the handoff dashboard
        bot_id: Bot ID for direct link
        handoff_id: Handoff ID for direct link
        requires_password: Whether the direct link requires password

    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping handoff notification email")
        return False

    dashboard_link = dashboard_url or f"{settings.FRONTEND_URL}/handoff"
    # Format preview text - plain text for email text version
    preview_text = conversation_preview[:500] + "..." if conversation_preview and len(conversation_preview) > 500 else (conversation_preview or "No preview available")
    # HTML version with line breaks
    preview_html = preview_text.replace("\n", "<br>")

    # Build direct chat link if bot_id and handoff_id provided
    direct_link = None
    if bot_id and handoff_id:
        direct_link = f"{settings.FRONTEND_URL}/handoff/direct/{bot_id}/{handoff_id}"

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
                            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Customer Waiting!</h1>
                                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">via {bot_name} Chatbot</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
                                    <p style="color: #991b1b; margin: 0; font-size: 16px; font-weight: 600;">
                                        A visitor has requested to speak with a human agent
                                    </p>
                                </div>

                                <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Conversation Preview</h2>
                                <div style="background-color: #f9fafb; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px;">
                                    <div style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0;">
                                        {preview_html}
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{direct_link if direct_link else dashboard_link}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
                                                Chat Now
                                            </a>
                                        </td>
                                    </tr>
                                    {"<tr><td align='center' style='padding-top: 10px;'><p style='color: #9ca3af; font-size: 12px; margin: 0;'>You will need your notification password to access this chat</p></td></tr>" if requires_password else ""}
                                </table>

                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                                    The customer is waiting. Please respond as soon as possible.
                                </p>

                                {f'<p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 10px 0 0 0; text-align: center;"><a href="{dashboard_link}" style="color: #6b7280;">Or open full dashboard</a></p>' if direct_link else ''}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 5px 0;">
                                    This notification was sent by {bot_name} - AI Customer Support
                                </p>
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    &copy; 2024 ZAIA Systems. All rights reserved.
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

    # Plain text version
    direct_text = f"\nDirect Chat Link: {direct_link}" if direct_link else ""
    password_text = "\n(Password required to access)" if requires_password else ""

    text_content = f"""CUSTOMER WAITING FOR HUMAN ASSISTANCE
{'=' * 40}

A visitor has requested to speak with a human agent via {bot_name} chatbot.

Conversation Preview:
"{preview_text}"

ACTION REQUIRED: Please respond as soon as possible.
{direct_text}{password_text}

Dashboard: {dashboard_link}

---
Sent by {bot_name} Chatbot
ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": f"Customer Waiting - {bot_name}",
            "html": html_content,
            "text": text_content
        })

        logger.info(f"Handoff notification sent to {to_email}")
        await track_email_sent("handoff_notification", to_email, True, response.get("id"))
        return True

    except Exception as e:
        logger.error(f"Failed to send handoff notification to {to_email}: {e}")
        await track_email_sent("handoff_notification", to_email, False)
        return False


async def send_booking_confirmation_to_customer(
    to_email: str,
    booking_details: dict,
    bot_name: str = "Our Team"
) -> bool:
    """
    Send booking confirmation email to the customer.

    Args:
        to_email: Customer's email address
        booking_details: Dictionary with booking info (guest_name, date, time, etc.)
        bot_name: Name of the chatbot/business

    Returns:
        True if email was sent successfully, False otherwise
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping booking confirmation email")
        return False

    guest_name = booking_details.get("guest_name", "Customer")
    date = booking_details.get("date", "")
    time = booking_details.get("time", "")
    people_count = booking_details.get("people_count")
    purpose = booking_details.get("purpose")
    duration = booking_details.get("duration")
    notes = booking_details.get("notes")
    booking_type = booking_details.get("booking_type", "booking")

    # Build details list
    details_html = f"""
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <span style="color: #6b7280; font-size: 14px;">Date</span><br>
                                                    <strong style="color: #1f2937; font-size: 16px;">{date}</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <span style="color: #6b7280; font-size: 14px;">Time</span><br>
                                                    <strong style="color: #1f2937; font-size: 16px;">{time}</strong>
                                                </td>
                                            </tr>"""

    if people_count:
        details_html += f"""
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <span style="color: #6b7280; font-size: 14px;">People</span><br>
                                                    <strong style="color: #1f2937; font-size: 16px;">{people_count}</strong>
                                                </td>
                                            </tr>"""

    if purpose:
        details_html += f"""
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <span style="color: #6b7280; font-size: 14px;">Purpose</span><br>
                                                    <strong style="color: #1f2937; font-size: 16px;">{purpose}</strong>
                                                </td>
                                            </tr>"""

    if duration:
        details_html += f"""
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <span style="color: #6b7280; font-size: 14px;">Duration</span><br>
                                                    <strong style="color: #1f2937; font-size: 16px;">{duration}</strong>
                                                </td>
                                            </tr>"""

    if notes:
        details_html += f"""
                                            <tr>
                                                <td style="padding: 12px 16px;">
                                                    <span style="color: #6b7280; font-size: 14px;">Special Requests</span><br>
                                                    <strong style="color: #1f2937; font-size: 16px;">{notes}</strong>
                                                </td>
                                            </tr>"""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 0;">
                                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Booking Confirmed!</h1>
                                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your reservation has been approved</p>
                                </div>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Dear <strong>{guest_name}</strong>,
                                </p>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                                    Great news! Your {booking_type} has been confirmed. Here are your booking details:
                                </p>

                                <!-- Booking Details Card -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 25px;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h3 style="color: #059669; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Booking Details</h3>
                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                {details_html}
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                                    If you need to make any changes or have questions, please don't hesitate to contact us.
                                </p>

                                <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
                                    Thank you for choosing us!<br>
                                    <strong>{bot_name}</strong>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 30px 30px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                                    This is an automated confirmation email from {bot_name}.<br>
                                    Powered by ZAIA Systems
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

    # Plain text version
    details_text = f"""Date: {date}
Time: {time}"""
    if people_count:
        details_text += f"\nPeople: {people_count}"
    if purpose:
        details_text += f"\nPurpose: {purpose}"
    if duration:
        details_text += f"\nDuration: {duration}"
    if notes:
        details_text += f"\nSpecial Requests: {notes}"

    text_content = f"""Booking Confirmed!

Dear {guest_name},

Great news! Your {booking_type} has been confirmed.

BOOKING DETAILS:
{details_text}

If you need to make any changes or have questions, please don't hesitate to contact us.

Thank you for choosing us!
{bot_name}

---
Powered by ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": f"Booking Confirmed! - {bot_name}",
            "html": html_content,
            "text": text_content
        })

        logger.info(f"Booking confirmation sent to {to_email}")
        await track_email_sent("booking_confirmation", to_email, True, response.get("id"))
        return True

    except Exception as e:
        logger.error(f"Failed to send booking confirmation to {to_email}: {e}")
        await track_email_sent("booking_confirmation", to_email, False)
        return False
