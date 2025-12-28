"""
Link checker service for scanning broken links on web pages.
Supports both internal and external link validation.
"""
import httpx
import asyncio
from typing import Dict, Any, List, Optional, Set
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from datetime import datetime
import re


class LinkChecker:
    """Async link checker for scanning broken links."""

    def __init__(
        self,
        timeout: float = 10.0,
        max_concurrent: int = 10,
        follow_redirects: bool = True,
        check_external: bool = True
    ):
        self.timeout = timeout
        self.max_concurrent = max_concurrent
        self.follow_redirects = follow_redirects
        self.check_external = check_external
        self.checked_urls: Set[str] = set()
        self.results: Dict[str, Dict] = {}

    async def check_url(
        self,
        url: str,
        client: httpx.AsyncClient,
        source_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check a single URL for accessibility.
        """
        if url in self.checked_urls:
            return self.results.get(url, {"status": "skipped", "reason": "already_checked"})

        self.checked_urls.add(url)

        result = {
            "url": url,
            "source_url": source_url,
            "status": "unknown",
            "status_code": None,
            "redirect_url": None,
            "error": None,
            "response_time_ms": None
        }

        try:
            start_time = asyncio.get_event_loop().time()
            response = await client.head(
                url,
                follow_redirects=self.follow_redirects,
                timeout=self.timeout
            )
            end_time = asyncio.get_event_loop().time()

            result["status_code"] = response.status_code
            result["response_time_ms"] = int((end_time - start_time) * 1000)

            if response.status_code == 405:
                # HEAD not allowed, try GET
                response = await client.get(
                    url,
                    follow_redirects=self.follow_redirects,
                    timeout=self.timeout
                )
                result["status_code"] = response.status_code

            if response.status_code >= 200 and response.status_code < 300:
                result["status"] = "ok"
            elif response.status_code >= 300 and response.status_code < 400:
                result["status"] = "redirect"
                result["redirect_url"] = str(response.headers.get("location", ""))
            elif response.status_code == 404:
                result["status"] = "broken"
                result["error"] = "Page not found (404)"
            elif response.status_code >= 400 and response.status_code < 500:
                result["status"] = "client_error"
                result["error"] = f"Client error ({response.status_code})"
            elif response.status_code >= 500:
                result["status"] = "server_error"
                result["error"] = f"Server error ({response.status_code})"

        except httpx.TimeoutException:
            result["status"] = "timeout"
            result["error"] = "Request timed out"
        except httpx.ConnectError:
            result["status"] = "connection_error"
            result["error"] = "Could not connect to server"
        except httpx.TooManyRedirects:
            result["status"] = "too_many_redirects"
            result["error"] = "Too many redirects"
        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)[:200]

        self.results[url] = result
        return result

    async def extract_links(
        self,
        url: str,
        client: httpx.AsyncClient
    ) -> List[Dict[str, str]]:
        """
        Extract all links from a page.
        """
        links = []

        try:
            response = await client.get(url, timeout=self.timeout)
            if response.status_code != 200:
                return links

            soup = BeautifulSoup(response.text, "html.parser")
            base_url = url

            # Check for base tag
            base_tag = soup.find("base", href=True)
            if base_tag:
                base_url = base_tag["href"]

            # Extract anchor links
            for anchor in soup.find_all("a", href=True):
                href = anchor["href"].strip()
                if href and not href.startswith(("#", "javascript:", "mailto:", "tel:")):
                    absolute_url = urljoin(base_url, href)
                    links.append({
                        "url": absolute_url,
                        "text": anchor.get_text(strip=True)[:100] or "[No text]",
                        "type": "anchor"
                    })

            # Extract image sources
            for img in soup.find_all("img", src=True):
                src = img["src"].strip()
                if src and not src.startswith("data:"):
                    absolute_url = urljoin(base_url, src)
                    links.append({
                        "url": absolute_url,
                        "text": img.get("alt", "[Image]")[:100],
                        "type": "image"
                    })

            # Extract script sources
            for script in soup.find_all("script", src=True):
                src = script["src"].strip()
                absolute_url = urljoin(base_url, src)
                links.append({
                    "url": absolute_url,
                    "text": "[Script]",
                    "type": "script"
                })

            # Extract stylesheet links
            for link in soup.find_all("link", href=True):
                if link.get("rel") == ["stylesheet"] or "stylesheet" in link.get("rel", []):
                    href = link["href"].strip()
                    absolute_url = urljoin(base_url, href)
                    links.append({
                        "url": absolute_url,
                        "text": "[Stylesheet]",
                        "type": "stylesheet"
                    })

        except Exception as e:
            pass  # Silently fail link extraction

        return links

    def is_internal_link(self, url: str, base_domain: str) -> bool:
        """Check if a URL is internal to the base domain."""
        try:
            parsed = urlparse(url)
            return parsed.netloc == base_domain or parsed.netloc == ""
        except:
            return False


async def scan_page_links(
    url: str,
    check_external: bool = True,
    max_links: int = 100
) -> Dict[str, Any]:
    """
    Scan a single page for broken links.

    Args:
        url: The page URL to scan
        check_external: Whether to check external links
        max_links: Maximum number of links to check

    Returns:
        Scan results with broken and valid links
    """
    checker = LinkChecker(check_external=check_external)
    parsed_base = urlparse(url)
    base_domain = parsed_base.netloc

    results = {
        "url": url,
        "scanned_at": datetime.utcnow().isoformat(),
        "total_links": 0,
        "internal_links": [],
        "external_links": [],
        "broken_links": [],
        "redirects": [],
        "errors": [],
        "summary": {
            "total": 0,
            "ok": 0,
            "broken": 0,
            "redirects": 0,
            "errors": 0,
            "internal": 0,
            "external": 0
        }
    }

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; SEOBot/1.0)"}
        ) as client:
            # Extract links from page
            links = await checker.extract_links(url, client)
            results["total_links"] = len(links)

            # Limit links to check
            links = links[:max_links]

            # Separate internal and external links
            internal_links = []
            external_links = []

            for link in links:
                if checker.is_internal_link(link["url"], base_domain):
                    internal_links.append(link)
                else:
                    external_links.append(link)

            results["summary"]["internal"] = len(internal_links)
            results["summary"]["external"] = len(external_links)

            # Create semaphore for concurrent checks
            semaphore = asyncio.Semaphore(checker.max_concurrent)

            async def check_with_semaphore(link: Dict) -> Dict:
                async with semaphore:
                    result = await checker.check_url(link["url"], client, url)
                    result["link_text"] = link.get("text", "")
                    result["link_type"] = link.get("type", "anchor")
                    return result

            # Check all links concurrently
            all_links = internal_links + (external_links if check_external else [])
            tasks = [check_with_semaphore(link) for link in all_links]
            link_results = await asyncio.gather(*tasks)

            # Categorize results
            for result in link_results:
                is_internal = checker.is_internal_link(result["url"], base_domain)
                link_info = {
                    "url": result["url"],
                    "text": result.get("link_text", ""),
                    "type": result.get("link_type", "anchor"),
                    "status_code": result.get("status_code"),
                    "response_time_ms": result.get("response_time_ms"),
                    "is_internal": is_internal
                }

                if result["status"] == "ok":
                    results["summary"]["ok"] += 1
                    if is_internal:
                        results["internal_links"].append(link_info)
                    else:
                        results["external_links"].append(link_info)
                elif result["status"] in ["broken", "client_error", "server_error"]:
                    results["summary"]["broken"] += 1
                    link_info["error"] = result.get("error", "")
                    results["broken_links"].append(link_info)
                elif result["status"] == "redirect":
                    results["summary"]["redirects"] += 1
                    link_info["redirect_url"] = result.get("redirect_url", "")
                    results["redirects"].append(link_info)
                else:
                    results["summary"]["errors"] += 1
                    link_info["error"] = result.get("error", "")
                    results["errors"].append(link_info)

            results["summary"]["total"] = len(link_results)

    except Exception as e:
        results["error"] = str(e)

    return results


async def check_single_link(url: str) -> Dict[str, Any]:
    """
    Check a single URL for accessibility.
    """
    checker = LinkChecker()

    async with httpx.AsyncClient(
        follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 (compatible; SEOBot/1.0)"}
    ) as client:
        result = await checker.check_url(url, client)

    return result


async def check_ssl_certificate(url: str) -> Dict[str, Any]:
    """
    Check SSL certificate status for a URL.
    """
    import ssl
    import socket
    from datetime import datetime

    result = {
        "url": url,
        "checked_at": datetime.utcnow().isoformat(),
        "has_ssl": False,
        "valid": False,
        "issuer": None,
        "subject": None,
        "expires": None,
        "days_until_expiry": None,
        "protocol": None,
        "errors": []
    }

    try:
        parsed = urlparse(url)
        hostname = parsed.netloc or parsed.path.split("/")[0]

        # Remove port if present
        if ":" in hostname:
            hostname = hostname.split(":")[0]

        context = ssl.create_default_context()
        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED

        with socket.create_connection((hostname, 443), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                result["has_ssl"] = True
                result["valid"] = True
                result["protocol"] = ssock.version()

                # Parse certificate details
                if cert:
                    # Issuer
                    issuer = dict(x[0] for x in cert.get("issuer", []))
                    result["issuer"] = issuer.get("organizationName", issuer.get("commonName", "Unknown"))

                    # Subject
                    subject = dict(x[0] for x in cert.get("subject", []))
                    result["subject"] = subject.get("commonName", "Unknown")

                    # Expiry
                    not_after = cert.get("notAfter")
                    if not_after:
                        # Parse SSL date format: 'Dec 25 23:59:59 2024 GMT'
                        expiry_date = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                        result["expires"] = expiry_date.isoformat()
                        result["days_until_expiry"] = (expiry_date - datetime.utcnow()).days

                        # Check if expired
                        if result["days_until_expiry"] < 0:
                            result["valid"] = False
                            result["errors"].append("Certificate has expired")
                        elif result["days_until_expiry"] < 30:
                            result["errors"].append(f"Certificate expires in {result['days_until_expiry']} days")

    except ssl.SSLCertVerificationError as e:
        result["has_ssl"] = True
        result["valid"] = False
        result["errors"].append(f"SSL verification failed: {str(e)[:100]}")
    except ssl.SSLError as e:
        result["errors"].append(f"SSL error: {str(e)[:100]}")
    except socket.gaierror:
        result["errors"].append("Could not resolve hostname")
    except socket.timeout:
        result["errors"].append("Connection timed out")
    except ConnectionRefusedError:
        result["errors"].append("Connection refused on port 443")
    except Exception as e:
        result["errors"].append(f"Error: {str(e)[:100]}")

    return result


def get_link_health_score(scan_result: Dict[str, Any]) -> int:
    """
    Calculate a link health score based on scan results.
    Returns a score from 0-100.
    """
    summary = scan_result.get("summary", {})
    total = summary.get("total", 0)

    if total == 0:
        return 100

    ok_count = summary.get("ok", 0) + summary.get("redirects", 0)
    broken_count = summary.get("broken", 0) + summary.get("errors", 0)

    # Calculate base score
    if broken_count == 0:
        return 100

    health_ratio = ok_count / total
    score = int(health_ratio * 100)

    # Penalize heavily for broken links
    penalty = min(broken_count * 5, 50)  # Max 50 point penalty
    score = max(0, score - penalty)

    return score
