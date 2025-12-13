"""Gmail OAuth integration."""
import httpx
import base64
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlencode
from datetime import datetime
from email.utils import parsedate_to_datetime
import re

from .base import BaseIntegration
from ...schemas.integrations import BrowseItem, BrowseResponse, BrowseItemType
from ...core.config import settings


class GmailIntegration(BaseIntegration):
    """Gmail integration using OAuth2."""

    provider = "gmail"
    display_name = "Gmail"
    scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
    ]

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate Google OAuth authorization URL for Gmail."""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    async def exchange_code(
        self, code: str, redirect_uri: str
    ) -> Tuple[str, Optional[str], Optional[int], Dict[str, Any]]:
        """Exchange authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            token_response.raise_for_status()
            tokens = token_response.json()

            # Get user info
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            user_response.raise_for_status()
            user_info = user_response.json()

            return (
                tokens["access_token"],
                tokens.get("refresh_token"),
                tokens.get("expires_in"),
                {"email": user_info.get("email"), "id": user_info.get("id")},
            )

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, Optional[int]]:
        """Refresh an expired access token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            tokens = response.json()
            return tokens["access_token"], tokens.get("expires_in")

    async def browse(
        self,
        access_token: str,
        folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        query: Optional[str] = None,
    ) -> BrowseResponse:
        """Browse Gmail labels or emails."""
        async with httpx.AsyncClient() as client:
            # If no folder_id, show labels
            if not folder_id:
                response = await client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/labels",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                response.raise_for_status()
                data = response.json()

                items = []
                # Show common labels
                priority_labels = ["INBOX", "SENT", "IMPORTANT", "STARRED"]
                labels = data.get("labels", [])

                # Sort: priority labels first, then user labels
                for label in sorted(
                    labels,
                    key=lambda x: (
                        0 if x["id"] in priority_labels else 1,
                        priority_labels.index(x["id"]) if x["id"] in priority_labels else 999,
                        x.get("name", ""),
                    ),
                ):
                    # Skip system labels we don't want to show
                    if label["id"] in ["SPAM", "TRASH", "DRAFT", "UNREAD", "CATEGORY_PERSONAL",
                                       "CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES",
                                       "CATEGORY_FORUMS"]:
                        continue

                    items.append(
                        BrowseItem(
                            id=label["id"],
                            name=label.get("name", label["id"]),
                            type=BrowseItemType.LABEL,
                            has_children=True,
                        )
                    )

                return BrowseResponse(items=items)

            # If folder_id is a label, show emails in that label
            params = {
                "labelIds": folder_id,
                "maxResults": 50,
            }
            if page_token:
                params["pageToken"] = page_token
            if query:
                params["q"] = query

            response = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            response.raise_for_status()
            data = response.json()

            items = []
            for msg in data.get("messages", []):
                # Get message details
                msg_response = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                )
                if msg_response.status_code != 200:
                    continue

                msg_data = msg_response.json()
                headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}

                # Parse date
                date = None
                if headers.get("Date"):
                    try:
                        date = parsedate_to_datetime(headers["Date"])
                    except Exception:
                        pass

                items.append(
                    BrowseItem(
                        id=msg["id"],
                        name=headers.get("Subject", "(No Subject)"),
                        type=BrowseItemType.EMAIL,
                        subject=headers.get("Subject", "(No Subject)"),
                        sender=headers.get("From", "Unknown"),
                        date=date,
                        snippet=msg_data.get("snippet", ""),
                    )
                )

            # Get label name
            label_name = folder_id
            try:
                label_response = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/labels/{folder_id}",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if label_response.status_code == 200:
                    label_name = label_response.json().get("name", folder_id)
            except Exception:
                pass

            return BrowseResponse(
                items=items,
                next_page_token=data.get("nextPageToken"),
                parent_id=folder_id,
                parent_name=label_name,
            )

    async def fetch_content(self, access_token: str, item_id: str) -> Tuple[str, str, str]:
        """Fetch content of a Gmail message."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{item_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"format": "full"},
            )
            response.raise_for_status()
            data = response.json()

            # Extract headers
            headers = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}
            subject = headers.get("Subject", "(No Subject)")
            sender = headers.get("From", "Unknown")
            date = headers.get("Date", "")

            # Extract body
            body = self._extract_body(data.get("payload", {}))

            # Format as readable text
            content = f"""Subject: {subject}
From: {sender}
Date: {date}

{body}
"""
            # Create filename from subject
            safe_subject = re.sub(r'[^\w\s-]', '', subject)[:50]
            filename = f"email_{safe_subject}.txt"

            return content, filename, "text/plain"

    def _extract_body(self, payload: Dict) -> str:
        """Extract text body from email payload."""
        body_text = ""

        # Check for body data directly
        if payload.get("body", {}).get("data"):
            try:
                body_text = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8")
            except Exception:
                pass

        # Check parts recursively
        for part in payload.get("parts", []):
            mime_type = part.get("mimeType", "")

            if mime_type == "text/plain" and part.get("body", {}).get("data"):
                try:
                    body_text = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")
                    break  # Prefer plain text
                except Exception:
                    pass
            elif mime_type == "text/html" and not body_text and part.get("body", {}).get("data"):
                try:
                    html = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")
                    # Simple HTML to text conversion
                    body_text = self._html_to_text(html)
                except Exception:
                    pass
            elif "multipart" in mime_type:
                # Recurse into multipart
                body_text = self._extract_body(part)
                if body_text:
                    break

        return body_text.strip()

    def _html_to_text(self, html: str) -> str:
        """Simple HTML to text conversion."""
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        # Remove script and style elements
        for element in soup(["script", "style"]):
            element.decompose()

        # Get text
        text = soup.get_text(separator="\n")

        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines()]
        return "\n".join(line for line in lines if line)
