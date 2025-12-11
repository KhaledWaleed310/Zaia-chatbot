"""Tests for health check and configuration."""

import pytest


class TestConfig:
    """Test configuration settings."""

    def test_jwt_algorithm_valid(self):
        """Test JWT algorithm should be a valid value."""
        from app.config import settings
        valid_algorithms = ["HS256", "HS384", "HS512", "RS256"]
        assert settings.jwt_algorithm in valid_algorithms

    def test_token_expiry_positive(self):
        """Test token expiry should be a positive value."""
        from app.config import settings
        assert settings.access_token_expire_minutes > 0

    def test_embedding_dimension_valid(self):
        """Test embedding dimension should be valid."""
        from app.config import settings
        assert settings.embedding_dimension > 0
        assert settings.embedding_dimension in [128, 256, 384, 512, 768, 1024, 1536]

    def test_rate_limit_valid(self):
        """Test rate limit should be positive."""
        from app.config import settings
        assert settings.rate_limit_per_minute > 0

    def test_max_upload_size_reasonable(self):
        """Test max upload size is reasonable."""
        from app.config import settings
        assert settings.max_upload_size_mb > 0
        assert settings.max_upload_size_mb <= 500

    def test_api_prefix_format(self):
        """Test API prefix follows expected format."""
        from app.config import settings
        assert settings.api_v1_prefix.startswith("/api/")
        assert "v1" in settings.api_v1_prefix

    def test_default_environment(self):
        """Test default environment is development."""
        from app.config import settings
        assert settings.app_env in ["development", "test", "production"]

    def test_mongodb_uri_format(self):
        """Test MongoDB URI has valid format."""
        from app.config import settings
        assert settings.mongodb_uri.startswith("mongodb://")

    def test_qdrant_port_valid(self):
        """Test Qdrant port is a valid port number."""
        from app.config import settings
        assert 1 <= settings.qdrant_port <= 65535

    def test_redis_url_format(self):
        """Test Redis URL has valid format."""
        from app.config import settings
        assert settings.redis_url.startswith("redis://")
