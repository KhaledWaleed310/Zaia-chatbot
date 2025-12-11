"""
Knowledge ingestion pipeline for ZAIA RAG Chatbot Platform.

This module provides a complete ingestion pipeline for processing various document types,
extracting entities, generating embeddings, and storing in multiple backends (Qdrant, MongoDB, Neo4j).
"""

from .pipeline import ingest_document, IngestTask

__all__ = [
    "ingest_document",
    "IngestTask",
]
