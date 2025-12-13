"""Notion OAuth integration."""
import httpx
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlencode
from datetime import datetime
import re

from .base import BaseIntegration
from ...schemas.integrations import BrowseItem, BrowseResponse, BrowseItemType
from ...core.config import settings


class NotionIntegration(BaseIntegration):
    """Notion integration using OAuth2."""

    provider = "notion"
    display_name = "Notion"
    scopes = []  # Notion doesn't use scopes in the same way

    NOTION_API_VERSION = "2022-06-28"

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate Notion OAuth authorization URL."""
        params = {
            "client_id": settings.NOTION_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "owner": "user",
            "state": state,
        }
        return f"https://api.notion.com/v1/oauth/authorize?{urlencode(params)}"

    async def exchange_code(
        self, code: str, redirect_uri: str
    ) -> Tuple[str, Optional[str], Optional[int], Dict[str, Any]]:
        """Exchange authorization code for tokens."""
        import base64

        # Notion uses Basic auth for token exchange
        credentials = base64.b64encode(
            f"{settings.NOTION_CLIENT_ID}:{settings.NOTION_CLIENT_SECRET}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.notion.com/v1/oauth/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/json",
                    "Notion-Version": self.NOTION_API_VERSION,
                },
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
            response.raise_for_status()
            data = response.json()

            # Notion returns workspace info, not user email directly
            workspace_name = data.get("workspace_name", "Unknown Workspace")
            owner = data.get("owner", {})
            user_email = None
            if owner.get("type") == "user":
                user_email = owner.get("user", {}).get("person", {}).get("email")

            return (
                data["access_token"],
                None,  # Notion doesn't use refresh tokens for public integrations
                None,  # No expiry
                {
                    "workspace_name": workspace_name,
                    "workspace_id": data.get("workspace_id"),
                    "email": user_email,
                },
            )

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, Optional[int]]:
        """Notion tokens don't expire for public integrations."""
        raise NotImplementedError("Notion tokens don't need refreshing")

    async def browse(
        self,
        access_token: str,
        folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        query: Optional[str] = None,
    ) -> BrowseResponse:
        """Browse Notion pages and databases."""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Notion-Version": self.NOTION_API_VERSION,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            if query:
                # Search for pages
                body = {
                    "query": query,
                    "filter": {"value": "page", "property": "object"},
                    "page_size": 50,
                }
                if page_token:
                    body["start_cursor"] = page_token

                response = await client.post(
                    "https://api.notion.com/v1/search",
                    headers=headers,
                    json=body,
                )
            elif folder_id:
                # Get children of a page/database
                params = {"page_size": 50}
                if page_token:
                    params["start_cursor"] = page_token

                # Try as database first
                response = await client.post(
                    f"https://api.notion.com/v1/databases/{folder_id}/query",
                    headers=headers,
                    json=params,
                )

                if response.status_code == 404:
                    # Try as page with children
                    response = await client.get(
                        f"https://api.notion.com/v1/blocks/{folder_id}/children",
                        headers=headers,
                        params=params,
                    )
            else:
                # Search all pages (no query = list all)
                body = {
                    "page_size": 50,
                }
                if page_token:
                    body["start_cursor"] = page_token

                response = await client.post(
                    "https://api.notion.com/v1/search",
                    headers=headers,
                    json=body,
                )

            response.raise_for_status()
            data = response.json()

            items = []
            results = data.get("results", [])

            for item in results:
                obj_type = item.get("object")

                if obj_type == "page":
                    # Extract title from page properties
                    title = self._get_page_title(item)
                    items.append(
                        BrowseItem(
                            id=item["id"],
                            name=title,
                            type=BrowseItemType.PAGE,
                            modified_at=datetime.fromisoformat(
                                item["last_edited_time"].replace("Z", "+00:00")
                            ) if item.get("last_edited_time") else None,
                            url=item.get("url"),
                            has_children=item.get("has_children", False),
                        )
                    )
                elif obj_type == "database":
                    title = self._get_database_title(item)
                    items.append(
                        BrowseItem(
                            id=item["id"],
                            name=title,
                            type=BrowseItemType.DATABASE,
                            modified_at=datetime.fromisoformat(
                                item["last_edited_time"].replace("Z", "+00:00")
                            ) if item.get("last_edited_time") else None,
                            url=item.get("url"),
                            has_children=True,
                        )
                    )

            return BrowseResponse(
                items=items,
                next_page_token=data.get("next_cursor"),
                parent_id=folder_id,
            )

    def _get_page_title(self, page: Dict) -> str:
        """Extract title from a Notion page."""
        props = page.get("properties", {})

        # Try common title property names
        for key in ["title", "Title", "Name", "name"]:
            if key in props:
                title_prop = props[key]
                if title_prop.get("type") == "title":
                    title_array = title_prop.get("title", [])
                    if title_array:
                        return "".join(t.get("plain_text", "") for t in title_array)

        # Fallback: check all properties for title type
        for prop in props.values():
            if prop.get("type") == "title":
                title_array = prop.get("title", [])
                if title_array:
                    return "".join(t.get("plain_text", "") for t in title_array)

        return "Untitled"

    def _get_database_title(self, db: Dict) -> str:
        """Extract title from a Notion database."""
        title_array = db.get("title", [])
        if title_array:
            return "".join(t.get("plain_text", "") for t in title_array)
        return "Untitled Database"

    async def fetch_content(self, access_token: str, item_id: str) -> Tuple[str, str, str]:
        """Fetch content of a Notion page as markdown."""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Notion-Version": self.NOTION_API_VERSION,
        }

        async with httpx.AsyncClient() as client:
            # Get page info
            page_response = await client.get(
                f"https://api.notion.com/v1/pages/{item_id}",
                headers=headers,
            )
            page_response.raise_for_status()
            page = page_response.json()

            title = self._get_page_title(page)

            # Get page content (blocks)
            content = await self._get_blocks_content(client, headers, item_id)

            # Create filename
            safe_title = re.sub(r'[^\w\s-]', '', title)[:50]
            filename = f"notion_{safe_title}.md"

            # Format as markdown
            markdown = f"# {title}\n\n{content}"

            return markdown, filename, "text/markdown"

    async def _get_blocks_content(
        self, client: httpx.AsyncClient, headers: Dict, block_id: str, depth: int = 0
    ) -> str:
        """Recursively get content from Notion blocks."""
        if depth > 3:  # Limit recursion depth
            return ""

        content_parts = []
        next_cursor = None

        while True:
            params = {"page_size": 100}
            if next_cursor:
                params["start_cursor"] = next_cursor

            response = await client.get(
                f"https://api.notion.com/v1/blocks/{block_id}/children",
                headers=headers,
                params=params,
            )

            if response.status_code != 200:
                break

            data = response.json()

            for block in data.get("results", []):
                block_content = self._block_to_markdown(block)
                if block_content:
                    content_parts.append(block_content)

                # Get children if they exist
                if block.get("has_children"):
                    child_content = await self._get_blocks_content(
                        client, headers, block["id"], depth + 1
                    )
                    if child_content:
                        content_parts.append(child_content)

            next_cursor = data.get("next_cursor")
            if not next_cursor:
                break

        return "\n".join(content_parts)

    def _block_to_markdown(self, block: Dict) -> str:
        """Convert a Notion block to markdown."""
        block_type = block.get("type")

        if not block_type or block_type not in block:
            return ""

        block_data = block[block_type]

        # Extract rich text
        def get_text(rich_text_array):
            return "".join(rt.get("plain_text", "") for rt in rich_text_array)

        if block_type == "paragraph":
            text = get_text(block_data.get("rich_text", []))
            return text + "\n" if text else ""

        elif block_type in ["heading_1", "heading_2", "heading_3"]:
            level = int(block_type[-1])
            text = get_text(block_data.get("rich_text", []))
            return f"{'#' * level} {text}\n" if text else ""

        elif block_type == "bulleted_list_item":
            text = get_text(block_data.get("rich_text", []))
            return f"- {text}\n" if text else ""

        elif block_type == "numbered_list_item":
            text = get_text(block_data.get("rich_text", []))
            return f"1. {text}\n" if text else ""

        elif block_type == "to_do":
            text = get_text(block_data.get("rich_text", []))
            checked = "x" if block_data.get("checked") else " "
            return f"- [{checked}] {text}\n" if text else ""

        elif block_type == "toggle":
            text = get_text(block_data.get("rich_text", []))
            return f"<details><summary>{text}</summary>\n" if text else ""

        elif block_type == "code":
            text = get_text(block_data.get("rich_text", []))
            lang = block_data.get("language", "")
            return f"```{lang}\n{text}\n```\n" if text else ""

        elif block_type == "quote":
            text = get_text(block_data.get("rich_text", []))
            return f"> {text}\n" if text else ""

        elif block_type == "divider":
            return "---\n"

        elif block_type == "callout":
            text = get_text(block_data.get("rich_text", []))
            emoji = block_data.get("icon", {}).get("emoji", "")
            return f"> {emoji} {text}\n" if text else ""

        return ""
