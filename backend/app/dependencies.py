from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from qdrant_client import QdrantClient
from neo4j import AsyncGraphDatabase
from redis import Redis
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
import structlog

from .config import settings

logger = structlog.get_logger()

# Global clients
_mongo_client: Optional[AsyncIOMotorClient] = None
_qdrant_client: Optional[QdrantClient] = None
_neo4j_driver = None
_redis_client: Optional[Redis] = None


async def init_mongo() -> AsyncIOMotorClient:
    """Initialize MongoDB connection."""
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
        logger.info("MongoDB connection initialized")
    return _mongo_client


async def close_mongo():
    """Close MongoDB connection."""
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        logger.info("MongoDB connection closed")


async def get_mongo_db() -> AsyncIOMotorDatabase:
    """Get MongoDB database instance."""
    client = await init_mongo()
    return client[settings.mongodb_db]


def init_qdrant() -> QdrantClient:
    """Initialize Qdrant connection."""
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port
        )
        logger.info("Qdrant connection initialized")
    return _qdrant_client


def get_qdrant() -> QdrantClient:
    """Get Qdrant client instance."""
    return init_qdrant()


async def init_neo4j():
    """Initialize Neo4j connection."""
    global _neo4j_driver
    if _neo4j_driver is None:
        _neo4j_driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        logger.info("Neo4j connection initialized")
    return _neo4j_driver


async def close_neo4j():
    """Close Neo4j connection."""
    global _neo4j_driver
    if _neo4j_driver is not None:
        await _neo4j_driver.close()
        _neo4j_driver = None
        logger.info("Neo4j connection closed")


async def get_neo4j():
    """Get Neo4j driver instance."""
    return await init_neo4j()


def init_redis() -> Redis:
    """Initialize Redis connection."""
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
        logger.info("Redis connection initialized")
    return _redis_client


def get_redis() -> Redis:
    """Get Redis client instance."""
    return init_redis()


@asynccontextmanager
async def lifespan_handler():
    """Application lifespan handler for startup/shutdown."""
    # Startup
    await init_mongo()
    init_qdrant()
    await init_neo4j()
    init_redis()
    logger.info("All database connections initialized")

    yield

    # Shutdown
    await close_mongo()
    await close_neo4j()
    logger.info("All database connections closed")
