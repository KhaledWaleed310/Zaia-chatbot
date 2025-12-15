from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .core.database import connect_all, close_all
from .core.config import settings
from .api import auth, chatbots, chat, integrations, admin, users, analytics, leads, handoff, translation, feedback, api_keys, greeting, gdpr


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_all()
    yield
    # Shutdown
    await close_all()


app = FastAPI(
    title="ZAIA Chatbot API",
    description="Multi-tenant RAG chatbot with triple-database retrieval",
    version="1.0.0",
    lifespan=lifespan
)

# Register rate limiter
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Environment-dependent origins
cors_origins = [
    "https://chatbot.zaiasystems.com",
    "https://app.zaiasystems.com",
    "https://aidenlink.cloud"
]

# Add localhost origins only in development/staging
if settings.ENVIRONMENT in ["development", "staging"]:
    cors_origins.extend([
        "http://localhost:5173",
        "http://localhost:3000"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
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


@app.get("/")
async def root():
    return {"message": "ZAIA Chatbot API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/v1/health")
async def api_health():
    return {"status": "healthy", "service": "zaia-chatbot-api"}
