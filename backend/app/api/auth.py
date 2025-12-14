from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import datetime
import uuid
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from ..core.security import get_password_hash, verify_password, create_access_token, is_admin, get_current_user, ADMIN_EMAILS
from ..core.database import get_mongodb
from ..services.limits import get_user_usage

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
