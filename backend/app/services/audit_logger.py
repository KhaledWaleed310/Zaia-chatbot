"""
Comprehensive audit logging service for security and compliance.
"""
from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid
import logging
from ..core.database import get_mongodb

logger = logging.getLogger(__name__)


class AuditEventType(str, Enum):
    # Authentication & Authorization
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_LOGIN_FAILED = "user_login_failed"
    USER_REGISTERED = "user_registered"
    USER_PASSWORD_CHANGED = "user_password_changed"
    USER_PASSWORD_RESET_REQUESTED = "user_password_reset_requested"
    USER_PASSWORD_RESET_COMPLETED = "user_password_reset_completed"
    USER_EMAIL_VERIFIED = "user_email_verified"

    # User Management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_ROLE_CHANGED = "user_role_changed"
    USER_STATUS_CHANGED = "user_status_changed"

    # Bot Management
    BOT_CREATED = "bot_created"
    BOT_UPDATED = "bot_updated"
    BOT_DELETED = "bot_deleted"
    BOT_DEPLOYED = "bot_deployed"
    BOT_SUSPENDED = "bot_suspended"

    # Data Operations
    DOCUMENT_UPLOADED = "document_uploaded"
    DOCUMENT_DELETED = "document_deleted"
    DOCUMENT_PROCESSED = "document_processed"
    DATA_EXPORTED = "data_exported"
    DATA_IMPORTED = "data_imported"

    # Conversation Events
    CONVERSATION_STARTED = "conversation_started"
    CONVERSATION_ENDED = "conversation_ended"
    MESSAGE_SENT = "message_sent"
    MESSAGE_RECEIVED = "message_received"
    CONVERSATION_DELETED = "conversation_deleted"

    # Integration Events
    INTEGRATION_CONNECTED = "integration_connected"
    INTEGRATION_DISCONNECTED = "integration_disconnected"
    INTEGRATION_SYNCED = "integration_synced"
    INTEGRATION_FAILED = "integration_failed"

    # API & Access
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    API_KEY_USED = "api_key_used"
    API_RATE_LIMIT_EXCEEDED = "api_rate_limit_exceeded"

    # Configuration Changes
    CONFIG_UPDATED = "config_updated"
    SETTINGS_CHANGED = "settings_changed"
    PERMISSIONS_CHANGED = "permissions_changed"

    # Security Events
    UNAUTHORIZED_ACCESS_ATTEMPT = "unauthorized_access_attempt"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"
    ENCRYPTION_KEY_ROTATED = "encryption_key_rotated"

    # Compliance & Privacy
    DATA_RETENTION_APPLIED = "data_retention_applied"
    GDPR_REQUEST_SUBMITTED = "gdpr_request_submitted"
    GDPR_DATA_EXPORTED = "gdpr_data_exported"
    GDPR_DATA_DELETED = "gdpr_data_deleted"

    # System Events
    SYSTEM_ERROR = "system_error"
    SYSTEM_WARNING = "system_warning"
    BACKUP_CREATED = "backup_created"
    BACKUP_RESTORED = "backup_restored"

    # Billing & Subscription
    SUBSCRIPTION_CREATED = "subscription_created"
    SUBSCRIPTION_UPDATED = "subscription_updated"
    SUBSCRIPTION_CANCELLED = "subscription_cancelled"
    PAYMENT_PROCESSED = "payment_processed"
    PAYMENT_FAILED = "payment_failed"

    # Analytics & Reporting
    REPORT_GENERATED = "report_generated"
    ANALYTICS_ACCESSED = "analytics_accessed"

    # Handoff & Support
    HANDOFF_CREATED = "handoff_created"
    HANDOFF_ASSIGNED = "handoff_assigned"
    HANDOFF_RESOLVED = "handoff_resolved"

    # Lead Management
    LEAD_CAPTURED = "lead_captured"
    LEAD_UPDATED = "lead_updated"
    LEAD_EXPORTED = "lead_exported"


class AuditSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditLogger:
    """
    Comprehensive audit logging service for tracking all system events.
    """

    def __init__(self):
        self.collection_name = "audit_logs"

    async def log_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        bot_id: Optional[str] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        action_result: str = "success",
        error_message: Optional[str] = None
    ) -> str:
        """
        Log an audit event.

        Args:
            event_type: Type of event being logged
            user_id: ID of the user who triggered the event
            tenant_id: Tenant ID for multi-tenant isolation
            bot_id: Bot ID if event is bot-specific
            severity: Severity level of the event
            details: Additional event details
            ip_address: IP address of the request
            user_agent: User agent string
            resource_id: ID of the resource being affected
            resource_type: Type of resource (bot, user, document, etc.)
            action_result: Result of the action (success, failure, partial)
            error_message: Error message if action failed

        Returns:
            Audit log entry ID
        """
        db = get_mongodb()

        audit_entry = {
            "_id": str(uuid.uuid4()),
            "event_type": event_type.value,
            "severity": severity.value,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "bot_id": bot_id,
            "resource_id": resource_id,
            "resource_type": resource_type,
            "action_result": action_result,
            "error_message": error_message,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "details": details or {},
            "timestamp": datetime.utcnow()
        }

        try:
            await db[self.collection_name].insert_one(audit_entry)
            return audit_entry["_id"]
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            # Don't raise - audit logging should not break application flow
            return ""

    async def get_audit_logs(
        self,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        bot_id: Optional[str] = None,
        event_types: Optional[List[AuditEventType]] = None,
        severity: Optional[AuditSeverity] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Retrieve audit logs with filtering options.
        """
        db = get_mongodb()

        query = {}

        if tenant_id:
            query["tenant_id"] = tenant_id
        if user_id:
            query["user_id"] = user_id
        if bot_id:
            query["bot_id"] = bot_id
        if event_types:
            query["event_type"] = {"$in": [et.value for et in event_types]}
        if severity:
            query["severity"] = severity.value
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date

        logs = await db[self.collection_name].find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        return logs

    async def get_user_activity(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all activity for a specific user."""
        return await self.get_audit_logs(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

    async def get_security_events(
        self,
        tenant_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all security-related events."""
        security_event_types = [
            AuditEventType.USER_LOGIN_FAILED,
            AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
            AuditEventType.SUSPICIOUS_ACTIVITY,
            AuditEventType.DATA_BREACH_ATTEMPT,
            AuditEventType.API_RATE_LIMIT_EXCEEDED
        ]

        return await self.get_audit_logs(
            tenant_id=tenant_id,
            event_types=security_event_types,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

    async def get_compliance_events(
        self,
        tenant_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all compliance-related events."""
        compliance_event_types = [
            AuditEventType.GDPR_REQUEST_SUBMITTED,
            AuditEventType.GDPR_DATA_EXPORTED,
            AuditEventType.GDPR_DATA_DELETED,
            AuditEventType.DATA_RETENTION_APPLIED,
            AuditEventType.DATA_EXPORTED
        ]

        return await self.get_audit_logs(
            tenant_id=tenant_id,
            event_types=compliance_event_types,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

    async def get_failed_actions(
        self,
        tenant_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all failed actions."""
        db = get_mongodb()

        query = {"action_result": "failure"}

        if tenant_id:
            query["tenant_id"] = tenant_id
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date

        logs = await db[self.collection_name].find(query).sort("timestamp", -1).limit(limit).to_list(limit)
        return logs

    async def get_event_statistics(
        self,
        tenant_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get statistics about audit events.
        """
        db = get_mongodb()

        match_stage = {}
        if tenant_id:
            match_stage["tenant_id"] = tenant_id
        if start_date or end_date:
            match_stage["timestamp"] = {}
            if start_date:
                match_stage["timestamp"]["$gte"] = start_date
            if end_date:
                match_stage["timestamp"]["$lte"] = end_date

        pipeline = []
        if match_stage:
            pipeline.append({"$match": match_stage})

        pipeline.extend([
            {
                "$facet": {
                    "by_event_type": [
                        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}}
                    ],
                    "by_severity": [
                        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
                    ],
                    "by_result": [
                        {"$group": {"_id": "$action_result", "count": {"$sum": 1}}}
                    ],
                    "total": [
                        {"$count": "count"}
                    ]
                }
            }
        ])

        result = await db[self.collection_name].aggregate(pipeline).to_list(1)

        if result:
            stats = result[0]
            return {
                "total_events": stats["total"][0]["count"] if stats["total"] else 0,
                "by_event_type": {item["_id"]: item["count"] for item in stats["by_event_type"]},
                "by_severity": {item["_id"]: item["count"] for item in stats["by_severity"]},
                "by_result": {item["_id"]: item["count"] for item in stats["by_result"]}
            }
        return {
            "total_events": 0,
            "by_event_type": {},
            "by_severity": {},
            "by_result": {}
        }

    async def log_user_login(
        self,
        user_id: str,
        tenant_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True
    ):
        """Convenience method for logging user login."""
        event_type = AuditEventType.USER_LOGIN if success else AuditEventType.USER_LOGIN_FAILED
        severity = AuditSeverity.INFO if success else AuditSeverity.WARNING

        await self.log_event(
            event_type=event_type,
            user_id=user_id,
            tenant_id=tenant_id,
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent,
            action_result="success" if success else "failure"
        )

    async def log_data_access(
        self,
        user_id: str,
        tenant_id: str,
        resource_type: str,
        resource_id: str,
        action: str,
        ip_address: Optional[str] = None
    ):
        """Convenience method for logging data access."""
        await self.log_event(
            event_type=AuditEventType.DATA_EXPORTED if action == "export" else AuditEventType.DATA_IMPORTED,
            user_id=user_id,
            tenant_id=tenant_id,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            details={"action": action}
        )

    async def log_permission_change(
        self,
        user_id: str,
        tenant_id: str,
        target_user_id: str,
        old_role: str,
        new_role: str,
        changed_by: str
    ):
        """Convenience method for logging permission changes."""
        await self.log_event(
            event_type=AuditEventType.USER_ROLE_CHANGED,
            user_id=target_user_id,
            tenant_id=tenant_id,
            severity=AuditSeverity.WARNING,
            resource_type="user",
            resource_id=target_user_id,
            details={
                "old_role": old_role,
                "new_role": new_role,
                "changed_by": changed_by
            }
        )


# Singleton instance
audit_logger = AuditLogger()
