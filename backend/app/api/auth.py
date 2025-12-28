from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import datetime, timedelta
import uuid
import secrets
import hashlib
import logging
import re
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, RegisterResponse
from ..schemas.password_reset import (
    ForgotPasswordRequest, ResetPasswordRequest, MessageResponse,
    ResendVerificationRequest, VerifyEmailRequest
)
from ..core.security import get_password_hash, verify_password, create_access_token, is_admin, get_current_user
from ..core.database import get_mongodb
from ..services.limits import get_user_usage
from ..services.email import send_password_reset_email, send_password_changed_confirmation, send_verification_email

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def validate_password_strength(password: str) -> tuple:
    """
    Validate password meets security requirements.
    Returns (is_valid, error_message).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;\'`~]', password):
        return False, "Password must contain at least one special character"
    return True, ""


@router.post("/register", response_model=RegisterResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate):
    db = get_mongodb()

    # Validate password strength
    is_valid, error_msg = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Check if user exists (exclude soft-deleted users)
    existing = await db.users.find_one({
        "email": user_data.email,
        "status": {"$ne": "deleted"}
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Remove any soft-deleted user with this email to allow re-registration
    await db.users.delete_many({
        "email": user_data.email,
        "status": "deleted"
    })

    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "company_name": user_data.company_name,
        "company_size": user_data.company_size,
        "industry": user_data.industry,
        "use_case": user_data.use_case,
        "phone": user_data.phone,
        "job_title": user_data.job_title,
        "country": user_data.country,
        "referral_source": user_data.referral_source,
        "subscription_tier": "free",
        "status": "active",
        "email_verified": False,
        "created_at": datetime.utcnow(),
        # GDPR consent fields
        "privacy_consent": getattr(user_data, "privacy_consent", False),
        "privacy_consent_timestamp": datetime.utcnow() if getattr(user_data, "privacy_consent", False) else None,
        "marketing_consent": getattr(user_data, "marketing_consent", False),
        "marketing_consent_timestamp": datetime.utcnow() if getattr(user_data, "marketing_consent", False) else None,
        "consent_version": "1.0"
    }

    await db.users.insert_one(user_doc)

    # Generate verification token
    verification_token, token_hash = generate_reset_token()

    # Store verification token (24 hour expiry)
    token_doc = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "token_hash": token_hash,
        "type": "email_verification",
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=24),
        "used": False
    }
    await db.email_verification_tokens.insert_one(token_doc)

    # Send verification email
    await send_verification_email(user_data.email, verification_token)

    logger.info(f"User registered: {user_data.email}, verification email sent")

    # Return response without access token - user must verify email first
    return RegisterResponse(
        message="Registration successful! Please check your email to verify your account.",
        email=user_data.email,
        requires_verification=True
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    db = get_mongodb()

    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check if email is verified
    if not user.get("email_verified", True):  # Default True for existing users
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the verification link."
        )

    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    # Audit log for successful login
    try:
        audit_log = {
            "_id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "email": user["email"],
            "event_type": "login",
            "timestamp": datetime.utcnow(),
            "ip_address": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "status": "success"
        }
        await db.audit_logs.insert_one(audit_log)
    except Exception as e:
        logger.error(f"Failed to create audit log for login: {str(e)}")

    token = create_access_token({"sub": user["_id"]})
    user_is_admin = is_admin(user)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["_id"],
            email=user["email"],
            company_name=user.get("company_name"),
            role=user.get("role", "admin" if user_is_admin else "user"),
            is_admin=user_is_admin,
            subscription_tier=user.get("subscription_tier", "free"),
            status=user.get("status", "active"),
            created_at=user["created_at"],
            email_verified=user.get("email_verified", True)
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_is_admin = is_admin(current_user)
    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        company_name=current_user.get("company_name"),
        role=current_user.get("role", "admin" if user_is_admin else "user"),
        is_admin=user_is_admin,
        subscription_tier=current_user.get("subscription_tier", "free"),
        status=current_user.get("status", "active"),
        created_at=current_user["created_at"],
        email_verified=current_user.get("email_verified", True)
    )


def generate_reset_token() -> tuple:
    """Generate a secure reset token and its hash"""
    token = secrets.token_urlsafe(32)  # 256-bit entropy
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(data: VerifyEmailRequest):
    """
    Verify email address using verification token.
    """
    db = get_mongodb()

    # Hash the received token
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()

    # Look up the token
    token_doc = await db.email_verification_tokens.find_one({
        "token_hash": token_hash,
        "used": False
    })

    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link"
        )

    # Check if token is expired
    if datetime.utcnow() > token_doc["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link has expired. Please request a new one."
        )

    # Get the user
    user = await db.users.find_one({"_id": token_doc["user_id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification link"
        )

    # Check if already verified
    if user.get("email_verified", False):
        return MessageResponse(message="Email already verified. You can now log in.")

    # Mark email as verified
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verified": True, "email_verified_at": datetime.utcnow()}}
    )

    # Mark token as used
    await db.email_verification_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used": True}}
    )

    logger.info(f"Email verified for user {user['_id']}")

    return MessageResponse(message="Email verified successfully! You can now log in.")


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit("3/minute")
async def resend_verification(request: Request, data: ResendVerificationRequest):
    """
    Resend verification email.
    Always returns success to prevent email enumeration.
    """
    db = get_mongodb()

    # Look up user by email
    user = await db.users.find_one({"email": data.email})

    if user and not user.get("email_verified", False):
        # Delete any existing verification tokens for this user
        await db.email_verification_tokens.delete_many({
            "user_id": user["_id"],
            "used": False
        })

        # Generate new verification token
        verification_token, token_hash = generate_reset_token()

        # Store verification token (24 hour expiry)
        token_doc = {
            "_id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "token_hash": token_hash,
            "type": "email_verification",
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=24),
            "used": False
        }
        await db.email_verification_tokens.insert_one(token_doc)

        # Send verification email
        email_sent = await send_verification_email(user["email"], verification_token)

        if email_sent:
            logger.info(f"Verification email resent to {data.email}")
        else:
            logger.error(f"Failed to resend verification email to {data.email}")

    # Always return success to prevent email enumeration
    return MessageResponse(
        message="If an unverified account exists with this email, a verification link has been sent."
    )


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """
    Request a password reset email.
    Always returns success to prevent email enumeration.
    """
    db = get_mongodb()

    # Look up user by email
    user = await db.users.find_one({"email": data.email})

    if user:
        # Generate secure token
        token, token_hash = generate_reset_token()

        # Delete any existing unused tokens for this user
        await db.password_reset_tokens.delete_many({
            "user_id": user["_id"],
            "used": False
        })

        # Store the hashed token
        token_doc = {
            "_id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "token_hash": token_hash,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
            "used": False
        }
        await db.password_reset_tokens.insert_one(token_doc)

        # Send email with raw token
        email_sent = await send_password_reset_email(user["email"], token)

        if email_sent:
            logger.info(f"Password reset email sent to {data.email}")
        else:
            logger.error(f"Failed to send password reset email to {data.email}")

    # Always return success to prevent email enumeration
    return MessageResponse(
        message="If an account exists with this email, a password reset link has been sent."
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest):
    """
    Reset password using a valid reset token.
    """
    db = get_mongodb()

    # Hash the received token
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()

    # Look up the token
    token_doc = await db.password_reset_tokens.find_one({
        "token_hash": token_hash,
        "used": False
    })

    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Check if token is expired
    if datetime.utcnow() > token_doc["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )

    # Get the user
    user = await db.users.find_one({"_id": token_doc["user_id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )

    # Update password
    new_password_hash = get_password_hash(data.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": new_password_hash,
                "password_changed_at": datetime.utcnow()
            }
        }
    )

    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used": True}}
    )

    # Send confirmation email
    await send_password_changed_confirmation(user["email"])

    logger.info(f"Password reset successful for user {user['_id']}")

    return MessageResponse(message="Password has been reset successfully.")
