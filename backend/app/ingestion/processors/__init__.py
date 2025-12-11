"""
Text processors for chunking and entity extraction.

Provides intelligent text processing capabilities:
- Smart chunking with sentence boundary detection
- Entity extraction using NLP models
"""

from .chunker import SmartChunker
from .entity_extractor import EntityExtractor

__all__ = [
    "SmartChunker",
    "EntityExtractor",
]
