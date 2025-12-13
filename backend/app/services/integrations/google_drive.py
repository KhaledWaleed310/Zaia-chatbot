"""Google Drive OAuth integration."""
import httpx
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlencode
from datetime import datetime

from .base import BaseIntegration
from ...schemas.integrations import BrowseItem, BrowseResponse, BrowseItemType
from ...core.config import settings


class GoogleDriveIntegration(BaseIntegration):
    """Google Drive integration using OAuth2."""

    provider = "google_drive"
    display_name = "Google Drive"
    scopes = [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
    ]

    # Supported export formats for Google Workspace files
    EXPORT_FORMATS = {
        "application/vnd.google-apps.document": "text/plain",
        "application/vnd.google-apps.spreadsheet": "text/csv",
        "application/vnd.google-apps.presentation": "text/plain",
    }

    # File types we can process
    SUPPORTED_MIME_TYPES = [
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.google-apps.document",
        "application/vnd.google-apps.spreadsheet",
        "application/vnd.google-apps.presentation",
        "application/vnd.google-apps.folder",
    ]

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate Google OAuth authorization URL."""
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
        """Browse files and folders in Google Drive."""
        # Build query
        q_parts = ["trashed = false"]

        if folder_id:
            q_parts.append(f"'{folder_id}' in parents")
        else:
            q_parts.append("'root' in parents")

        if query:
            q_parts.append(f"name contains '{query}'")

        # Filter to supported file types
        mime_filters = " or ".join(
            [f"mimeType = '{mt}'" for mt in self.SUPPORTED_MIME_TYPES]
        )
        q_parts.append(f"({mime_filters})")

        params = {
            "q": " and ".join(q_parts),
            "fields": "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents)",
            "pageSize": 50,
            "orderBy": "folder,name",
        }

        if page_token:
            params["pageToken"] = page_token

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            response.raise_for_status()
            data = response.json()

            items = []
            for file in data.get("files", []):
                is_folder = file["mimeType"] == "application/vnd.google-apps.folder"
                items.append(
                    BrowseItem(
                        id=file["id"],
                        name=file["name"],
                        type=BrowseItemType.FOLDER if is_folder else BrowseItemType.FILE,
                        mime_type=file.get("mimeType"),
                        size=int(file.get("size", 0)) if file.get("size") else None,
                        modified_at=datetime.fromisoformat(
                            file["modifiedTime"].replace("Z", "+00:00")
                        ) if file.get("modifiedTime") else None,
                        url=file.get("webViewLink"),
                        has_children=is_folder,
                        parent_id=file.get("parents", [None])[0],
                    )
                )

            # Get parent folder name if browsing a subfolder
            parent_name = None
            if folder_id:
                try:
                    folder_response = await client.get(
                        f"https://www.googleapis.com/drive/v3/files/{folder_id}",
                        headers={"Authorization": f"Bearer {access_token}"},
                        params={"fields": "name"},
                    )
                    if folder_response.status_code == 200:
                        parent_name = folder_response.json().get("name")
                except Exception:
                    pass

            return BrowseResponse(
                items=items,
                next_page_token=data.get("nextPageToken"),
                parent_id=folder_id,
                parent_name=parent_name,
            )

    async def fetch_content(self, access_token: str, item_id: str) -> Tuple[str, str, str]:
        """Fetch content of a Google Drive file."""
        async with httpx.AsyncClient() as client:
            # Get file metadata
            meta_response = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{item_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "id,name,mimeType,size"},
            )
            meta_response.raise_for_status()
            metadata = meta_response.json()

            mime_type = metadata["mimeType"]
            filename = metadata["name"]

            # Handle Google Workspace files (export as text)
            if mime_type in self.EXPORT_FORMATS:
                export_mime = self.EXPORT_FORMATS[mime_type]
                content_response = await client.get(
                    f"https://www.googleapis.com/drive/v3/files/{item_id}/export",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"mimeType": export_mime},
                )
                content_response.raise_for_status()
                content = content_response.text
                return content, filename, export_mime

            # Handle regular files (download)
            content_response = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{item_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"alt": "media"},
            )
            content_response.raise_for_status()

            # For text files, return content directly
            if mime_type.startswith("text/"):
                return content_response.text, filename, mime_type

            # For binary files (PDF, DOCX), return bytes as base64
            # The ingestion service will handle parsing
            import base64
            content_b64 = base64.b64encode(content_response.content).decode()
            return content_b64, filename, mime_type
