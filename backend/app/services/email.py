"""
Email Service using Resend
"""
import logging
from typing import Optional

import resend

from ..core.config import settings

logger = logging.getLogger(__name__)


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

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "subject": "Reset Your Aiden Password",
            "html": html_content
        })

        logger.info(f"Password reset email sent to {to_email}, response: {response}")
        return True

    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
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

    try:
        init_resend()

        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "subject": "Your Aiden Password Has Been Changed",
            "html": html_content
        })

        logger.info(f"Password changed confirmation sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send password changed confirmation to {to_email}: {e}")
        return False
