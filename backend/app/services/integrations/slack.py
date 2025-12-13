"""Slack OAuth integration."""
import httpx
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlencode
from datetime import datetime
import re

from .base import BaseIntegration
from ...schemas.integrations import BrowseItem, BrowseResponse, BrowseItemType
from ...core.config import settings


class SlackIntegration(BaseIntegration):
    """Slack integration using OAuth2."""

    provider = "slack"
    display_name = "Slack"
    scopes = [
        "channels:read",
        "channels:history",
        "groups:read",
        "groups:history",
        "users:read",
    ]

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate Slack OAuth authorization URL."""
        params = {
            "client_id": settings.SLACK_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": ",".join(self.scopes),
            "state": state,
        }
        return f"https://slack.com/oauth/v2/authorize?{urlencode(params)}"

    async def exchange_code(
        self, code: str, redirect_uri: str
    ) -> Tuple[str, Optional[str], Optional[int], Dict[str, Any]]:
        """Exchange authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/oauth.v2.access",
                data={
                    "client_id": settings.SLACK_CLIENT_ID,
                    "client_secret": settings.SLACK_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("ok"):
                raise Exception(f"Slack OAuth error: {data.get('error')}")

            # Get user info
            user_response = await client.get(
                "https://slack.com/api/auth.test",
                headers={"Authorization": f"Bearer {data['access_token']}"},
            )
            user_data = user_response.json()

            return (
                data["access_token"],
                data.get("refresh_token"),
                data.get("expires_in"),
                {
                    "team_name": data.get("team", {}).get("name"),
                    "team_id": data.get("team", {}).get("id"),
                    "user_id": user_data.get("user_id"),
                    "email": user_data.get("user"),
                },
            )

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, Optional[int]]:
        """Refresh an expired Slack access token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/oauth.v2.access",
                data={
                    "client_id": settings.SLACK_CLIENT_ID,
                    "client_secret": settings.SLACK_CLIENT_SECRET,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("ok"):
                raise Exception(f"Slack refresh error: {data.get('error')}")

            return data["access_token"], data.get("expires_in")

    async def browse(
        self,
        access_token: str,
        folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        query: Optional[str] = None,
    ) -> BrowseResponse:
        """Browse Slack channels."""
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            # If no folder_id, list channels
            if not folder_id:
                params = {"limit": 100, "types": "public_channel,private_channel"}
                if page_token:
                    params["cursor"] = page_token

                response = await client.get(
                    "https://slack.com/api/conversations.list",
                    headers=headers,
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

                if not data.get("ok"):
                    raise Exception(f"Slack API error: {data.get('error')}")

                items = []
                for channel in data.get("channels", []):
                    # Skip archived channels
                    if channel.get("is_archived"):
                        continue

                    items.append(
                        BrowseItem(
                            id=channel["id"],
                            name=f"#{channel['name']}",
                            type=BrowseItemType.CHANNEL,
                            has_children=True,
                        )
                    )

                next_cursor = data.get("response_metadata", {}).get("next_cursor")
                return BrowseResponse(
                    items=items,
                    next_page_token=next_cursor if next_cursor else None,
                )

            # If folder_id is a channel, show recent messages as summary
            # We'll return one "item" representing the channel's messages
            channel_info = await client.get(
                "https://slack.com/api/conversations.info",
                headers=headers,
                params={"channel": folder_id},
            )
            channel_data = channel_info.json()
            channel_name = channel_data.get("channel", {}).get("name", "channel")

            return BrowseResponse(
                items=[
                    BrowseItem(
                        id=f"{folder_id}_messages",
                        name=f"All messages from #{channel_name}",
                        type=BrowseItemType.FILE,
                        has_children=False,
                    )
                ],
                parent_id=folder_id,
                parent_name=f"#{channel_name}",
            )

    async def fetch_content(self, access_token: str, item_id: str) -> Tuple[str, str, str]:
        """Fetch messages from a Slack channel."""
        headers = {"Authorization": f"Bearer {access_token}"}

        # Extract channel ID from item_id (format: channel_id_messages)
        channel_id = item_id.replace("_messages", "")

        async with httpx.AsyncClient() as client:
            # Get channel info
            channel_response = await client.get(
                "https://slack.com/api/conversations.info",
                headers=headers,
                params={"channel": channel_id},
            )
            channel_data = channel_response.json()
            channel_name = channel_data.get("channel", {}).get("name", "channel")

            # Get messages (last 100)
            messages_response = await client.get(
                "https://slack.com/api/conversations.history",
                headers=headers,
                params={"channel": channel_id, "limit": 100},
            )
            messages_response.raise_for_status()
            messages_data = messages_response.json()

            if not messages_data.get("ok"):
                raise Exception(f"Slack API error: {messages_data.get('error')}")

            # Build user cache for display names
            user_cache = {}

            async def get_user_name(user_id: str) -> str:
                if user_id in user_cache:
                    return user_cache[user_id]

                try:
                    user_response = await client.get(
                        "https://slack.com/api/users.info",
                        headers=headers,
                        params={"user": user_id},
                    )
                    user_data = user_response.json()
                    if user_data.get("ok"):
                        name = user_data["user"].get("real_name") or user_data["user"].get("name", user_id)
                        user_cache[user_id] = name
                        return name
                except Exception:
                    pass

                user_cache[user_id] = user_id
                return user_id

            # Format messages
            content_parts = [f"# Slack Channel: #{channel_name}\n"]

            messages = messages_data.get("messages", [])
            # Reverse to show oldest first
            messages.reverse()

            for msg in messages:
                # Skip non-user messages
                if msg.get("subtype") in ["channel_join", "channel_leave", "bot_message"]:
                    continue

                user_id = msg.get("user", "unknown")
                user_name = await get_user_name(user_id)

                # Parse timestamp
                ts = float(msg.get("ts", 0))
                dt = datetime.fromtimestamp(ts)
                time_str = dt.strftime("%Y-%m-%d %H:%M")

                text = msg.get("text", "")
                # Clean up Slack formatting
                text = self._clean_slack_text(text)

                content_parts.append(f"**{user_name}** ({time_str}):\n{text}\n")

            content = "\n".join(content_parts)

            # Create filename
            safe_name = re.sub(r'[^\w\s-]', '', channel_name)[:50]
            filename = f"slack_{safe_name}.md"

            return content, filename, "text/markdown"

    def _clean_slack_text(self, text: str) -> str:
        """Clean up Slack message formatting."""
        # Convert user mentions <@U123> to @user
        text = re.sub(r'<@(\w+)>', r'@\1', text)

        # Convert channel mentions <#C123|channel-name> to #channel-name
        text = re.sub(r'<#\w+\|([^>]+)>', r'#\1', text)

        # Convert URLs <http://url|display> to just url
        text = re.sub(r'<(https?://[^|>]+)\|?[^>]*>', r'\1', text)

        # Convert bold *text* (already markdown compatible)
        # Convert italic _text_ (already markdown compatible)
        # Convert strikethrough ~text~ to ~~text~~
        text = re.sub(r'~([^~]+)~', r'~~\1~~', text)

        return text
