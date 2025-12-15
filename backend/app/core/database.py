from motor.motor_asyncio import AsyncIOMotorClient
from qdrant_client import QdrantClient
from qdrant_client.http.models import VectorParams, Distance
from neo4j import AsyncGraphDatabase
import redis.asyncio as redis
import asyncio
import logging
from .config import settings

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    qdrant: QdrantClient = None
    neo4j_driver = None
    redis_client = None


db = Database()


async def connect_mongodb():
    db.client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=100,
        minPoolSize=10,
        serverSelectionTimeoutMS=5000,
        socketTimeoutMS=30000,
        connectTimeoutMS=5000
    )
    # Create text index for full-text search
    await db.client[settings.MONGODB_DB_NAME].chunks.create_index([("content", "text")])
    await db.client[settings.MONGODB_DB_NAME].chunks.create_index([("tenant_id", 1)])
    await db.client[settings.MONGODB_DB_NAME].chunks.create_index([("bot_id", 1)])

    # Analytics indexes
    # Unanswered questions
    await db.client[settings.MONGODB_DB_NAME].unanswered_questions.create_index([("tenant_id", 1), ("bot_id", 1)])
    await db.client[settings.MONGODB_DB_NAME].unanswered_questions.create_index([("timestamp", -1)])
    await db.client[settings.MONGODB_DB_NAME].unanswered_questions.create_index([("resolved", 1)])

    # Conversation topics
    await db.client[settings.MONGODB_DB_NAME].conversation_topics.create_index([("tenant_id", 1), ("bot_id", 1)])
    await db.client[settings.MONGODB_DB_NAME].conversation_topics.create_index([("message_count", -1)])

    # Sentiment aggregates
    await db.client[settings.MONGODB_DB_NAME].sentiment_aggregates.create_index([("tenant_id", 1), ("bot_id", 1), ("period_start", -1)])

    # Usage patterns
    await db.client[settings.MONGODB_DB_NAME].usage_patterns.create_index([("tenant_id", 1), ("bot_id", 1), ("date", -1)])

    # Messages - add indexes for analytics queries
    await db.client[settings.MONGODB_DB_NAME].messages.create_index([("bot_id", 1), ("timestamp", -1)])
    await db.client[settings.MONGODB_DB_NAME].messages.create_index([("bot_id", 1), ("role", 1), ("sentiment.label", 1)])
    await db.client[settings.MONGODB_DB_NAME].messages.create_index([("bot_id", 1), ("quality_score.overall", 1)])

    # Performance indexes
    await db.client[settings.MONGODB_DB_NAME].messages.create_index([("bot_id", 1), ("tenant_id", 1), ("timestamp", -1)])
    await db.client[settings.MONGODB_DB_NAME].messages.create_index([("session_id", 1)])
    await db.client[settings.MONGODB_DB_NAME].conversations.create_index([("session_id", 1), ("bot_id", 1)])
    await db.client[settings.MONGODB_DB_NAME].unanswered_questions.create_index([("bot_id", 1), ("resolved", 1)])
    await db.client[settings.MONGODB_DB_NAME].leads.create_index([("bot_id", 1), ("created_at", -1)])
    await db.client[settings.MONGODB_DB_NAME].handoffs.create_index([("bot_id", 1), ("status", 1)])

    # Password reset tokens
    await db.client[settings.MONGODB_DB_NAME].password_reset_tokens.create_index([("token_hash", 1)], unique=True)
    await db.client[settings.MONGODB_DB_NAME].password_reset_tokens.create_index([("user_id", 1)])
    await db.client[settings.MONGODB_DB_NAME].password_reset_tokens.create_index([("expires_at", 1)], expireAfterSeconds=0)

    # Email verification tokens
    await db.client[settings.MONGODB_DB_NAME].email_verification_tokens.create_index([("token_hash", 1)], unique=True)
    await db.client[settings.MONGODB_DB_NAME].email_verification_tokens.create_index([("user_id", 1)])
    await db.client[settings.MONGODB_DB_NAME].email_verification_tokens.create_index([("expires_at", 1)], expireAfterSeconds=0)

    print("Connected to MongoDB")


