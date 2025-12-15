"""
Role-Based Access Control (RBAC) system for Zaia chatbot.
"""
from enum import Enum
from typing import Set, List, Optional
from fastapi import HTTPException, status


class Role(str, Enum):
    """User roles in the system."""
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class Permission(str, Enum):
    """Granular permissions for different operations."""
    # Bot Management
    BOT_CREATE = "bot:create"
    BOT_READ = "bot:read"
    BOT_UPDATE = "bot:update"
    BOT_DELETE = "bot:delete"
    BOT_DEPLOY = "bot:deploy"

    # Document Management
    DOCUMENT_UPLOAD = "document:upload"
    DOCUMENT_READ = "document:read"
    DOCUMENT_DELETE = "document:delete"
    DOCUMENT_PROCESS = "document:process"

    # Conversation Management
    CONVERSATION_READ = "conversation:read"
    CONVERSATION_DELETE = "conversation:delete"
    CONVERSATION_EXPORT = "conversation:export"

    # User Management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_INVITE = "user:invite"

    # Analytics & Reporting
    ANALYTICS_VIEW = "analytics:view"
    ANALYTICS_EXPORT = "analytics:export"
    REPORTS_GENERATE = "reports:generate"

    # API Key Management
    API_KEY_CREATE = "api_key:create"
    API_KEY_READ = "api_key:read"
    API_KEY_REVOKE = "api_key:revoke"
    API_KEY_DELETE = "api_key:delete"

    # Integration Management
    INTEGRATION_CONNECT = "integration:connect"
    INTEGRATION_READ = "integration:read"
    INTEGRATION_DISCONNECT = "integration:disconnect"
    INTEGRATION_SYNC = "integration:sync"

    # Settings & Configuration
    SETTINGS_READ = "settings:read"
    SETTINGS_UPDATE = "settings:update"
    CONFIG_READ = "config:read"
    CONFIG_UPDATE = "config:update"

    # Handoff & Support
    HANDOFF_CREATE = "handoff:create"
    HANDOFF_READ = "handoff:read"
    HANDOFF_ASSIGN = "handoff:assign"
    HANDOFF_RESOLVE = "handoff:resolve"

    # Lead Management
    LEADS_READ = "leads:read"
    LEADS_EXPORT = "leads:export"
    LEADS_DELETE = "leads:delete"

    # Billing & Subscription
    BILLING_READ = "billing:read"
    BILLING_UPDATE = "billing:update"
    SUBSCRIPTION_MANAGE = "subscription:manage"

    # Audit Logs
    AUDIT_READ = "audit:read"
    AUDIT_EXPORT = "audit:export"

    # System Administration
    SYSTEM_MONITOR = "system:monitor"
    SYSTEM_BACKUP = "system:backup"
    SYSTEM_RESTORE = "system:restore"
    SYSTEM_CONFIG = "system:config"

    # Tenant Management (Super Admin only)
    TENANT_CREATE = "tenant:create"
    TENANT_READ = "tenant:read"
    TENANT_UPDATE = "tenant:update"
    TENANT_DELETE = "tenant:delete"
    TENANT_SUSPEND = "tenant:suspend"

    # Advanced Features
    ENCRYPTION_MANAGE = "encryption:manage"
    GDPR_MANAGE = "gdpr:manage"
    DATA_RETENTION = "data:retention"


# Role to Permissions Mapping
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.USER: {
        # Bot Management
        Permission.BOT_CREATE,
        Permission.BOT_READ,
        Permission.BOT_UPDATE,
        Permission.BOT_DELETE,
        Permission.BOT_DEPLOY,

        # Document Management
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_READ,
        Permission.DOCUMENT_DELETE,
        Permission.DOCUMENT_PROCESS,

        # Conversation Management
        Permission.CONVERSATION_READ,
        Permission.CONVERSATION_DELETE,
        Permission.CONVERSATION_EXPORT,

        # Analytics & Reporting
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
        Permission.REPORTS_GENERATE,

        # API Key Management
        Permission.API_KEY_CREATE,
        Permission.API_KEY_READ,
        Permission.API_KEY_REVOKE,

        # Integration Management
        Permission.INTEGRATION_CONNECT,
        Permission.INTEGRATION_READ,
        Permission.INTEGRATION_DISCONNECT,
        Permission.INTEGRATION_SYNC,

        # Settings & Configuration
        Permission.SETTINGS_READ,
        Permission.SETTINGS_UPDATE,
        Permission.CONFIG_READ,

        # Handoff & Support
        Permission.HANDOFF_CREATE,
        Permission.HANDOFF_READ,
        Permission.HANDOFF_RESOLVE,

        # Lead Management
        Permission.LEADS_READ,
        Permission.LEADS_EXPORT,

        # Billing & Subscription
        Permission.BILLING_READ,
        Permission.BILLING_UPDATE,
        Permission.SUBSCRIPTION_MANAGE,
    },

    Role.ADMIN: {
        # Admins have all USER permissions plus additional ones
        *ROLE_PERMISSIONS[Role.USER],

        # User Management
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_INVITE,

        # Advanced Configuration
        Permission.CONFIG_UPDATE,

        # API Key Management
        Permission.API_KEY_DELETE,

        # Handoff Management
        Permission.HANDOFF_ASSIGN,

        # Lead Management
        Permission.LEADS_DELETE,

        # Audit Logs
        Permission.AUDIT_READ,
        Permission.AUDIT_EXPORT,

        # GDPR & Data Management
        Permission.GDPR_MANAGE,
        Permission.DATA_RETENTION,
    },

    Role.SUPER_ADMIN: {
        # Super Admins have all permissions
        *[p for p in Permission]
    }
}


