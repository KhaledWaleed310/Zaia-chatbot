"""Tests for Pydantic models."""

import pytest
from datetime import datetime
from pydantic import ValidationError


class TestTenantModels:
    """Tests for tenant-related models."""

    def test_tenant_create_valid(self):
        """Test valid tenant creation data."""
        from app.models import TenantCreate

        tenant = TenantCreate(
            name="Test Company",
            email="test@example.com",
            password="securepass123"
        )

        assert tenant.name == "Test Company"
        assert tenant.email == "test@example.com"
        assert tenant.password == "securepass123"

    def test_tenant_create_invalid_email(self):
        """Test tenant creation with invalid email."""
        from app.models import TenantCreate

        with pytest.raises(ValidationError):
            TenantCreate(
                name="Test",
                email="not-an-email",
                password="securepass123"
            )

    def test_tenant_create_short_name(self):
        """Test tenant creation with too short name."""
        from app.models import TenantCreate

        with pytest.raises(ValidationError):
            TenantCreate(
                name="T",  # Too short (min 2)
                email="test@example.com",
                password="securepass123"
            )

    def test_tenant_create_short_password(self):
        """Test tenant creation with too short password."""
        from app.models import TenantCreate

        with pytest.raises(ValidationError):
            TenantCreate(
                name="Test Company",
                email="test@example.com",
                password="short"  # Too short (min 8)
            )

    def test_api_key_model(self):
        """Test APIKey model."""
        from app.models import APIKey

        api_key = APIKey(
            key="test_api_key_12345",
            name="Production Key"
        )

        assert api_key.key == "test_api_key_12345"
        assert api_key.name == "Production Key"
        assert api_key.last_used is None
        assert isinstance(api_key.created_at, datetime)


class TestUserModels:
    """Tests for user-related models."""

    def test_user_login_valid(self):
        """Test valid user login data."""
        from app.models import UserLogin

        login = UserLogin(
            email="user@example.com",
            password="mypassword123"
        )

        assert login.email == "user@example.com"
        assert login.password == "mypassword123"

    def test_token_model(self):
        """Test Token model."""
        from app.models import Token

        token = Token(
            access_token="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
        )

        assert token.access_token.startswith("eyJ")
        assert token.token_type == "bearer"

    def test_token_data_model(self):
        """Test TokenData model."""
        from app.models import TokenData

        token_data = TokenData(
            tenant_id="tenant_123",
            user_id="user_456",
            email="test@example.com"
        )

        assert token_data.tenant_id == "tenant_123"
        assert token_data.user_id == "user_456"
        assert token_data.email == "test@example.com"


class TestKnowledgeBaseModels:
    """Tests for knowledge base models."""

    def test_knowledge_base_create(self):
        """Test knowledge base creation model."""
        from app.models import KnowledgeBaseCreate
        from app.models.knowledge_base import SourceType

        kb = KnowledgeBaseCreate(
            name="Test KB",
            description="Test knowledge base description",
            source_type=SourceType.FILE
        )

        assert kb.name == "Test KB"
        assert kb.description == "Test knowledge base description"
        assert kb.source_type == SourceType.FILE

    def test_knowledge_base_create_defaults(self):
        """Test knowledge base creation with default source type."""
        from app.models import KnowledgeBaseCreate
        from app.models.knowledge_base import SourceType

        kb = KnowledgeBaseCreate(name="Test KB")

        assert kb.source_type == SourceType.FILE


class TestChatbotModels:
    """Tests for chatbot models."""

    def test_chatbot_create(self):
        """Test chatbot creation model."""
        from app.models import ChatbotCreate

        chatbot = ChatbotCreate(
            name="Test Bot",
            description="A helpful test bot",
            kb_ids=["kb_123"]
        )

        assert chatbot.name == "Test Bot"
        assert chatbot.description == "A helpful test bot"
        assert "kb_123" in chatbot.kb_ids

    def test_chatbot_create_defaults(self):
        """Test chatbot creation with defaults."""
        from app.models import ChatbotCreate

        chatbot = ChatbotCreate(name="Test Bot")

        assert chatbot.kb_ids == []
        assert chatbot.config is None

    def test_chatbot_config_defaults(self):
        """Test chatbot config has sensible defaults."""
        from app.models.chatbot import ChatbotConfig

        config = ChatbotConfig()

        assert config.temperature >= 0 and config.temperature <= 2
        assert config.max_tokens >= 100 and config.max_tokens <= 4000
        assert config.welcome_message is not None
        assert config.show_sources is True
        assert config.enable_feedback is True


class TestConversationModels:
    """Tests for conversation models."""

    def test_message_create(self):
        """Test message creation model."""
        from app.models import MessageCreate

        message = MessageCreate(
            message="Hello, how are you?"
        )

        assert message.message == "Hello, how are you?"

    def test_message_create_empty_fails(self):
        """Test empty message content fails validation."""
        from app.models import MessageCreate

        # MessageCreate should require non-empty content
        with pytest.raises(ValidationError):
            MessageCreate(message="")
