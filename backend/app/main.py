from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from .config import settings
from .dependencies import lifespan_handler
from .api.v1 import auth, tenants, knowledge, chatbots, chat, analytics

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer() if settings.app_env == "development" else structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    async with lifespan_handler():
        logger.info("ZAIA RAG Chatbot API started", env=settings.app_env)
        yield
        logger.info("ZAIA RAG Chatbot API shutting down")


app = FastAPI(
    title="ZAIA Fusion RAG Chatbot API",
    description="Multi-tenant embeddable chatbot platform with triple-retrieval RAG system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix=settings.api_v1_prefix, tags=["Authentication"])
app.include_router(tenants.router, prefix=settings.api_v1_prefix, tags=["Tenants"])
app.include_router(knowledge.router, prefix=settings.api_v1_prefix, tags=["Knowledge Base"])
app.include_router(chatbots.router, prefix=settings.api_v1_prefix, tags=["Chatbots"])
app.include_router(chat.router, prefix=settings.api_v1_prefix, tags=["Chat"])
app.include_router(analytics.router, prefix=settings.api_v1_prefix, tags=["Analytics"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.app_env
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ZAIA Fusion RAG Chatbot API",
        "version": "1.0.0",
        "docs": "/docs"
    }