async def connect_qdrant():
    db.qdrant = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
    # Create collection if not exists
    collections = db.qdrant.get_collections().collections
    if not any(c.name == settings.QDRANT_COLLECTION for c in collections):
        db.qdrant.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=VectorParams(
                size=settings.EMBEDDING_DIMENSION,
                distance=Distance.COSINE
            )
        )
    print("Connected to Qdrant")


async def connect_neo4j():
    db.neo4j_driver = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
    )
    # Retry connecting to Neo4j with backoff
    max_retries = 10
    for attempt in range(max_retries):
        try:
            async with db.neo4j_driver.session() as session:
                await session.run("CREATE INDEX IF NOT EXISTS FOR (e:Entity) ON (e.tenant_id)")
                await session.run("CREATE INDEX IF NOT EXISTS FOR (e:Entity) ON (e.name)")
            print("Connected to Neo4j")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1, 2, 4, 8, 16...
                print(f"Neo4j not ready (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                print(f"Failed to connect to Neo4j after {max_retries} attempts")
                raise


async def connect_redis():
    db.redis_client = redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=50,
        socket_connect_timeout=5,
        socket_keepalive=True
    )
    print("Connected to Redis")


async def ensure_context_indexes():
    """Create indexes for context management collections."""
    db_instance = get_mongodb()

    try:
        # User profiles indexes
        await db_instance.user_profiles.create_index(
            [("email", 1), ("tenant_id", 1), ("bot_id", 1)],
            unique=True,
            sparse=True  # Allow null emails
        )
        await db_instance.user_profiles.create_index(
            [("phone", 1), ("tenant_id", 1), ("bot_id", 1)],
            unique=True,
            sparse=True  # Allow null phones
        )
        await db_instance.user_profiles.create_index(
            [("tenant_id", 1), ("bot_id", 1), ("updated_at", -1)]
        )

        # Add intent/stage indexes to messages
        await db_instance.messages.create_index([("session_id", 1), ("intent", 1)])
        await db_instance.messages.create_index([("bot_id", 1), ("stage", 1)])

        logger.info("Context management indexes created")
    except Exception as e:
        logger.error(f"Failed to create context indexes: {e}")


async def ensure_audit_indexes():
    """Create indexes for audit_logs collection."""
    db_instance = get_mongodb()

    try:
        # Primary timestamp index for chronological queries
        await db_instance.audit_logs.create_index([("timestamp", -1)])

        # Event type + timestamp for filtering by event type
        await db_instance.audit_logs.create_index([("event_type", 1), ("timestamp", -1)])

        # User activity tracking
        await db_instance.audit_logs.create_index([("user_id", 1), ("timestamp", -1)])

        # Severity-based queries for alerts and monitoring
        await db_instance.audit_logs.create_index([("severity", 1), ("timestamp", -1)])

        # Tenant isolation for multi-tenant queries
        await db_instance.audit_logs.create_index([("tenant_id", 1), ("timestamp", -1)])

        # Bot-specific audit trails
        await db_instance.audit_logs.create_index([("bot_id", 1), ("timestamp", -1)])

        # Resource tracking
        await db_instance.audit_logs.create_index([("resource_type", 1), ("resource_id", 1), ("timestamp", -1)])

        # Action result filtering (success/failure)
        await db_instance.audit_logs.create_index([("action_result", 1), ("timestamp", -1)])

        # TTL index for automatic cleanup after 365 days (31536000 seconds)
        # This will automatically delete audit logs older than 1 year
        await db_instance.audit_logs.create_index(
            [("timestamp", 1)],
            expireAfterSeconds=31536000
        )

        logger.info("Audit log indexes created")
    except Exception as e:
        logger.error(f"Failed to create audit indexes: {e}")


async def connect_all():
    await connect_mongodb()
    await connect_qdrant()
    await connect_neo4j()
    await connect_redis()
    await ensure_context_indexes()
    await ensure_audit_indexes()


async def close_all():
    if db.client:
        db.client.close()
    if db.neo4j_driver:
        await db.neo4j_driver.close()
    if db.redis_client:
        await db.redis_client.close()


def get_mongodb():
    return db.client[settings.MONGODB_DB_NAME]


def get_qdrant():
    return db.qdrant


def get_neo4j():
    return db.neo4j_driver


def get_redis():
    return db.redis_client
