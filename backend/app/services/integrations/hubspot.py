"""HubSpot OAuth integration."""
import httpx
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlencode
from datetime import datetime

from .base import BaseIntegration
from ...schemas.integrations import BrowseItem, BrowseResponse, BrowseItemType
from ...core.config import settings


class HubSpotIntegration(BaseIntegration):
    """HubSpot integration using OAuth2.

    Allows importing contacts, companies, deals, and notes from HubSpot CRM
    to use as knowledge base for the chatbot.
    """

    provider = "hubspot"
    display_name = "HubSpot"
    scopes = [
        "crm.objects.contacts.read",
        "crm.objects.companies.read",
        "crm.objects.deals.read",
        "crm.objects.notes.read",
    ]

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate HubSpot OAuth authorization URL."""
        params = {
            "client_id": settings.HUBSPOT_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
        }
        return f"https://app.hubspot.com/oauth/authorize?{urlencode(params)}"

    async def exchange_code(
        self, code: str, redirect_uri: str
    ) -> Tuple[str, Optional[str], Optional[int], Dict[str, Any]]:
        """Exchange authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                "https://api.hubapi.com/oauth/v1/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": settings.HUBSPOT_CLIENT_ID,
                    "client_secret": settings.HUBSPOT_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_response.raise_for_status()
            tokens = token_response.json()

            # Get access token info (contains hub_id and user)
            info_response = await client.get(
                "https://api.hubapi.com/oauth/v1/access-tokens/" + tokens["access_token"]
            )
            user_info = {}
            if info_response.status_code == 200:
                info = info_response.json()
                user_info = {
                    "email": info.get("user"),
                    "hub_id": info.get("hub_id"),
                    "hub_domain": info.get("hub_domain"),
                }

            return (
                tokens["access_token"],
                tokens.get("refresh_token"),
                tokens.get("expires_in"),
                user_info,
            )

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, Optional[int]]:
        """Refresh an expired access token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.hubapi.com/oauth/v1/token",
                data={
                    "grant_type": "refresh_token",
                    "client_id": settings.HUBSPOT_CLIENT_ID,
                    "client_secret": settings.HUBSPOT_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
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
        """Browse HubSpot CRM objects (contacts, companies, deals, notes)."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}

            # If no folder_id, show object type categories
            if not folder_id:
                items = [
                    BrowseItem(
                        id="contacts",
                        name="Contacts",
                        type=BrowseItemType.FOLDER,
                        has_children=True,
                    ),
                    BrowseItem(
                        id="companies",
                        name="Companies",
                        type=BrowseItemType.FOLDER,
                        has_children=True,
                    ),
                    BrowseItem(
                        id="deals",
                        name="Deals",
                        type=BrowseItemType.FOLDER,
                        has_children=True,
                    ),
                    BrowseItem(
                        id="notes",
                        name="Notes",
                        type=BrowseItemType.FOLDER,
                        has_children=True,
                    ),
                ]
                return BrowseResponse(items=items)

            # Browse specific object type
            object_type = folder_id
            params = {"limit": 50}

            if page_token:
                params["after"] = page_token

            # Build search or list request
            if query:
                # Use search API
                search_data = {
                    "query": query,
                    "limit": 50,
                }
                if page_token:
                    search_data["after"] = page_token

                response = await client.post(
                    f"https://api.hubapi.com/crm/v3/objects/{object_type}/search",
                    headers=headers,
                    json=search_data,
                )
            else:
                # Use list API
                properties = self._get_properties_for_type(object_type)
                params["properties"] = ",".join(properties)

                response = await client.get(
                    f"https://api.hubapi.com/crm/v3/objects/{object_type}",
                    headers=headers,
                    params=params,
                )

            response.raise_for_status()
            data = response.json()

            items = []
            for obj in data.get("results", []):
                props = obj.get("properties", {})
                name = self._get_display_name(object_type, props)
                modified = None

                if props.get("hs_lastmodifieddate"):
                    try:
                        modified = datetime.fromisoformat(
                            props["hs_lastmodifieddate"].replace("Z", "+00:00")
                        )
                    except Exception:
                        pass

                items.append(
                    BrowseItem(
                        id=f"{object_type}:{obj['id']}",
                        name=name,
                        type=BrowseItemType.FILE,
                        modified_at=modified,
                        has_children=False,
                    )
                )

            # Get next page token
            next_token = None
            paging = data.get("paging", {})
            if paging.get("next", {}).get("after"):
                next_token = paging["next"]["after"]

            return BrowseResponse(
                items=items,
                next_page_token=next_token,
                parent_id=folder_id,
                parent_name=object_type.title(),
            )

    async def fetch_content(self, access_token: str, item_id: str) -> Tuple[str, str, str]:
        """Fetch content of a HubSpot CRM object."""
        # item_id format: "object_type:id" (e.g., "contacts:123")
        object_type, obj_id = item_id.split(":", 1)

        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}

            # Get all properties for the object
            properties = self._get_all_properties_for_type(object_type)

            response = await client.get(
                f"https://api.hubapi.com/crm/v3/objects/{object_type}/{obj_id}",
                headers=headers,
                params={"properties": ",".join(properties)},
            )
            response.raise_for_status()
            data = response.json()

            props = data.get("properties", {})

            # Format content based on object type
            content = self._format_content(object_type, props)

            # Create filename
            name = self._get_display_name(object_type, props)
            safe_name = "".join(c if c.isalnum() or c in " -_" else "" for c in name)[:50]
            filename = f"hubspot_{object_type}_{safe_name}.txt"

            return content, filename, "text/plain"

    def _get_properties_for_type(self, object_type: str) -> List[str]:
        """Get basic properties to fetch for browse display."""
        base_props = ["hs_lastmodifieddate", "hs_createdate"]

        if object_type == "contacts":
            return base_props + ["firstname", "lastname", "email", "company"]
        elif object_type == "companies":
            return base_props + ["name", "domain", "industry"]
        elif object_type == "deals":
            return base_props + ["dealname", "amount", "dealstage"]
        elif object_type == "notes":
            return base_props + ["hs_note_body", "hs_timestamp"]
        return base_props

    def _get_all_properties_for_type(self, object_type: str) -> List[str]:
        """Get all properties to fetch for content export."""
        if object_type == "contacts":
            return [
                "firstname", "lastname", "email", "phone", "mobilephone",
                "company", "jobtitle", "address", "city", "state", "zip", "country",
                "website", "linkedin_url", "notes_last_updated",
                "hs_createdate", "hs_lastmodifieddate",
            ]
        elif object_type == "companies":
            return [
                "name", "domain", "industry", "description", "phone",
                "address", "city", "state", "zip", "country",
                "website", "linkedin_company_page", "numberofemployees",
                "annualrevenue", "founded_year",
                "hs_createdate", "hs_lastmodifieddate",
            ]
        elif object_type == "deals":
            return [
                "dealname", "amount", "dealstage", "pipeline",
                "closedate", "description", "deal_currency_code",
                "hs_createdate", "hs_lastmodifieddate",
            ]
        elif object_type == "notes":
            return [
                "hs_note_body", "hs_timestamp", "hs_attachment_ids",
                "hs_createdate", "hs_lastmodifieddate",
            ]
        return ["hs_createdate", "hs_lastmodifieddate"]

    def _get_display_name(self, object_type: str, props: Dict) -> str:
        """Get display name for a CRM object."""
        if object_type == "contacts":
            first = props.get("firstname", "")
            last = props.get("lastname", "")
            email = props.get("email", "")
            name = f"{first} {last}".strip()
            return name if name else email if email else "Unknown Contact"
        elif object_type == "companies":
            return props.get("name", "Unknown Company")
        elif object_type == "deals":
            return props.get("dealname", "Unknown Deal")
        elif object_type == "notes":
            body = props.get("hs_note_body", "")
            # Return first 50 chars of note as name
            preview = body[:50].replace("\n", " ").strip()
            return preview + "..." if len(body) > 50 else preview if preview else "Empty Note"
        return "Unknown"

    def _format_content(self, object_type: str, props: Dict) -> str:
        """Format CRM object as readable text content."""
        lines = [f"HubSpot {object_type.title().rstrip('s')} Record", "=" * 40, ""]

        if object_type == "contacts":
            self._add_field(lines, "Name", f"{props.get('firstname', '')} {props.get('lastname', '')}".strip())
            self._add_field(lines, "Email", props.get("email"))
            self._add_field(lines, "Phone", props.get("phone"))
            self._add_field(lines, "Mobile", props.get("mobilephone"))
            self._add_field(lines, "Company", props.get("company"))
            self._add_field(lines, "Job Title", props.get("jobtitle"))
            self._add_field(lines, "Website", props.get("website"))
            self._add_field(lines, "LinkedIn", props.get("linkedin_url"))

            # Address
            address_parts = [
                props.get("address"),
                props.get("city"),
                props.get("state"),
                props.get("zip"),
                props.get("country"),
            ]
            address = ", ".join(p for p in address_parts if p)
            self._add_field(lines, "Address", address)

        elif object_type == "companies":
            self._add_field(lines, "Name", props.get("name"))
            self._add_field(lines, "Domain", props.get("domain"))
            self._add_field(lines, "Industry", props.get("industry"))
            self._add_field(lines, "Description", props.get("description"))
            self._add_field(lines, "Phone", props.get("phone"))
            self._add_field(lines, "Website", props.get("website"))
            self._add_field(lines, "LinkedIn", props.get("linkedin_company_page"))
            self._add_field(lines, "Employees", props.get("numberofemployees"))
            self._add_field(lines, "Annual Revenue", props.get("annualrevenue"))
            self._add_field(lines, "Founded", props.get("founded_year"))

            address_parts = [
                props.get("address"),
                props.get("city"),
                props.get("state"),
                props.get("zip"),
                props.get("country"),
            ]
            address = ", ".join(p for p in address_parts if p)
            self._add_field(lines, "Address", address)

        elif object_type == "deals":
            self._add_field(lines, "Deal Name", props.get("dealname"))
            self._add_field(lines, "Amount", props.get("amount"))
            self._add_field(lines, "Currency", props.get("deal_currency_code"))
            self._add_field(lines, "Stage", props.get("dealstage"))
            self._add_field(lines, "Pipeline", props.get("pipeline"))
            self._add_field(lines, "Close Date", props.get("closedate"))
            self._add_field(lines, "Description", props.get("description"))

        elif object_type == "notes":
            self._add_field(lines, "Timestamp", props.get("hs_timestamp"))
            lines.append("")
            lines.append("Note Content:")
            lines.append("-" * 20)
            lines.append(props.get("hs_note_body", ""))

        # Add metadata
        lines.append("")
        lines.append("-" * 40)
        self._add_field(lines, "Created", props.get("hs_createdate"))
        self._add_field(lines, "Last Modified", props.get("hs_lastmodifieddate"))

        return "\n".join(lines)

    def _add_field(self, lines: List[str], label: str, value: Any) -> None:
        """Add a field to the content lines if value exists."""
        if value:
            lines.append(f"{label}: {value}")
