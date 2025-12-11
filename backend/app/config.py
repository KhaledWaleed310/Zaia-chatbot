try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings  # Fallback for pydantic v1
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application configuration settings."""

    # App
    app_env: str = "development"
    secret_key: str = "dev-secret-key-change-in-production"
    api_v1_prefix: str = "/api/v1"

    # JWT
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "zaia_chatbot"

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # DeepSeek
    deepseek_api_key: Optional[str] = None
    deepseek_base_url: str = "https://api.deepseek.com/v1"

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    # Rate Limiting
    rate_limit_per_minute: int = 60

    # File Upload
    max_upload_size_mb: int = 50
    allowed_extensions: list = [".pdf", ".docx", ".txt", ".csv", ".md"]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
