"""Base class for OAuth integrations."""
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
from ...schemas.integrations import BrowseItem, BrowseResponse


class BaseIntegration(ABC):
    """Abstract base class for OAuth integrations."""

    provider: str = ""
    display_name: str = ""
    scopes: List[str] = []

    @abstractmethod
    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate OAuth authorization URL.

        Args:
            state: State parameter containing bot_id and user_id
            redirect_uri: Callback URL after authorization

        Returns:
            Authorization URL to redirect user to
        """
        pass

    @abstractmethod
    async def exchange_code(
        self, code: str, redirect_uri: str
    ) -> Tuple[str, Optional[str], Optional[int], Dict[str, Any]]:
        """Exchange authorization code for tokens.

        Args:
            code: Authorization code from OAuth callback
            redirect_uri: Same redirect URI used in auth URL

        Returns:
            Tuple of (access_token, refresh_token, expires_in_seconds, user_info)
        """
        pass

    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, Optional[int]]:
        """Refresh an expired access token.

        Args:
            refresh_token: The refresh token

        Returns:
            Tuple of (new_access_token, expires_in_seconds)
        """
        pass

    @abstractmethod
    async def browse(
        self,
        access_token: str,
        folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        query: Optional[str] = None,
    ) -> BrowseResponse:
        """Browse files/pages/channels in the connected service.

        Args:
            access_token: Valid access token
            folder_id: Optional folder/parent ID to browse
            page_token: Pagination token
            query: Optional search query

        Returns:
            BrowseResponse with items and pagination info
        """
        pass

    @abstractmethod
    async def fetch_content(self, access_token: str, item_id: str) -> Tuple[str, str, str]:
        """Fetch content of a specific item.

        Args:
            access_token: Valid access token
            item_id: ID of the item to fetch

        Returns:
            Tuple of (content_text, filename, mime_type)
        """
        pass

    async def test_connection(self, access_token: str) -> bool:
        """Test if the connection is still valid.

        Args:
            access_token: Access token to test

        Returns:
            True if connection is valid
        """
        try:
            await self.browse(access_token)
            return True
        except Exception:
            return False
