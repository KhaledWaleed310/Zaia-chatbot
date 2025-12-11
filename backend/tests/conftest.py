"""Pytest configuration and fixtures."""

import sys
from unittest.mock import MagicMock

# Mock heavy dependencies before any imports that might use them
mock_modules = {
    'qdrant_client': MagicMock(),
    'neo4j': MagicMock(),
    'redis': MagicMock(),
    'celery': MagicMock(),
    'sentence_transformers': MagicMock(),
}

for module_name, mock_module in mock_modules.items():
    if module_name not in sys.modules:
        sys.modules[module_name] = mock_module

import pytest
from datetime import datetime


@pytest.fixture
def sample_tenant_data():
    """Sample tenant registration data."""
    return {
        "name": "Test Company",
        "email": "test@example.com",
        "password": "securepassword123"
    }


@pytest.fixture
def sample_tenant_in_db():
    """Sample tenant document as stored in database."""
    return {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Test Company",
        "email": "test@example.com",
        "password_hash": "$2b$12$K.7tGNK.L4sVvJ7pVvJ7eOx8XpK.7tGNK.L4sVvJ7pVvJ7eOx8XpK.",
        "plan": "free",
        "usage": {
            "messages_this_month": 0,
            "storage_bytes": 0,
            "knowledge_bases": 0,
            "chatbots": 0,
        },
        "api_keys": [],
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }


@pytest.fixture
def sample_chatbot_data():
    """Sample chatbot creation data."""
    return {
        "name": "Test Bot",
        "description": "A test chatbot",
        "knowledge_base_id": "507f1f77bcf86cd799439012",
        "config": {
            "welcome_message": "Hello! How can I help you?",
            "system_prompt": "You are a helpful assistant.",
            "temperature": 0.7,
            "max_tokens": 500
        }
    }


@pytest.fixture
def sample_knowledge_base_data():
    """Sample knowledge base creation data."""
    return {
        "name": "Test Knowledge Base",
        "description": "A test knowledge base"
    }
