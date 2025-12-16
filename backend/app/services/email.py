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
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Aiden</h1>
                                <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">AI-Powered Customer Support</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Password Reset Request</h2>

                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    We received a request to reset the password for your Aiden account. Click the button below to create a new password:
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
                                    This email was sent by Aiden - AI Customer Support Platform
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

We received a request to reset the password for your Aiden account.

Click the link below to create a new password:
{reset_url}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
Aiden - AI Customer Support Platform
ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": "Password Reset - Aiden",
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
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Aiden</h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Password Changed Successfully</h2>

                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Your Aiden account password has been successfully changed.
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

Your Aiden account password has been successfully changed.

If you did not make this change, please contact our support team immediately or reset your password again.

---
Aiden - AI Customer Support Platform
ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": "Password Changed - Aiden",
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
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Aiden</h1>
                                <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">AI-Powered Customer Support</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Welcome to Aiden!</h2>

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
                                    If you didn't create an account with Aiden, you can safely ignore this email.
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
                                    This email was sent by Aiden - AI Customer Support Platform
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
    text_content = f"""Welcome to Aiden!

Thanks for signing up! Please verify your email address by clicking the link below:

{verify_url}

This link will expire in 24 hours.

If you didn't create an account with Aiden, you can safely ignore this email.

---
Aiden - AI Customer Support Platform
ZAIA Systems
"""

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "reply_to": "info@zaiasystems.com",
            "subject": "Verify Your Email - Aiden",
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
    bot_name: str = "Aiden"
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
