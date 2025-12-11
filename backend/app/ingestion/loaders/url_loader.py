"""
Web content loader using httpx and trafilatura.

Scrapes and extracts clean text from web pages, removing navigation, ads, and boilerplate.
"""

import logging
from typing import Dict, Any, Tuple, Optional
from datetime import datetime
import asyncio

try:
    import httpx
except ImportError:
    raise ImportError(
        "URL loading requires httpx. Install with: pip install httpx"
    )

try:
    import trafilatura
except ImportError:
    raise ImportError(
        "URL loading requires trafilatura. Install with: pip install trafilatura"
    )

logger = logging.getLogger(__name__)


class URLLoader:
    """
    Loader for web content from URLs.

    Uses httpx for HTTP requests and trafilatura for intelligent content extraction,
    removing navigation, ads, and other boilerplate to extract the main content.
    """

    def __init__(
        self,
        timeout: int = 30,
        max_redirects: int = 10,
        user_agent: Optional[str] = None,
    ):
        """
        Initialize URL loader.

        Args:
            timeout: Request timeout in seconds
            max_redirects: Maximum number of redirects to follow
            user_agent: Custom user agent string
        """
        self.timeout = timeout
        self.max_redirects = max_redirects
        self.user_agent = user_agent or (
            "Mozilla/5.0 (compatible; ZAIA-Bot/1.0; +https://zaia.ai/bot)"
        )

    async def load(self, url: str) -> Tuple[str, Dict[str, Any]]:
        """
        Load and extract text from a URL.

        Args:
            url: URL to scrape

        Returns:
            Tuple of (extracted_text, metadata)

        Raises:
            httpx.HTTPError: If request fails
            ValueError: If no content could be extracted
        """
        try:
            logger.info(f"Loading URL: {url}")

            # Fetch the page content
            html, response_metadata = await self._fetch_url(url)

            # Extract main content using trafilatura
            text, extraction_metadata = await asyncio.to_thread(
                self._extract_content, html, url
            )

            # Combine metadata
            metadata = {
                **response_metadata,
                **extraction_metadata,
                "source_url": url,
                "source_type": "url",
            }

            logger.info(
                f"Loaded URL: {len(text)} characters extracted from {url}"
            )

            return text, metadata

        except Exception as e:
            logger.error(f"Failed to load URL {url}: {e}")
            raise

    async def _fetch_url(self, url: str) -> Tuple[str, Dict[str, Any]]:
        """
        Fetch HTML content from URL.

        Args:
            url: URL to fetch

        Returns:
            Tuple of (html_content, metadata)
        """
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                max_redirects=self.max_redirects,
                headers={"User-Agent": self.user_agent},
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

                metadata = {
                    "status_code": response.status_code,
                    "content_type": response.headers.get("content-type", ""),
                    "final_url": str(response.url),
                    "fetched_at": datetime.utcnow().isoformat(),
                }

                # Check if redirected
                if str(response.url) != url:
                    metadata["redirected"] = True
                    metadata["original_url"] = url

                return response.text, metadata

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            raise

    def _extract_content(self, html: str, url: str) -> Tuple[str, Dict[str, Any]]:
        """
        Extract main content from HTML using trafilatura.

        Args:
            html: HTML content
            url: Source URL for context

        Returns:
            Tuple of (extracted_text, metadata)
        """
        try:
            # Extract main content with metadata
            metadata_dict = {}

            # Use trafilatura to extract clean text
            extracted = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=True,
                include_images=False,
                output_format="txt",
                url=url,
                with_metadata=True,
            )

            if not extracted:
                # Fallback: try bare extraction without metadata
                extracted = trafilatura.extract(
                    html,
                    include_comments=False,
                    include_tables=True,
                    output_format="txt",
                )

            if not extracted or not extracted.strip():
                raise ValueError(f"Could not extract content from {url}")

            # Try to extract metadata separately
            try:
                metadata_obj = trafilatura.metadata.extract_metadata(html, url=url)
                if metadata_obj:
                    metadata_dict = {
                        "title": metadata_obj.title or "",
                        "author": metadata_obj.author or "",
                        "description": metadata_obj.description or "",
                        "sitename": metadata_obj.sitename or "",
                        "date": metadata_obj.date or "",
                        "categories": metadata_obj.categories or [],
                        "tags": metadata_obj.tags or [],
                        "language": metadata_obj.language or "",
                    }
            except Exception as e:
                logger.debug(f"Could not extract metadata: {e}")

            metadata_dict["char_count"] = len(extracted)
            metadata_dict["extraction_method"] = "trafilatura"

            return extracted, metadata_dict

        except Exception as e:
            logger.error(f"Error extracting content: {e}")
            raise

    async def load_with_links(self, url: str) -> Tuple[str, Dict[str, Any], list]:
        """
        Load URL and extract links in addition to content.

        Args:
            url: URL to scrape

        Returns:
            Tuple of (text, metadata, links)
        """
        try:
            # Fetch HTML
            html, response_metadata = await self._fetch_url(url)

            # Extract content and links
            result = await asyncio.to_thread(
                self._extract_with_links, html, url
            )

            text, extraction_metadata, links = result

            metadata = {
                **response_metadata,
                **extraction_metadata,
                "source_url": url,
                "source_type": "url",
                "link_count": len(links),
            }

            return text, metadata, links

        except Exception as e:
            logger.error(f"Failed to load URL with links {url}: {e}")
            raise

    def _extract_with_links(
        self, html: str, url: str
    ) -> Tuple[str, Dict[str, Any], list]:
        """
        Extract content and links from HTML.

        Args:
            html: HTML content
            url: Source URL

        Returns:
            Tuple of (text, metadata, links)
        """
        try:
            # Extract main content
            text, metadata = self._extract_content(html, url)

            # Extract links
            links = []
            try:
                from trafilatura import extract_links

                # This is a simplified version - trafilatura doesn't have built-in link extraction
                # You might want to use BeautifulSoup for more sophisticated link extraction
                try:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(html, "html.parser")

                    for link in soup.find_all("a", href=True):
                        href = link["href"]
                        text_content = link.get_text(strip=True)

                        # Convert relative URLs to absolute
                        if href.startswith("/"):
                            from urllib.parse import urljoin
                            href = urljoin(url, href)

                        if href.startswith("http"):
                            links.append({
                                "url": href,
                                "text": text_content,
                            })

                except ImportError:
                    logger.debug("BeautifulSoup not available for link extraction")

            except Exception as e:
                logger.debug(f"Could not extract links: {e}")

            return text, metadata, links

        except Exception as e:
            logger.error(f"Error extracting with links: {e}")
            raise

    async def load_batch(self, urls: list[str]) -> list[Tuple[str, Dict[str, Any]]]:
        """
        Load multiple URLs concurrently.

        Args:
            urls: List of URLs to load

        Returns:
            List of (text, metadata) tuples
        """
        try:
            logger.info(f"Loading {len(urls)} URLs in batch")

            tasks = [self.load(url) for url in urls]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Filter out failed loads
            successful_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to load {urls[i]}: {result}")
                else:
                    successful_results.append(result)

            logger.info(
                f"Loaded {len(successful_results)}/{len(urls)} URLs successfully"
            )

            return successful_results

        except Exception as e:
            logger.error(f"Error in batch URL loading: {e}")
            raise
