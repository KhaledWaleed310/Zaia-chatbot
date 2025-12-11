"""Authentication service for password hashing, JWT creation, and token verification."""

from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt

from ..config import settings
from ..models import TokenData

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hashed password.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to check against

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary of data to encode in the token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.jwt_algorithm
    )

    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """
    Decode and verify a JWT access token.

    Args:
        token: JWT token string to decode

    Returns:
        TokenData object if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm]
        )

        tenant_id: str = payload.get("tenant_id")
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")

        if tenant_id is None:
            return None

        token_data = TokenData(
            tenant_id=tenant_id,
            user_id=user_id,
            email=email
        )

        return token_data

    except JWTError:
        return None


def verify_api_key(api_key: str, tenant_api_keys: list) -> bool:
    """
    Verify if an API key exists in tenant's API keys list.

    Args:
        api_key: API key to verify
        tenant_api_keys: List of APIKey objects from tenant

    Returns:
        True if API key is valid, False otherwise
    """
    return any(key.key == api_key for key in tenant_api_keys)
