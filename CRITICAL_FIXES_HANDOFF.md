# Critical Security, GDPR & SOC 2 Compliance Handoff

**Generated:** December 15, 2025
**Status:** Pending Implementation
**Target:** Production-Ready with Full Compliance

---

## Table of Contents

1. [Critical Security Fixes](#1-critical-security-fixes)
2. [GDPR Compliance](#2-gdpr-compliance)
3. [SOC 2 Compliance](#3-soc-2-compliance)
4. [DDoS & Infrastructure Security](#4-ddos--infrastructure-security)
5. [Implementation Roadmap](#5-implementation-roadmap)

---

# 1. Critical Security Fixes

## 1.1 CRITICAL: Exposed API Keys

**Location:** `.env` file

**Affected Keys:**
- DeepSeek API Key
- Resend API Key
- Google OAuth credentials
- Notion Client Secret
- Slack Client Secret
- HubSpot Client Secret

**Action:**
```bash
# Rotate ALL keys in their respective dashboards:
# - https://platform.deepseek.com/
# - https://resend.com/api-keys
# - https://console.cloud.google.com/
# - https://www.notion.so/my-integrations
# - https://api.slack.com/apps
# - https://app.hubspot.com/
```

---

## 1.2 CRITICAL: Hardcoded Database Credentials

**Location:** `docker-compose.yml`

**Current (Insecure):**
```yaml
- MONGO_INITDB_ROOT_PASSWORD=zaia_secure_pass_2024
- NEO4J_AUTH=neo4j/zaia_neo4j_pass_2024
```

**Fix - Update docker-compose.yml:**
```yaml
services:
  mongodb:
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}

  neo4j:
    environment:
      - NEO4J_AUTH=${NEO4J_USER}/${NEO4J_PASSWORD}

  redis:
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  backend:
    environment:
      - MONGODB_URL=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
```

**Add to .env:**
```bash
MONGO_USER=zaia_admin
MONGO_PASSWORD=<generate-strong-password>
NEO4J_USER=neo4j
NEO4J_PASSWORD=<generate-strong-password>
REDIS_PASSWORD=<generate-strong-password>
```

---

## 1.3 CRITICAL: Conversations Not Encrypted

**Location:** `/backend/app/api/chat.py`

**Implementation Required:**

```python
# /backend/app/services/encryption_service.py

from cryptography.fernet import Fernet
from app.core.config import settings
import base64

class ConversationEncryption:
    def __init__(self):
        key = settings.ENCRYPTION_KEY
        if not key:
            raise ValueError("ENCRYPTION_KEY must be set for production")
        self.fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def encrypt_message(self, content: str) -> str:
        """Encrypt message content before storage."""
        return self.fernet.encrypt(content.encode()).decode()

    def decrypt_message(self, encrypted: str) -> str:
        """Decrypt message content after retrieval."""
        return self.fernet.decrypt(encrypted.encode()).decode()

# Usage in chat.py:
encryption = ConversationEncryption()

# Before storing:
encrypted_content = encryption.encrypt_message(message.message)

# After retrieving:
decrypted_content = encryption.decrypt_message(msg["content"])
```

---

## 1.4 HIGH: Fix Admin Role Default

**Location:** `/backend/app/core/security.py` (line 95)

**Current (Insecure):**
```python
user_role = current_user.get("role", "admin")
```

**Fix:**
```python
user_role = current_user.get("role", "user")  # Default to user, not admin
```

---

## 1.5 HIGH: Strong JWT Secret

**Location:** `/backend/app/core/config.py`

**Current (Insecure):**
```python
JWT_SECRET: str = "zaia_jwt_secret_key_change_in_production_2024"
```

**Fix:**
```python
JWT_SECRET: str = Field(..., env="JWT_SECRET")  # Required, no default

@validator("JWT_SECRET")
def validate_jwt_secret(cls, v):
    if len(v) < 64:
        raise ValueError("JWT_SECRET must be at least 64 characters")
    return v
```

**Generate:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## 1.6 HIGH: Tenant Isolation Fix

**Location:** `/backend/app/api/chat.py` (line 556)

**Current (Insecure):**
```python
async def get_analytics(bot_id: str, tenant_id: str):  # tenant_id from query!
```

**Fix:**
```python
async def get_analytics(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user["tenant_id"]  # Get from authenticated user

    # Verify bot belongs to tenant
    bot = await db.chatbots.find_one({"_id": bot_id, "tenant_id": tenant_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
```

---

## 1.7 HIGH: Visitor ID Validation

**Location:** `/backend/app/api/chat.py`

**Add validation:**
```python
import re
from uuid import UUID

def validate_visitor_id(visitor_id: str) -> bool:
    """Validate visitor_id is a proper UUID."""
    try:
        UUID(visitor_id, version=4)
        return True
    except ValueError:
        return False

# In endpoint:
if visitor_id and not validate_visitor_id(visitor_id):
    raise HTTPException(status_code=400, detail="Invalid visitor ID format")
```

---

## 1.8 MEDIUM: Remove Localhost from CORS

**Location:** `/backend/app/main.py`

**Fix:**
```python
# Production CORS (remove localhost)
ALLOWED_ORIGINS = [
    "https://chatbot.zaiasystems.com",
    "https://app.zaiasystems.com",
    "https://aidenlink.cloud",
]

# Only add localhost in development
if settings.ENVIRONMENT == "development":
    ALLOWED_ORIGINS.extend([
        "http://localhost:5173",
        "http://localhost:3000",
    ])
```

---

## 1.9 MEDIUM: Add Security Headers

**Location:** `/backend/app/main.py`

**Add these headers:**
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Existing headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # NEW: Add these
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://api.deepseek.com"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    return response
```

---

# 2. GDPR Compliance

## 2.1 Privacy Policy Page

**Create:** `/frontend/src/pages/PrivacyPolicy.jsx`

**Required Sections:**
- What data we collect
- How we use your data
- Data retention periods
- Third-party sharing
- Your rights (access, deletion, portability)
- Contact information
- Cookie policy

---

## 2.2 Consent at Registration

**Location:** `/frontend/src/pages/Register.jsx`

**Add:**
```jsx
<div className="flex items-start gap-2 mt-4">
  <input
    type="checkbox"
    id="privacyConsent"
    checked={privacyConsent}
    onChange={(e) => setPrivacyConsent(e.target.checked)}
    required
    className="mt-1"
  />
  <label htmlFor="privacyConsent" className="text-sm text-gray-600">
    I agree to the <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a> and
    consent to the processing of my personal data as described.
  </label>
</div>
```

**Backend - Store consent:**
```python
# /backend/app/api/auth.py - In register endpoint
user_doc = {
    # ... existing fields ...
    "gdpr_consent": True,
    "gdpr_consent_date": datetime.utcnow(),
    "gdpr_consent_ip": request.client.host,
}
```

---

## 2.3 Cookie Consent Banner

**Create:** `/frontend/src/components/CookieConsent.jsx`

```jsx
import { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setShow(true);
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      date: new Date().toISOString()
    }));
    setShow(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      date: new Date().toISOString()
    }));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          We use cookies to improve your experience. See our{' '}
          <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
        <div className="flex gap-2">
          <button
            onClick={acceptNecessary}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Necessary Only
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
```

---

## 2.4 Right to Erasure (Data Deletion API)

**Create:** `/backend/app/api/gdpr.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.core.database import get_mongodb
from datetime import datetime

router = APIRouter(prefix="/api/v1/gdpr", tags=["GDPR"])

@router.delete("/my-data")
async def delete_my_data(
    current_user: dict = Depends(get_current_user),
    confirm: bool = False
):
    """
    GDPR Article 17 - Right to Erasure
    Deletes all user data permanently.
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Please confirm deletion by setting confirm=true"
        )

    db = get_mongodb()
    user_id = current_user["_id"]
    tenant_id = current_user.get("tenant_id", user_id)

    # Delete all user data
    results = {
        "conversations": 0,
        "chatbots": 0,
        "documents": 0,
        "api_keys": 0,
        "user_profile": False
    }

    # Delete conversations
    conv_result = await db.conversations.delete_many({"tenant_id": tenant_id})
    results["conversations"] = conv_result.deleted_count

    # Delete chatbots
    bot_result = await db.chatbots.delete_many({"tenant_id": tenant_id})
    results["chatbots"] = bot_result.deleted_count

    # Delete documents
    doc_result = await db.documents.delete_many({"tenant_id": tenant_id})
    results["documents"] = doc_result.deleted_count

    # Delete API keys
    key_result = await db.api_keys.delete_many({"tenant_id": tenant_id})
    results["api_keys"] = key_result.deleted_count

    # Delete user profile
    user_result = await db.users.delete_one({"_id": user_id})
    results["user_profile"] = user_result.deleted_count > 0

    # Log deletion for audit
    await db.audit_logs.insert_one({
        "action": "gdpr_data_deletion",
        "user_id": user_id,
        "tenant_id": tenant_id,
        "results": results,
        "timestamp": datetime.utcnow(),
        "ip_address": None  # Add from request if needed
    })

    return {
        "status": "deleted",
        "message": "All your data has been permanently deleted",
        "details": results
    }


@router.get("/my-data")
async def export_my_data(current_user: dict = Depends(get_current_user)):
    """
    GDPR Article 20 - Right to Data Portability
    Exports all user data in JSON format.
    """
    db = get_mongodb()
    user_id = current_user["_id"]
    tenant_id = current_user.get("tenant_id", user_id)

    # Gather all user data
    user_data = await db.users.find_one({"_id": user_id})
    if user_data:
        del user_data["password_hash"]  # Never export password

    chatbots = await db.chatbots.find({"tenant_id": tenant_id}).to_list(None)
    conversations = await db.conversations.find({"tenant_id": tenant_id}).to_list(None)

    # Remove internal IDs for cleaner export
    for conv in conversations:
        conv["_id"] = str(conv["_id"])
    for bot in chatbots:
        bot["_id"] = str(bot["_id"])

    return {
        "export_date": datetime.utcnow().isoformat(),
        "user_profile": user_data,
        "chatbots": chatbots,
        "conversations": conversations,
        "total_records": {
            "chatbots": len(chatbots),
            "conversations": len(conversations)
        }
    }


@router.get("/my-data/request")
async def request_data_export(current_user: dict = Depends(get_current_user)):
    """
    Request data export - sends email with download link.
    """
    # Queue async job to generate export and email user
    # Implementation depends on your email/job queue setup
    return {
        "status": "processing",
        "message": "Your data export is being prepared. You will receive an email within 24 hours."
    }
```

**Register router in main.py:**
```python
from app.api import gdpr
app.include_router(gdpr.router)
```

---

## 2.5 Data Retention Policy

**Create:** `/backend/app/services/data_retention.py`

```python
from datetime import datetime, timedelta
from app.core.database import get_mongodb

class DataRetentionService:
    """
    GDPR-compliant data retention policies.
    Run daily via Celery beat.
    """

    RETENTION_POLICIES = {
        "conversations": 365,      # 1 year
        "audit_logs": 730,         # 2 years (legal requirement)
        "password_reset_tokens": 1, # 1 day
        "session_data": 30,        # 30 days
        "deleted_users": 30,       # 30 days before hard delete
    }

    async def cleanup_expired_data(self):
        db = get_mongodb()
        results = {}

        # Clean old conversations (for non-active users)
        cutoff = datetime.utcnow() - timedelta(days=self.RETENTION_POLICIES["conversations"])
        conv_result = await db.conversations.delete_many({
            "updated_at": {"$lt": cutoff},
            "archived": True
        })
        results["archived_conversations"] = conv_result.deleted_count

        # Clean expired password reset tokens
        token_cutoff = datetime.utcnow() - timedelta(days=self.RETENTION_POLICIES["password_reset_tokens"])
        token_result = await db.password_reset_tokens.delete_many({
            "created_at": {"$lt": token_cutoff}
        })
        results["expired_tokens"] = token_result.deleted_count

        # Hard delete soft-deleted users after retention period
        user_cutoff = datetime.utcnow() - timedelta(days=self.RETENTION_POLICIES["deleted_users"])
        user_result = await db.users.delete_many({
            "deleted_at": {"$lt": user_cutoff, "$ne": None}
        })
        results["hard_deleted_users"] = user_result.deleted_count

        return results
```

**Add Celery task:**
```python
# /backend/app/celery_tasks.py
from celery import shared_task
from app.services.data_retention import DataRetentionService

@shared_task
def daily_data_retention_cleanup():
    """Run daily at 3 AM."""
    import asyncio
    service = DataRetentionService()
    return asyncio.run(service.cleanup_expired_data())
```

---

## 2.6 Audit Logging

**Create:** `/backend/app/services/audit_logger.py`

```python
from datetime import datetime
from typing import Optional, Dict, Any
from app.core.database import get_mongodb

class AuditLogger:
    """
    GDPR Article 30 - Records of Processing Activities
    """

    @staticmethod
    async def log(
        action: str,
        user_id: Optional[str],
        resource_type: str,
        resource_id: Optional[str],
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        db = get_mongodb()

        await db.audit_logs.insert_one({
            "timestamp": datetime.utcnow(),
            "action": action,
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "ip_address": ip_address,
            "user_agent": user_agent
        })

    # Convenience methods
    @classmethod
    async def log_login(cls, user_id: str, ip: str, success: bool):
        await cls.log(
            action="login_success" if success else "login_failed",
            user_id=user_id,
            resource_type="auth",
            resource_id=None,
            ip_address=ip
        )

    @classmethod
    async def log_data_access(cls, user_id: str, resource_type: str, resource_id: str):
        await cls.log(
            action="data_access",
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id
        )

    @classmethod
    async def log_data_export(cls, user_id: str):
        await cls.log(
            action="gdpr_data_export",
            user_id=user_id,
            resource_type="user",
            resource_id=user_id
        )

    @classmethod
    async def log_data_deletion(cls, user_id: str, details: dict):
        await cls.log(
            action="gdpr_data_deletion",
            user_id=user_id,
            resource_type="user",
            resource_id=user_id,
            details=details
        )
```

**Create index for audit logs:**
```javascript
// MongoDB index
db.audit_logs.createIndex({ "timestamp": -1 })
db.audit_logs.createIndex({ "user_id": 1, "timestamp": -1 })
db.audit_logs.createIndex({ "action": 1, "timestamp": -1 })
```

---

# 3. SOC 2 Compliance

## 3.1 Security Policies (Documentation Required)

Create these documents in `/docs/policies/`:

| Document | Purpose |
|----------|---------|
| `information-security-policy.md` | Overall security framework |
| `access-control-policy.md` | User access management |
| `incident-response-plan.md` | How to handle breaches |
| `change-management-policy.md` | Code/infra change process |
| `data-classification-policy.md` | How data is categorized |
| `vendor-management-policy.md` | Third-party risk assessment |
| `business-continuity-plan.md` | Disaster recovery |
| `acceptable-use-policy.md` | Employee guidelines |

---

## 3.2 Access Control Implementation

**Create:** `/backend/app/core/rbac.py`

```python
from enum import Enum
from typing import List
from fastapi import HTTPException, Depends
from app.core.security import get_current_user

class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"

class Permission(str, Enum):
    # Chatbot permissions
    CHATBOT_CREATE = "chatbot:create"
    CHATBOT_READ = "chatbot:read"
    CHATBOT_UPDATE = "chatbot:update"
    CHATBOT_DELETE = "chatbot:delete"

    # Document permissions
    DOCUMENT_UPLOAD = "document:upload"
    DOCUMENT_DELETE = "document:delete"

    # Analytics permissions
    ANALYTICS_VIEW = "analytics:view"
    ANALYTICS_EXPORT = "analytics:export"

    # Admin permissions
    USERS_MANAGE = "users:manage"
    BILLING_MANAGE = "billing:manage"
    AUDIT_VIEW = "audit:view"

# Role-Permission mapping
ROLE_PERMISSIONS = {
    Role.SUPER_ADMIN: list(Permission),  # All permissions
    Role.ADMIN: [
        Permission.CHATBOT_CREATE,
        Permission.CHATBOT_READ,
        Permission.CHATBOT_UPDATE,
        Permission.CHATBOT_DELETE,
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_DELETE,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
        Permission.USERS_MANAGE,
    ],
    Role.MEMBER: [
        Permission.CHATBOT_CREATE,
        Permission.CHATBOT_READ,
        Permission.CHATBOT_UPDATE,
        Permission.DOCUMENT_UPLOAD,
        Permission.ANALYTICS_VIEW,
    ],
    Role.VIEWER: [
        Permission.CHATBOT_READ,
        Permission.ANALYTICS_VIEW,
    ],
}

def has_permission(role: str, permission: Permission) -> bool:
    """Check if role has specific permission."""
    try:
        role_enum = Role(role)
        return permission in ROLE_PERMISSIONS.get(role_enum, [])
    except ValueError:
        return False

def require_permission(permission: Permission):
    """Dependency to require specific permission."""
    async def check_permission(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "viewer")
        if not has_permission(user_role, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission.value} required"
            )
        return current_user
    return check_permission

# Usage in endpoints:
# @router.delete("/{bot_id}")
# async def delete_chatbot(
#     bot_id: str,
#     current_user: dict = Depends(require_permission(Permission.CHATBOT_DELETE))
# ):
```

---

## 3.3 Change Management Log

**Create:** `/backend/app/api/admin_audit.py`

```python
from fastapi import APIRouter, Depends
from app.core.security import get_current_admin
from app.core.database import get_mongodb
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/admin/audit", tags=["Admin Audit"])

@router.get("/logs")
async def get_audit_logs(
    days: int = 30,
    action: str = None,
    user_id: str = None,
    current_admin: dict = Depends(get_current_admin)
):
    """
    SOC 2 CC6.1 - Logical access security
    View audit logs for compliance review.
    """
    db = get_mongodb()

    query = {
        "timestamp": {"$gte": datetime.utcnow() - timedelta(days=days)}
    }

    if action:
        query["action"] = action
    if user_id:
        query["user_id"] = user_id

    logs = await db.audit_logs.find(query).sort("timestamp", -1).limit(1000).to_list(None)

    return {
        "total": len(logs),
        "logs": logs
    }

@router.get("/security-events")
async def get_security_events(
    days: int = 7,
    current_admin: dict = Depends(get_current_admin)
):
    """
    SOC 2 CC7.2 - Security incident monitoring
    """
    db = get_mongodb()

    security_actions = [
        "login_failed",
        "password_reset",
        "permission_denied",
        "rate_limit_exceeded",
        "suspicious_activity"
    ]

    events = await db.audit_logs.find({
        "action": {"$in": security_actions},
        "timestamp": {"$gte": datetime.utcnow() - timedelta(days=days)}
    }).sort("timestamp", -1).to_list(None)

    return {
        "total": len(events),
        "events": events
    }
```

---

## 3.4 Encryption at Rest

**MongoDB Encryption:**
```yaml
# docker-compose.yml - Add to mongodb service
mongodb:
  command: mongod --enableEncryption --encryptionKeyFile /etc/mongodb/encryption-key
  volumes:
    - ./secrets/mongodb-encryption-key:/etc/mongodb/encryption-key:ro
```

**Generate encryption key:**
```bash
openssl rand -base64 32 > ./secrets/mongodb-encryption-key
chmod 600 ./secrets/mongodb-encryption-key
```

---

## 3.5 Backup & Recovery

**Create:** `/scripts/backup.sh`

```bash
#!/bin/bash
# SOC 2 CC9.1 - Recovery procedures

BACKUP_DIR="/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# MongoDB backup
docker exec zaia-mongodb mongodump \
  --uri="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@localhost:27017/zaia_chatbot?authSource=admin" \
  --out=/tmp/backup

docker cp zaia-mongodb:/tmp/backup $BACKUP_DIR/mongodb

# Redis backup
docker exec zaia-redis redis-cli -a ${REDIS_PASSWORD} BGSAVE
docker cp zaia-redis:/data/dump.rdb $BACKUP_DIR/redis.rdb

# Compress and encrypt
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
gpg --symmetric --cipher-algo AES256 $BACKUP_DIR.tar.gz

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR.tar.gz.gpg s3://zaia-backups/

# Cleanup old backups (keep 30 days)
find /backups -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

**Add to crontab:**
```bash
0 2 * * * /home/ubuntu/zaia-chatbot/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## 3.6 Incident Response Procedure

**Create:** `/docs/policies/incident-response-plan.md`

```markdown
# Incident Response Plan

## 1. Detection
- Monitor audit logs for anomalies
- Set up alerts for security events
- Regular security scanning

## 2. Classification
| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Data breach, system compromise | 15 minutes |
| High | Failed attack, vulnerability found | 1 hour |
| Medium | Policy violation, suspicious activity | 4 hours |
| Low | Minor security event | 24 hours |

## 3. Response Steps
1. Contain the incident
2. Preserve evidence
3. Eradicate the threat
4. Recover systems
5. Document lessons learned

## 4. Notification Requirements
- GDPR: 72 hours for data breaches
- Users: If personal data affected
- Authorities: As required by law

## 5. Contact List
- Security Lead: [email]
- CTO: [email]
- Legal: [email]
```

---

# 4. DDoS & Infrastructure Security

## 4.1 Cloudflare Setup (Recommended)

**Steps:**
1. Sign up at cloudflare.com
2. Add your domain
3. Update nameservers
4. Enable these features:

| Feature | Setting |
|---------|---------|
| SSL/TLS | Full (strict) |
| Always Use HTTPS | On |
| DDoS Protection | Automatic |
| Bot Fight Mode | On |
| Rate Limiting | Configure rules |
| WAF | Enable managed rules |

**Cloudflare Rate Limiting Rule:**
```
URL: api/*
Rate: 100 requests per minute per IP
Action: Block for 1 hour
```

---

## 4.2 Nginx Rate Limiting

**Add to nginx.conf:**
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
limit_conn_zone $binary_remote_addr zone=conn:10m;

server {
    # Connection limits
    limit_conn conn 20;

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend:8000;
    }

    # Strict auth rate limiting
    location /api/v1/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://backend:8000;
    }

    # Block common attacks
    location ~* (\.php|\.asp|\.aspx|\.jsp|\.cgi)$ {
        return 444;
    }
}
```

---

## 4.3 Application-Level Rate Limiting

**Enhance existing rate limiting:**

```python
# /backend/app/core/rate_limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri="redis://redis:6379"  # Use Redis for distributed limiting
)

# Rate limit configurations
RATE_LIMITS = {
    "auth": "5/minute",           # Login/register
    "password_reset": "3/minute", # Password reset
    "api": "60/minute",           # General API
    "chat": "30/minute",          # Chat messages
    "upload": "10/minute",        # File uploads
}
```

---

## 4.4 Fail2Ban Configuration

**Install and configure:**
```bash
sudo apt install fail2ban

# /etc/fail2ban/jail.local
[zaia-api]
enabled = true
port = http,https
filter = zaia-api
logpath = /var/log/nginx/access.log
maxretry = 50
findtime = 60
bantime = 3600

[zaia-auth]
enabled = true
port = http,https
filter = zaia-auth
logpath = /var/log/nginx/access.log
maxretry = 10
findtime = 60
bantime = 86400
```

---

# 5. Implementation Roadmap

## Phase 1: Critical Security (Days 1-2)
- [ ] Rotate all API keys
- [ ] Move credentials to .env
- [ ] Fix admin role default
- [ ] Generate strong JWT secret
- [ ] Add Redis authentication
- [ ] Remove localhost from CORS

## Phase 2: Encryption & Isolation (Days 3-5)
- [ ] Implement conversation encryption
- [ ] Fix tenant isolation
- [ ] Add visitor_id validation
- [ ] Enable MongoDB encryption at rest
- [ ] Add security headers (HSTS, CSP)

## Phase 3: GDPR Compliance (Days 6-10)
- [ ] Create privacy policy page
- [ ] Add consent checkbox to registration
- [ ] Implement cookie consent banner
- [ ] Build data deletion API
- [ ] Build data export API
- [ ] Implement audit logging
- [ ] Set up data retention jobs

## Phase 4: SOC 2 Preparation (Days 11-15)
- [ ] Write security policies
- [ ] Implement RBAC system
- [ ] Set up backup automation
- [ ] Create incident response plan
- [ ] Document change management process

## Phase 5: Infrastructure Security (Days 16-20)
- [ ] Set up Cloudflare
- [ ] Configure Nginx rate limiting
- [ ] Install Fail2Ban
- [ ] Set up monitoring & alerts
- [ ] Conduct security testing

---

## Compliance Checklist

### GDPR Ready
- [ ] Privacy policy published
- [ ] Consent collected at registration
- [ ] Cookie consent implemented
- [ ] Right to erasure (deletion API)
- [ ] Right to portability (export API)
- [ ] Data retention policy active
- [ ] Audit logging operational
- [ ] Breach notification process documented

### SOC 2 Ready
- [ ] Information Security Policy
- [ ] Access Control Policy
- [ ] Change Management Policy
- [ ] Incident Response Plan
- [ ] Business Continuity Plan
- [ ] Vendor Management Policy
- [ ] RBAC implemented
- [ ] Encryption at rest
- [ ] Audit logs retained 2+ years
- [ ] Annual penetration test scheduled

### DDoS Protected
- [ ] Cloudflare enabled
- [ ] Rate limiting configured
- [ ] WAF rules active
- [ ] Fail2Ban running
- [ ] Monitoring alerts set up

---

*Last updated: December 15, 2025*
*Next review: After Phase 5 completion*