def get_role_permissions(role: Role) -> Set[Permission]:
    """
    Get all permissions for a given role.

    Args:
        role: The role to get permissions for

    Returns:
        Set of permissions for the role
    """
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(user_role: str, required_permission: Permission) -> bool:
    """
    Check if a user role has a specific permission.

    Args:
        user_role: The user's role as a string
        required_permission: The permission to check for

    Returns:
        True if the role has the permission, False otherwise
    """
    try:
        role = Role(user_role)
    except ValueError:
        return False

    permissions = get_role_permissions(role)
    return required_permission in permissions


def has_any_permission(user_role: str, required_permissions: List[Permission]) -> bool:
    """
    Check if a user role has any of the specified permissions.

    Args:
        user_role: The user's role as a string
        required_permissions: List of permissions to check for

    Returns:
        True if the role has at least one of the permissions, False otherwise
    """
    try:
        role = Role(user_role)
    except ValueError:
        return False

    permissions = get_role_permissions(role)
    return any(perm in permissions for perm in required_permissions)


def has_all_permissions(user_role: str, required_permissions: List[Permission]) -> bool:
    """
    Check if a user role has all of the specified permissions.

    Args:
        user_role: The user's role as a string
        required_permissions: List of permissions to check for

    Returns:
        True if the role has all of the permissions, False otherwise
    """
    try:
        role = Role(user_role)
    except ValueError:
        return False

    permissions = get_role_permissions(role)
    return all(perm in permissions for perm in required_permissions)


def require_permission(user_role: str, required_permission: Permission) -> None:
    """
    Require a specific permission, raise HTTPException if not authorized.

    Args:
        user_role: The user's role as a string
        required_permission: The permission to check for

    Raises:
        HTTPException: 403 Forbidden if permission is not granted
    """
    if not has_permission(user_role, required_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required permission: {required_permission.value}"
        )


def require_any_permission(user_role: str, required_permissions: List[Permission]) -> None:
    """
    Require at least one of the specified permissions.

    Args:
        user_role: The user's role as a string
        required_permissions: List of permissions to check for

    Raises:
        HTTPException: 403 Forbidden if none of the permissions are granted
    """
    if not has_any_permission(user_role, required_permissions):
        perms_str = ", ".join([p.value for p in required_permissions])
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required one of: {perms_str}"
        )


def require_all_permissions(user_role: str, required_permissions: List[Permission]) -> None:
    """
    Require all of the specified permissions.

    Args:
        user_role: The user's role as a string
        required_permissions: List of permissions to check for

    Raises:
        HTTPException: 403 Forbidden if any of the permissions are not granted
    """
    if not has_all_permissions(user_role, required_permissions):
        perms_str = ", ".join([p.value for p in required_permissions])
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required all of: {perms_str}"
        )


def require_role(user_role: str, required_role: Role) -> None:
    """
    Require a specific role or higher.

    Args:
        user_role: The user's role as a string
        required_role: The minimum required role

    Raises:
        HTTPException: 403 Forbidden if role is not sufficient
    """
    try:
        role = Role(user_role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role"
        )

    # Role hierarchy: USER < ADMIN < SUPER_ADMIN
    role_hierarchy = {
        Role.USER: 1,
        Role.ADMIN: 2,
        Role.SUPER_ADMIN: 3
    }

    if role_hierarchy[role] < role_hierarchy[required_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient role. Required: {required_role.value} or higher"
        )


def is_admin(user_role: str) -> bool:
    """
    Check if user is an admin (ADMIN or SUPER_ADMIN).

    Args:
        user_role: The user's role as a string

    Returns:
        True if user is admin or super admin
    """
    try:
        role = Role(user_role)
        return role in [Role.ADMIN, Role.SUPER_ADMIN]
    except ValueError:
        return False


def is_super_admin(user_role: str) -> bool:
    """
    Check if user is a super admin.

    Args:
        user_role: The user's role as a string

    Returns:
        True if user is super admin
    """
    try:
        role = Role(user_role)
        return role == Role.SUPER_ADMIN
    except ValueError:
        return False


def get_user_permissions(user_role: str) -> List[str]:
    """
    Get all permissions for a user as a list of strings.

    Args:
        user_role: The user's role as a string

    Returns:
        List of permission strings
    """
    try:
        role = Role(user_role)
        permissions = get_role_permissions(role)
        return [p.value for p in permissions]
    except ValueError:
        return []
