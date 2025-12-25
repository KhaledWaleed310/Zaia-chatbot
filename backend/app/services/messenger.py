"""
Facebook Messenger integration service.
Handles OAuth, messaging, and webhook verification.
"""
import hashlib
import hmac
import httpx
import logging
import urllib.parse
from typing import Optional, Dict, List, Any
from datetime import datetime

from ..core.config import settings
from ..core.encryption import encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

# Facebook API URLs
FACEBOOK_GRAPH_API = "https://graph.facebook.com/v18.0"
FACEBOOK_OAUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"


class MessengerService:
    """Service for Facebook Messenger integration."""

    def __init__(self):
        self.app_id = settings.FACEBOOK_APP_ID
        self.app_secret = settings.FACEBOOK_APP_SECRET
        self.verify_token = settings.FACEBOOK_VERIFY_TOKEN

    def is_configured(self) -> bool:
        """Check if Facebook Messenger is configured."""
        return bool(self.app_id and self.app_secret)

    def get_auth_url(self, bot_id: str, user_id: str, redirect_uri: str) -> str:
        """
        Generate Facebook OAuth authorization URL.

        Args:
            bot_id: The chatbot ID to connect
            user_id: The user ID making the connection
            redirect_uri: OAuth callback URL

        Returns:
            Facebook OAuth URL
        """
        if not self.is_configured():
            raise ValueError("Facebook Messenger is not configured")

        # State parameter contains bot_id and user_id for callback
        state = f"{bot_id}:{user_id}"

        params = {
            "client_id": self.app_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "pages_messaging,pages_show_list,pages_read_engagement",
            "response_type": "code",
        }

        return f"{FACEBOOK_OAUTH_URL}?{urllib.parse.urlencode(params)}"

    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchange authorization code for user access token.

        Args:
            code: Authorization code from OAuth callback
            redirect_uri: Same redirect URI used in auth request

        Returns:
            Dict with access_token and other token info
        """
        if not self.is_configured():
            raise ValueError("Facebook Messenger is not configured")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FACEBOOK_GRAPH_API}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                }
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Token exchange failed: {error_data}")
                raise ValueError(f"Token exchange failed: {error_data.get('error', {}).get('message', 'Unknown error')}")

            data = response.json()
            return {
                "access_token": data.get("access_token"),
                "token_type": data.get("token_type"),
                "expires_in": data.get("expires_in"),
            }

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get Facebook user info from access token.

        Args:
            access_token: User access token

        Returns:
            Dict with user id and name
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FACEBOOK_GRAPH_API}/me",
                params={
                    "access_token": access_token,
                    "fields": "id,name",
                }
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Failed to get user info: {error_data}")
                raise ValueError(f"Failed to get user info: {error_data.get('error', {}).get('message', 'Unknown error')}")

            return response.json()

    async def get_user_pages(self, access_token: str) -> List[Dict[str, Any]]:
        """
        Get list of Facebook Pages the user manages.

        Args:
            access_token: User access token

        Returns:
            List of pages with id, name, and access_token
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FACEBOOK_GRAPH_API}/me/accounts",
                params={
                    "access_token": access_token,
                    "fields": "id,name,access_token,category,picture",
                }
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Failed to get user pages: {error_data}")
                raise ValueError(f"Failed to get user pages: {error_data.get('error', {}).get('message', 'Unknown error')}")

            data = response.json()
            return data.get("data", [])

    async def subscribe_page_to_app(self, page_access_token: str, page_id: str) -> bool:
        """
        Subscribe a page to the app's webhook.

        Args:
            page_access_token: Page access token
            page_id: Facebook Page ID

        Returns:
            True if subscription successful
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FACEBOOK_GRAPH_API}/{page_id}/subscribed_apps",
                params={
                    "access_token": page_access_token,
                    "subscribed_fields": "messages,messaging_postbacks",
                }
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Failed to subscribe page: {error_data}")
                return False

            data = response.json()
            return data.get("success", False)

    async def unsubscribe_page_from_app(self, page_access_token: str, page_id: str) -> bool:
        """
        Unsubscribe a page from the app's webhook.

        Args:
            page_access_token: Page access token
            page_id: Facebook Page ID

        Returns:
            True if unsubscription successful
        """
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{FACEBOOK_GRAPH_API}/{page_id}/subscribed_apps",
                params={
                    "access_token": page_access_token,
                }
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Failed to unsubscribe page: {error_data}")
                return False

            return True

    async def send_message(
        self,
        page_access_token: str,
        recipient_id: str,
        message_text: str
    ) -> Dict[str, Any]:
        """
        Send a text message via Messenger.

        Args:
            page_access_token: Page access token
            recipient_id: Messenger user ID (PSID)
            message_text: Text message to send

        Returns:
            API response with message_id
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FACEBOOK_GRAPH_API}/me/messages",
                params={"access_token": page_access_token},
                json={
                    "recipient": {"id": recipient_id},
                    "message": {"text": message_text},
                    "messaging_type": "RESPONSE",
                }
            )

            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Failed to send message: {error_data}")
                raise ValueError(f"Failed to send message: {error_data.get('error', {}).get('message', 'Unknown error')}")

            return response.json()

    async def send_typing_indicator(
        self,
        page_access_token: str,
        recipient_id: str,
        is_typing: bool = True
    ) -> bool:
        """
        Send typing indicator to show bot is processing.

        Args:
            page_access_token: Page access token
            recipient_id: Messenger user ID (PSID)
            is_typing: True to show typing, False to hide

        Returns:
            True if successful
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FACEBOOK_GRAPH_API}/me/messages",
                params={"access_token": page_access_token},
                json={
                    "recipient": {"id": recipient_id},
                    "sender_action": "typing_on" if is_typing else "typing_off",
                }
            )

            return response.status_code == 200

    def validate_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Validate webhook request signature.

        Args:
            payload: Raw request body
            signature: X-Hub-Signature-256 header value

        Returns:
            True if signature is valid
        """
        if not self.app_secret:
            logger.warning("Cannot validate webhook: no app secret configured")
            return False

        if not signature or not signature.startswith("sha256="):
            return False

        expected_signature = "sha256=" + hmac.new(
            self.app_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    def verify_webhook_challenge(self, mode: str, token: str, challenge: str) -> Optional[str]:
        """
        Verify webhook subscription request from Facebook.

        Args:
            mode: hub.mode parameter
            token: hub.verify_token parameter
            challenge: hub.challenge parameter

        Returns:
            Challenge string if valid, None otherwise
        """
        if mode == "subscribe" and token == self.verify_token:
            logger.info("Webhook verified successfully")
            return challenge

        logger.warning(f"Webhook verification failed: mode={mode}, token_match={token == self.verify_token}")
        return None

    @staticmethod
    def encrypt_access_token(token: str) -> str:
        """Encrypt access token for secure storage."""
        return encrypt_token(token)

    @staticmethod
    def decrypt_access_token(encrypted_token: str) -> str:
        """Decrypt stored access token."""
        return decrypt_token(encrypted_token)

    def parse_webhook_event(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse incoming webhook event data.

        Args:
            data: Webhook payload from Facebook

        Returns:
            List of parsed messaging events
        """
        events = []

        if data.get("object") != "page":
            return events

        for entry in data.get("entry", []):
            page_id = entry.get("id")

            for messaging_event in entry.get("messaging", []):
                sender_id = messaging_event.get("sender", {}).get("id")
                recipient_id = messaging_event.get("recipient", {}).get("id")
                timestamp = messaging_event.get("timestamp")

                event = {
                    "page_id": page_id,
                    "sender_id": sender_id,
                    "recipient_id": recipient_id,
                    "timestamp": timestamp,
                    "event_type": None,
                    "data": {},
                }

                # Text message
                if "message" in messaging_event:
                    message = messaging_event["message"]
                    event["event_type"] = "message"
                    event["data"] = {
                        "message_id": message.get("mid"),
                        "text": message.get("text", ""),
                        "attachments": message.get("attachments", []),
                        "is_echo": message.get("is_echo", False),
                    }

                # Postback (button click)
                elif "postback" in messaging_event:
                    postback = messaging_event["postback"]
                    event["event_type"] = "postback"
                    event["data"] = {
                        "title": postback.get("title"),
                        "payload": postback.get("payload"),
                    }

                # Read receipt
                elif "read" in messaging_event:
                    event["event_type"] = "read"
                    event["data"] = {
                        "watermark": messaging_event["read"].get("watermark"),
                    }

                # Delivery confirmation
                elif "delivery" in messaging_event:
                    event["event_type"] = "delivery"
                    event["data"] = {
                        "mids": messaging_event["delivery"].get("mids", []),
                        "watermark": messaging_event["delivery"].get("watermark"),
                    }

                if event["event_type"]:
                    events.append(event)

        return events


# Singleton instance
messenger_service = MessengerService()
