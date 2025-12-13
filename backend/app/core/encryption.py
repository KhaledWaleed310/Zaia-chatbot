"""Token encryption utilities for OAuth credentials."""
from cryptography.fernet import Fernet
from .config import settings
import base64
import os


def get_fernet() -> Fernet:
    """Get Fernet instance with configured or generated key."""
    key = settings.ENCRYPTION_KEY
    if not key:
        # Generate a key if not configured (for development)
        # In production, ENCRYPTION_KEY should be set in environment
        key = base64.urlsafe_b64encode(os.urandom(32)).decode()

    # Ensure key is properly formatted
    if isinstance(key, str):
        key = key.encode()

    return Fernet(key)


def encrypt_token(token: str) -> str:
    """Encrypt a token for secure storage."""
    if not token:
        return ""
    fernet = get_fernet()
    encrypted = fernet.encrypt(token.encode())
    return encrypted.decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a stored token."""
    if not encrypted_token:
        return ""
    fernet = get_fernet()
    decrypted = fernet.decrypt(encrypted_token.encode())
    return decrypted.decode()
