"""
Main ingestion pipeline orchestrator.

Coordinates the complete document ingestion workflow:
1. Load documents from various sources
2. Process and chunk text
3. Extract entities
4. Generate embeddings
5. Store in vector, document, and graph databases
"""

import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
import asyncio
from datetime import datetime

from .loaders import PDFLoader, DOCXLoader, URLLoader, TextLoader
from .processors import SmartChunker, EntityExtractor
from .embedders import Embedder
from .stores import QdrantStore, MongoStore, Neo4jStore

from app.models.knowledge_base import (
    ProcessingStatus,
    ChunkDocument,
    ChunkMetadata,
)

logger = logging.getLogger(__name__)


class IngestTask:
    """Represents an ingestion task with its state and results."""

    def __init__(self, tenant_id: str, kb_id: str, file_path: Optional[str] = None, url: Optional[str] = None):
        self.tenant_id = tenant_id
        self.kb_id = kb_id
        self.file_path = file_path
        self.url = url
        self.status = ProcessingStatus.PENDING
        self.error: Optional[str] = None
        self.chunks_processed = 0
        self.tokens_processed = 0
        self.entities_extracted = 0
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary."""
        return {
            "tenant_id": self.tenant_id,
            "kb_id": self.kb_id,
            "file_path": self.file_path,
            "url": self.url,
            "status": self.status,
            "error": self.error,
            "chunks_processed": self.chunks_processed,
            "tokens_processed": self.tokens_processed,
            "entities_extracted": self.entities_extracted,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class IngestionPipeline:
    """
    Main orchestrator for the knowledge ingestion pipeline.

    Handles the complete workflow from document loading to storage in multiple backends.
    Supports async processing and can be integrated with Celery for distributed task execution.
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        embedding_model: str = "all-MiniLM-L6-v2",
    ):
        """
        Initialize the ingestion pipeline.

        Args:
            chunk_size: Maximum size of text chunks in tokens
            chunk_overlap: Number of overlapping tokens between chunks
            embedding_model: Name of the sentence-transformers model to use
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Initialize components
        self.loaders = {
            ".pdf": PDFLoader(),
            ".docx": DOCXLoader(),
            ".txt": TextLoader(),
            ".md": TextLoader(),
            ".csv": TextLoader(),
        }
        self.url_loader = URLLoader()
        self.chunker = SmartChunker()
        self.entity_extractor = EntityExtractor()
        self.embedder = Embedder(model_name=embedding_model)

        # Initialize stores
        self.vector_store = QdrantStore()
        self.mongo_store = MongoStore()
        self.graph_store = Neo4jStore()

        logger.info("Ingestion pipeline initialized")

    async def initialize(self):
        """Initialize async components."""
        try:
            await self.embedder.initialize()
            await self.vector_store.initialize()
            await self.mongo_store.initialize()
            await self.graph_store.initialize()
            logger.info("All pipeline components initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize pipeline components: {e}")
            raise

    async def close(self):
        """Close all connections."""
        try:
            await self.vector_store.close()
            await self.mongo_store.close()
            await self.graph_store.close()
            logger.info("All pipeline connections closed")
        except Exception as e:
            logger.error(f"Error closing pipeline connections: {e}")

    def _get_loader(self, file_path: str):
        """Get appropriate loader for file type."""
        suffix = Path(file_path).suffix.lower()
        loader = self.loaders.get(suffix)
        if not loader:
            raise ValueError(f"Unsupported file type: {suffix}")
        return loader

    async def _load_document(
        self,
        file_path: Optional[str] = None,
        url: Optional[str] = None,
        text: Optional[str] = None,
    ) -> tuple[str, Dict[str, Any]]:
        """
        Load document from various sources.

        Args:
            file_path: Path to file to load
            url: URL to scrape
            text: Raw text content

        Returns:
            Tuple of (text_content, metadata)
        """
        try:
            if url:
                logger.info(f"Loading content from URL: {url}")
                content, metadata = await self.url_loader.load(url)
                metadata["source_url"] = url
                return content, metadata

            elif file_path:
                logger.info(f"Loading content from file: {file_path}")
                loader = self._get_loader(file_path)
                content, metadata = await loader.load(file_path)
                metadata["source_file"] = Path(file_path).name
                return content, metadata

            elif text:
                logger.info("Loading raw text content")
                return text, {"source_type": "text"}

            else:
                raise ValueError("Must provide either file_path, url, or text")

        except Exception as e:
            logger.error(f"Failed to load document: {e}")
            raise

    async def _process_chunks(
        self,
        text: str,
        base_metadata: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Process text into chunks with metadata.

        Args:
            text: Raw text content
            base_metadata: Base metadata to attach to all chunks

        Returns:
            List of chunk dictionaries with text and metadata
        """
        try:
            logger.info(f"Chunking document (size: {len(text)} chars)")
            chunks = await self.chunker.chunk(
                text=text,
                chunk_size=self.chunk_size,
                overlap=self.chunk_overlap,
            )

            # Enhance each chunk with metadata
            processed_chunks = []
            for i, chunk in enumerate(chunks):
                chunk_data = {
                    "text": chunk["text"],
                    "metadata": {
                        **base_metadata,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "token_count": chunk.get("token_count", 0),
                        "char_count": len(chunk["text"]),
                    },
                }

                # Add position information if available
                if "start_pos" in chunk:
                    chunk_data["metadata"]["start_pos"] = chunk["start_pos"]
                if "end_pos" in chunk:
                    chunk_data["metadata"]["end_pos"] = chunk["end_pos"]

                processed_chunks.append(chunk_data)

            logger.info(f"Created {len(processed_chunks)} chunks")
            return processed_chunks

        except Exception as e:
            logger.error(f"Failed to process chunks: {e}")
            raise

    async def _extract_entities(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract entities from chunks.

        Args:
            chunks: List of chunk dictionaries

        Returns:
            Chunks enhanced with entity information
        """
        try:
            logger.info(f"Extracting entities from {len(chunks)} chunks")

            # Extract entities in batch for efficiency
            texts = [chunk["text"] for chunk in chunks]
            entities_batch = await self.entity_extractor.extract_batch(texts)

            # Add entities to chunks
            for chunk, entities in zip(chunks, entities_batch):
                chunk["entities"] = entities
                chunk["metadata"]["entity_count"] = len(entities)

            total_entities = sum(len(chunk["entities"]) for chunk in chunks)
            logger.info(f"Extracted {total_entities} entities total")

            return chunks

        except Exception as e:
            logger.error(f"Failed to extract entities: {e}")
            # Don't fail the pipeline if entity extraction fails
            logger.warning("Continuing without entity extraction")
            for chunk in chunks:
                chunk["entities"] = []
                chunk["metadata"]["entity_count"] = 0
            return chunks

    async def _generate_embeddings(self, chunks: List[Dict[str, Any]]) -> List[List[float]]:
        """
        Generate embeddings for chunks.

        Args:
            chunks: List of chunk dictionaries

        Returns:
            List of embedding vectors
        """
        try:
            logger.info(f"Generating embeddings for {len(chunks)} chunks")
            texts = [chunk["text"] for chunk in chunks]
            embeddings = await self.embedder.embed_batch(texts)
            logger.info(f"Generated {len(embeddings)} embeddings")
            return embeddings

        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            raise

    async def _store_data(
        self,
        tenant_id: str,
        kb_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
    ):
        """
        Store chunks and embeddings in all storage backends.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            chunks: List of chunk dictionaries
            embeddings: List of embedding vectors
        """
        try:
            logger.info(f"Storing {len(chunks)} chunks in all backends")

            # Store in parallel for better performance
            await asyncio.gather(
                self.vector_store.upsert(tenant_id, kb_id, chunks, embeddings),
                self.mongo_store.upsert(tenant_id, kb_id, chunks),
                self.graph_store.upsert(tenant_id, kb_id, chunks),
            )

            logger.info("Successfully stored data in all backends")

        except Exception as e:
            logger.error(f"Failed to store data: {e}")
            raise

    async def ingest(
        self,
        tenant_id: str,
        kb_id: str,
        file_path: Optional[str] = None,
        url: Optional[str] = None,
        text: Optional[str] = None,
    ) -> IngestTask:
        """
        Execute the complete ingestion pipeline.

        Args:
            tenant_id: Tenant identifier
            kb_id: Knowledge base identifier
            file_path: Path to file to ingest
            url: URL to scrape and ingest
            text: Raw text to ingest

        Returns:
            IngestTask with processing results
        """
        task = IngestTask(tenant_id=tenant_id, kb_id=kb_id, file_path=file_path, url=url)
        task.status = ProcessingStatus.PROCESSING
        task.started_at = datetime.utcnow()

        try:
            logger.info(f"Starting ingestion for tenant={tenant_id}, kb={kb_id}")

            # Step 1: Load document
            text_content, base_metadata = await self._load_document(
                file_path=file_path,
                url=url,
                text=text,
            )

            # Step 2: Process into chunks
            chunks = await self._process_chunks(text_content, base_metadata)

            # Step 3: Extract entities
            chunks = await self._extract_entities(chunks)

            # Step 4: Generate embeddings
            embeddings = await self._generate_embeddings(chunks)

            # Step 5: Store in all backends
            await self._store_data(tenant_id, kb_id, chunks, embeddings)

            # Update task results
            task.status = ProcessingStatus.READY
            task.chunks_processed = len(chunks)
            task.tokens_processed = sum(
                chunk["metadata"].get("token_count", 0) for chunk in chunks
            )
            task.entities_extracted = sum(len(chunk["entities"]) for chunk in chunks)
            task.completed_at = datetime.utcnow()

            logger.info(
                f"Ingestion completed successfully: "
                f"{task.chunks_processed} chunks, "
                f"{task.tokens_processed} tokens, "
                f"{task.entities_extracted} entities"
            )

            return task

        except Exception as e:
            task.status = ProcessingStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.utcnow()
            logger.error(f"Ingestion failed: {e}", exc_info=True)
            return task


# Global pipeline instance
_pipeline: Optional[IngestionPipeline] = None


async def get_pipeline() -> IngestionPipeline:
    """Get or create the global pipeline instance."""
    global _pipeline
    if _pipeline is None:
        _pipeline = IngestionPipeline()
        await _pipeline.initialize()
    return _pipeline


async def ingest_document(
    tenant_id: str,
    kb_id: str,
    file_path: Optional[str] = None,
    url: Optional[str] = None,
    text: Optional[str] = None,
) -> IngestTask:
    """
    Main entry point for document ingestion.

    This function can be called directly or wrapped in a Celery task for async processing.

    Args:
        tenant_id: Tenant identifier
        kb_id: Knowledge base identifier
        file_path: Path to file to ingest
        url: URL to scrape and ingest
        text: Raw text to ingest

    Returns:
        IngestTask with processing results

    Example:
        >>> # Ingest a PDF file
        >>> task = await ingest_document(
        ...     tenant_id="tenant_123",
        ...     kb_id="kb_456",
        ...     file_path="/path/to/document.pdf"
        ... )
        >>> print(f"Processed {task.chunks_processed} chunks")

        >>> # Ingest from URL
        >>> task = await ingest_document(
        ...     tenant_id="tenant_123",
        ...     kb_id="kb_456",
        ...     url="https://example.com/article"
        ... )
    """
    pipeline = await get_pipeline()
    return await pipeline.ingest(
        tenant_id=tenant_id,
        kb_id=kb_id,
        file_path=file_path,
        url=url,
        text=text,
    )


# Celery task wrapper (requires celery to be configured)
# Uncomment when Celery is set up:
#
# from celery import shared_task
#
# @shared_task(bind=True, max_retries=3)
# def ingest_document_task(
#     self,
#     tenant_id: str,
#     kb_id: str,
#     file_path: Optional[str] = None,
#     url: Optional[str] = None,
#     text: Optional[str] = None,
# ):
#     """Celery task wrapper for async document ingestion."""
#     try:
#         loop = asyncio.get_event_loop()
#         task = loop.run_until_complete(
#             ingest_document(tenant_id, kb_id, file_path, url, text)
#         )
#         return task.to_dict()
#     except Exception as exc:
#         logger.error(f"Celery task failed: {exc}")
#         raise self.retry(exc=exc, countdown=60)
