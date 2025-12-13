from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .core.database import connect_all, close_all
from .api import auth, chatbots, chat, integrations, admin, users, analytics, leads, handoff, translation, feedback, api_keys


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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/")
async def root():
    return {"message": "ZAIA Chatbot API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/v1/health")
async def api_health():
    return {"status": "healthy", "service": "zaia-chatbot-api"}
