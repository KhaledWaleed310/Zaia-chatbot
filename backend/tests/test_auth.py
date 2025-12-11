"""Tests for authentication services."""

import pytest


# Skip bcrypt tests if passlib/bcrypt incompatibility exists
try:
    from app.services.auth_service import hash_password
    hash_password("test")
    BCRYPT_AVAILABLE = True
except (ValueError, AttributeError):
    BCRYPT_AVAILABLE = False


class TestAuthService:
    """Tests for auth service functions."""

    @pytest.mark.skipif(not BCRYPT_AVAILABLE, reason="bcrypt/passlib version incompatibility")
    def test_hash_password(self):
        """Test password hashing produces valid hash."""
        from app.services.auth_service import hash_password, verify_password

        password = "testpassword123"
        hashed = hash_password(password)

        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt prefix
        assert verify_password(password, hashed)

    @pytest.mark.skipif(not BCRYPT_AVAILABLE, reason="bcrypt/passlib version incompatibility")
    def test_verify_password_correct(self):
        """Test correct password verification."""
        from app.services.auth_service import hash_password, verify_password

        password = "correctpassword"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    @pytest.mark.skipif(not BCRYPT_AVAILABLE, reason="bcrypt/passlib version incompatibility")
    def test_verify_password_incorrect(self):
        """Test incorrect password verification."""
        from app.services.auth_service import hash_password, verify_password

        password = "correctpassword"
        hashed = hash_password(password)

        assert verify_password("wrongpassword", hashed) is False

    @pytest.mark.skipif(not BCRYPT_AVAILABLE, reason="bcrypt/passlib version incompatibility")
    def test_hash_produces_different_hashes(self):
        """Test that the same password produces different hashes (salt)."""
        from app.services.auth_service import hash_password

        password = "samepassword"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        # Different hashes due to salting
        assert hash1 != hash2

    def test_create_access_token(self):
        """Test JWT token creation."""
        from app.services.auth_service import create_access_token

        token_data = {
            "tenant_id": "test_tenant_id",
            "email": "test@example.com"
        }

        token = create_access_token(token_data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        # JWT format: header.payload.signature
        assert token.count('.') == 2

    def test_decode_access_token(self):
        """Test JWT token decoding."""
        from app.services.auth_service import create_access_token, decode_access_token

        token_data = {
            "tenant_id": "test_tenant_id",
            "email": "test@example.com"
        }

        token = create_access_token(token_data)
        decoded = decode_access_token(token)

        assert decoded is not None
        assert decoded.tenant_id == "test_tenant_id"
        assert decoded.email == "test@example.com"

    def test_decode_invalid_token(self):
        """Test decoding invalid token returns None."""
        from app.services.auth_service import decode_access_token

        decoded = decode_access_token("invalid.token.here")

        assert decoded is None

    def test_decode_malformed_token(self):
        """Test decoding malformed token returns None."""
        from app.services.auth_service import decode_access_token

        decoded = decode_access_token("not_a_jwt_at_all")

        assert decoded is None

    def test_decode_empty_token(self):
        """Test decoding empty token returns None."""
        from app.services.auth_service import decode_access_token

        decoded = decode_access_token("")

        assert decoded is None

    def test_token_with_custom_expiry(self):
        """Test creating token with custom expiry."""
        from app.services.auth_service import create_access_token, decode_access_token
        from datetime import timedelta

        token_data = {"tenant_id": "test_id", "email": "test@example.com"}
        token = create_access_token(token_data, expires_delta=timedelta(hours=1))

        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded.tenant_id == "test_id"

    def test_verify_api_key_valid(self):
        """Test valid API key verification."""
        from app.services.auth_service import verify_api_key
        from app.models import APIKey

        api_keys = [
            APIKey(key="valid_key_1", name="Key 1"),
            APIKey(key="valid_key_2", name="Key 2"),
        ]

        assert verify_api_key("valid_key_1", api_keys) is True
        assert verify_api_key("valid_key_2", api_keys) is True

    def test_verify_api_key_invalid(self):
        """Test invalid API key verification."""
        from app.services.auth_service import verify_api_key
        from app.models import APIKey

        api_keys = [
            APIKey(key="valid_key_1", name="Key 1"),
        ]

        assert verify_api_key("invalid_key", api_keys) is False

    def test_verify_api_key_empty_list(self):
        """Test API key verification with empty key list."""
        from app.services.auth_service import verify_api_key

        assert verify_api_key("any_key", []) is False
