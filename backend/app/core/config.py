from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ZAIA Chatbot"
    DEBUG: bool = False

    # JWT
    JWT_SECRET: str = "zaia_jwt_secret_key_change_in_production_2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # MongoDB
    MONGODB_URL: str = "mongodb://zaia_admin:zaia_secure_pass_2024@localhost:27017"
    MONGODB_DB_NAME: str = "zaia_chatbot"

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "zaia_embeddings"

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "zaia_neo4j_pass_2024"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # DeepSeek
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_API_BASE: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384

    # Chunking
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50

    # RAG Fusion Weights
    VECTOR_WEIGHT: float = 0.5
    MONGO_WEIGHT: float = 0.3
    GRAPH_WEIGHT: float = 0.2

    # OAuth - Google (Drive & Gmail)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # OAuth - Notion
    NOTION_CLIENT_ID: Optional[str] = None
    NOTION_CLIENT_SECRET: Optional[str] = None

    # OAuth - Slack
    SLACK_CLIENT_ID: Optional[str] = None
    SLACK_CLIENT_SECRET: Optional[str] = None

    # OAuth - HubSpot
    HUBSPOT_CLIENT_ID: Optional[str] = None
    HUBSPOT_CLIENT_SECRET: Optional[str] = None

    # OAuth Settings
    OAUTH_REDIRECT_BASE: str = "http://localhost:8000"
    ENCRYPTION_KEY: Optional[str] = None  # 32-byte base64 encoded key for Fernet

    # Email (Resend)
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "Aiden <noreply@aidenlink.cloud>"
    FRONTEND_URL: str = "https://chatbot.zaiasystems.com"

    class Config:
        env_file = ".env"


settings = Settings()
