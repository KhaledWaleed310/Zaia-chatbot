"""Integration services for OAuth providers."""
from .base import BaseIntegration
from .google_drive import GoogleDriveIntegration
from .gmail import GmailIntegration
from .notion import NotionIntegration
from .slack import SlackIntegration
from .hubspot import HubSpotIntegration

INTEGRATIONS = {
    "google_drive": GoogleDriveIntegration,
    "gmail": GmailIntegration,
    "notion": NotionIntegration,
    "slack": SlackIntegration,
    "hubspot": HubSpotIntegration,
}


def get_integration(provider: str) -> BaseIntegration:
    """Get integration instance by provider name."""
    if provider not in INTEGRATIONS:
        raise ValueError(f"Unknown integration provider: {provider}")
    return INTEGRATIONS[provider]()


__all__ = [
    "BaseIntegration",
    "GoogleDriveIntegration",
    "GmailIntegration",
    "NotionIntegration",
    "SlackIntegration",
    "HubSpotIntegration",
    "get_integration",
    "INTEGRATIONS",
]
