from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
from .core.database import connect_all, close_all, check_mongodb_health, check_redis_health, check_qdrant_health, check_neo4j_health
from .services.llm import close_http_client
from .core.config import settings
from .api import auth, chatbots, chat, integrations, admin, users, analytics, leads, handoff, translation, feedback, api_keys, greeting, gdpr, booking, messenger, messenger_webhook, marketing, seo, learning


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_all()
    yield
    # Shutdown
    await close_all()
    await close_http_client()


app = FastAPI(
    title="ZAIA Chatbot API",
    description="Multi-tenant RAG chatbot with triple-database retrieval",
    version="1.0.0",
    lifespan=lifespan
)

# Register rate limiter
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Allow all origins for embeddable widget support
# The widget can be embedded on any customer website
# Authenticated endpoints are protected by JWT tokens
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    max_age=3600,
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Standard security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    # HSTS - Production only
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Content Security Policy
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.deepseek.com https://*.zaiasystems.com https://aidenlink.cloud",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'"
    ]
    response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

    return response

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(chatbots.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(leads.router, prefix="/api/v1")
app.include_router(handoff.router, prefix="/api/v1")
app.include_router(translation.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(greeting.router, prefix="/api/v1")
app.include_router(gdpr.router, prefix="/api/v1")
app.include_router(booking.router, prefix="/api/v1")
app.include_router(messenger.router, prefix="/api/v1")
app.include_router(messenger_webhook.router, prefix="/api/v1")
app.include_router(marketing.router, prefix="/api/v1")
app.include_router(seo.router, prefix="/api/v1")
app.include_router(learning.router, prefix="/api/v1")

# Serve widget static files
widget_path = "/app/widget"
if os.path.exists(widget_path):
    app.mount("/widget", StaticFiles(directory=widget_path), name="widget")


@app.get("/")
async def root():
    return {"message": "ZAIA Chatbot API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Comprehensive health check for load balancers."""
    mongo_ok, mongo_msg = await check_mongodb_health()
    redis_ok, redis_msg = await check_redis_health()
    qdrant_ok, qdrant_msg = await check_qdrant_health()
    neo4j_ok, neo4j_msg = await check_neo4j_health()

    all_healthy = mongo_ok and redis_ok and qdrant_ok and neo4j_ok

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "services": {
                "mongodb": {"status": "ok" if mongo_ok else "error", "message": mongo_msg},
                "redis": {"status": "ok" if redis_ok else "error", "message": redis_msg},
                "qdrant": {"status": "ok" if qdrant_ok else "error", "message": qdrant_msg},
                "neo4j": {"status": "ok" if neo4j_ok else "error", "message": neo4j_msg}
            }
        }
    )


@app.get("/api/v1/health")
async def api_health():
    """Simple health check for API availability."""
    mongo_ok, _ = await check_mongodb_health()
    redis_ok, _ = await check_redis_health()

    all_healthy = mongo_ok and redis_ok

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "service": "zaia-chatbot-api"
        }
    )
