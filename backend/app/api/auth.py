from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import datetime, timedelta
import uuid
import secrets
import hashlib
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from ..schemas.password_reset import ForgotPasswordRequest, ResetPasswordRequest, MessageResponse
from ..core.security import get_password_hash, verify_password, create_access_token, is_admin, get_current_user, ADMIN_EMAILS
from ..core.database import get_mongodb
from ..services.limits import get_user_usage
from ..services.email import send_password_reset_email, send_password_changed_confirmation

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate):
    db = get_mongodb()

    # Validate password strength
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

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
        "created_at": datetime.utcnow()
    }

    await db.users.insert_one(user_doc)

    # Generate token
    token = create_access_token({"sub": user_id})

    user_is_admin = user_data.email in ADMIN_EMAILS

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            company_name=user_data.company_name,
            role="admin" if user_is_admin else "user",
            is_admin=user_is_admin,
            subscription_tier="free",
            status="active",
            created_at=user_doc["created_at"]
        )
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

    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

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
            created_at=user["created_at"]
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
        created_at=current_user["created_at"]
    )


def generate_reset_token() -> tuple:
    """Generate a secure reset token and its hash"""
    token = secrets.token_urlsafe(32)  # 256-bit entropy
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash


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
