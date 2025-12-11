"""Minimal server that runs without external database dependencies.

This is useful for development/testing when the full database stack
(MongoDB, Qdrant, Neo4j, Redis) is not available.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
import uvicorn

# Import models and auth service directly
from app.config import settings
from app.models import (
    TenantCreate, UserLogin, Token,
    KnowledgeBaseCreate, ChatbotCreate, MessageCreate
)
from app.services.auth_service import create_access_token

app = FastAPI(
    title="ZAIA Fusion RAG Chatbot API (Minimal)",
    description="Minimal server for development - runs without database dependencies",
    version="1.0.0-minimal",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo
_tenants: Dict[str, dict] = {}
_knowledge_bases: Dict[str, dict] = {}
_chatbots: Dict[str, dict] = {}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0-minimal",
        "environment": settings.app_env,
        "mode": "minimal (no database)"
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ZAIA Fusion RAG Chatbot API",
        "version": "1.0.0-minimal",
        "docs": "/docs",
        "note": "Running in minimal mode without database connections"
    }


# Auth endpoints
@app.post("/api/v1/register", status_code=201)
async def register(tenant: TenantCreate):
    """Register a new tenant."""
    if tenant.email in [t["email"] for t in _tenants.values()]:
        raise HTTPException(status_code=400, detail="Email already registered")

    tenant_id = f"tenant_{len(_tenants) + 1}"
    _tenants[tenant_id] = {
        "id": tenant_id,
        "name": tenant.name,
        "email": tenant.email,
        "created_at": datetime.utcnow().isoformat()
    }

    token = create_access_token({
        "tenant_id": tenant_id,
        "email": tenant.email
    })

    return {"access_token": token, "token_type": "bearer"}


@app.post("/api/v1/login")
async def login(credentials: UserLogin):
    """Login and get access token."""
    # In minimal mode, accept any registered email
    tenant = next(
        (t for t in _tenants.values() if t["email"] == credentials.email),
        None
    )

    if not tenant:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({
        "tenant_id": tenant["id"],
        "email": tenant["email"]
    })

    return {"access_token": token, "token_type": "bearer"}


# Knowledge Base endpoints
@app.get("/api/v1/knowledge-bases")
async def list_knowledge_bases():
    """List all knowledge bases."""
    return {"items": list(_knowledge_bases.values()), "total": len(_knowledge_bases)}


@app.post("/api/v1/knowledge-bases", status_code=201)
async def create_knowledge_base(kb: KnowledgeBaseCreate):
    """Create a new knowledge base."""
    kb_id = f"kb_{len(_knowledge_bases) + 1}"
    _knowledge_bases[kb_id] = {
        "id": kb_id,
        "name": kb.name,
        "description": kb.description,
        "source_type": kb.source_type.value,
        "status": "ready",
        "document_count": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    return _knowledge_bases[kb_id]


@app.get("/api/v1/knowledge-bases/{kb_id}")
async def get_knowledge_base(kb_id: str):
    """Get a knowledge base by ID."""
    if kb_id not in _knowledge_bases:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return _knowledge_bases[kb_id]


# Chatbot endpoints
@app.get("/api/v1/chatbots")
async def list_chatbots():
    """List all chatbots."""
    return {"items": list(_chatbots.values()), "total": len(_chatbots)}


@app.post("/api/v1/chatbots", status_code=201)
async def create_chatbot(chatbot: ChatbotCreate):
    """Create a new chatbot."""
    bot_id = f"bot_{len(_chatbots) + 1}"
    _chatbots[bot_id] = {
        "id": bot_id,
        "name": chatbot.name,
        "description": chatbot.description,
        "kb_ids": chatbot.kb_ids,
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    }
    return _chatbots[bot_id]


@app.get("/api/v1/chatbots/{bot_id}")
async def get_chatbot(bot_id: str):
    """Get a chatbot by ID."""
    if bot_id not in _chatbots:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    return _chatbots[bot_id]


# Chat endpoint (mock)
@app.post("/api/v1/chatbots/{bot_id}/chat")
async def chat(bot_id: str, message: MessageCreate):
    """Send a message to a chatbot (mock response)."""
    if bot_id not in _chatbots:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    return {
        "response": f"This is a mock response from {_chatbots[bot_id]['name']}. "
                    f"In production, this would use the RAG system to generate a response. "
                    f"You asked: {message.message}",
        "sources": [],
        "session_id": message.session_id or "mock_session"
    }


# Dashboard stats
@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics."""
    return {
        "total_knowledge_bases": len(_knowledge_bases),
        "total_documents": sum(kb.get("document_count", 0) for kb in _knowledge_bases.values()),
        "total_chatbots": len(_chatbots),
        "total_conversations": 0,
        "total_messages": 0,
        "active_chatbots": sum(1 for cb in _chatbots.values() if cb.get("status") == "active")
    }


if __name__ == "__main__":
    print("Starting ZAIA RAG Chatbot API (Minimal Mode)")
    print("=" * 50)
    print(f"API docs available at: http://localhost:8000/docs")
    print(f"Health check: http://localhost:8000/health")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
