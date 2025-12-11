# ZAIA RAG Chatbot - Knowledge Ingestion Pipeline

Complete, production-ready knowledge ingestion pipeline for the ZAIA RAG Chatbot Platform.

## Overview

This pipeline orchestrates the complete workflow for ingesting documents into the knowledge base:

1. **Load** documents from various sources (PDF, DOCX, URLs, text files)
2. **Chunk** text intelligently using sentence boundaries
3. **Extract** named entities using NLP
4. **Generate** embeddings for semantic search
5. **Store** in multiple backends (Qdrant, MongoDB, Neo4j)

## Architecture

```
ingestion/
├── __init__.py              # Main exports
├── pipeline.py              # Main orchestrator
├── loaders/                 # Document loaders
│   ├── __init__.py
│   ├── pdf_loader.py       # PDF documents (pypdf)
│   ├── docx_loader.py      # Word documents (python-docx)
│   ├── url_loader.py       # Web pages (httpx + trafilatura)
│   └── text_loader.py      # Plain text/markdown
├── processors/              # Text processors
│   ├── __init__.py
│   ├── chunker.py          # Smart chunking with sentence boundaries
│   └── entity_extractor.py # Entity extraction (spaCy)
├── embedders/               # Embedding generation
│   ├── __init__.py
│   └── embedder.py         # Sentence-transformers embeddings
└── stores/                  # Storage backends
    ├── __init__.py
    ├── vector_store.py     # Qdrant vector storage
    ├── mongo_store.py      # MongoDB full-text search
    └── graph_store.py      # Neo4j knowledge graph
```

## Dependencies

Install required packages:

```bash
# Core dependencies
pip install pypdf python-docx httpx trafilatura
pip install sentence-transformers spacy
pip install qdrant-client motor neo4j

# Download spaCy model
python -m spacy download en_core_web_sm
```

## Usage

### Basic Usage

```python
from app.ingestion import ingest_document

# Ingest a PDF file
task = await ingest_document(
    tenant_id="tenant_123",
    kb_id="kb_456",
    file_path="/path/to/document.pdf"
)

print(f"Processed {task.chunks_processed} chunks")
print(f"Extracted {task.entities_extracted} entities")
```

### Ingest from URL

```python
task = await ingest_document(
    tenant_id="tenant_123",
    kb_id="kb_456",
    url="https://example.com/article"
)
```

### Ingest Plain Text

```python
task = await ingest_document(
    tenant_id="tenant_123",
    kb_id="kb_456",
    text="Your text content here..."
)
```

### Custom Pipeline Configuration

```python
from app.ingestion.pipeline import IngestionPipeline

pipeline = IngestionPipeline(
    chunk_size=512,
    chunk_overlap=50,
    embedding_model="all-MiniLM-L6-v2"
)

await pipeline.initialize()

task = await pipeline.ingest(
    tenant_id="tenant_123",
    kb_id="kb_456",
    file_path="/path/to/document.pdf"
)

await pipeline.close()
```

## Components

### 1. Loaders

#### PDF Loader
- Uses `pypdf` for text extraction
- Preserves page numbers and metadata
- Handles multi-page documents
- Extracts document properties (title, author, etc.)

#### DOCX Loader
- Uses `python-docx` for Word documents
- Preserves paragraph structure
- Extracts tables
- Maintains heading hierarchy

#### URL Loader
- Uses `httpx` for HTTP requests
- Uses `trafilatura` for content extraction
- Removes navigation, ads, and boilerplate
- Extracts metadata (title, author, date)

#### Text Loader
- Supports .txt, .md, .csv, .json
- Auto-detects encoding (UTF-8, Latin-1, etc.)
- Format-specific metadata extraction
- Line and paragraph counting

### 2. Processors

#### Smart Chunker
- Respects sentence boundaries
- Configurable chunk size and overlap
- Preserves context between chunks
- Semantic unit detection (paragraphs, sections)
- Token estimation for chunk sizing

**Features:**
- Sentence boundary detection
- Paragraph-aware chunking
- Markdown section detection
- Metadata preservation
- Overlap for context continuity

#### Entity Extractor
- Uses spaCy for NLP
- Extracts named entities:
  - PERSON: People names
  - ORG: Organizations
  - GPE: Locations (countries, cities)
  - PRODUCT: Products and services
  - EVENT: Named events
  - And more...
- Builds entity co-occurrence graphs
- Supports batch processing

### 3. Embedders

#### Embedder
- Uses sentence-transformers models
- Default: all-MiniLM-L6-v2 (384 dimensions)
- Batch embedding for efficiency
- Cosine similarity computation
- GPU support (CUDA)

**Methods:**
- `embed(text)`: Single text embedding
- `embed_batch(texts)`: Batch embedding
- `compute_similarity(text1, text2)`: Similarity score
- `find_most_similar(query, candidates)`: Ranking

### 4. Stores

#### Qdrant Vector Store
- Semantic similarity search
- Cosine distance metric
- Multi-tenant collections
- Batch upsert for performance
- Metadata filtering

**Operations:**
- `upsert()`: Store chunks and embeddings
- `search()`: Vector similarity search
- `delete()`: Remove knowledge base data
- `get_collection_info()`: Statistics

#### MongoDB Store
- Full-text search
- Metadata storage
- Entity-based queries
- Rich indexing

**Operations:**
- `upsert()`: Store chunk documents
- `search_text()`: Full-text search
- `search_entities()`: Entity-based search
- `get_by_metadata()`: Metadata filtering
- `get_stats()`: Statistics
- `delete()`: Remove data

#### Neo4j Graph Store
- Knowledge graph storage
- Entity relationships
- Co-occurrence tracking
- Graph traversal

**Operations:**
- `upsert()`: Store entities and relationships
- `find_related_entities()`: Relationship queries
- `get_entity_graph()`: Graph visualization data
- `delete()`: Remove graph data
- `get_stats()`: Statistics

## Pipeline Flow

```
1. Load Document
   ↓
   [Loader] → Extract text + metadata

2. Process Text
   ↓
   [Chunker] → Split into intelligent chunks
   ↓
   [Entity Extractor] → Extract named entities

3. Generate Embeddings
   ↓
   [Embedder] → Create vector embeddings

4. Store Data
   ↓
   [Qdrant] → Vector search
   [MongoDB] → Full-text search
   [Neo4j] → Knowledge graph
```

## Error Handling

The pipeline includes comprehensive error handling:

- **Loader errors**: File not found, unsupported format, corrupted files
- **Processing errors**: Encoding issues, empty content, malformed data
- **Embedding errors**: Model loading, GPU/CPU issues
- **Storage errors**: Connection failures, authentication, data conflicts

All errors are logged with context and the pipeline returns a task status indicating success or failure.

## Logging

Configure logging to monitor pipeline execution:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Performance

### Optimization Tips

1. **Batch Processing**: Use batch operations for multiple documents
2. **Chunk Size**: Balance between context and performance (512 tokens recommended)
3. **Entity Extraction**: Can be disabled for faster processing
4. **GPU**: Use CUDA for faster embedding generation
5. **Parallel Storage**: Stores write in parallel by default

### Benchmarks (Approximate)

- PDF Loading: ~1-2 pages/second
- Chunking: ~10,000 characters/second
- Entity Extraction: ~5-10 chunks/second
- Embedding: ~50-100 chunks/second (CPU), 500+ chunks/second (GPU)
- Storage: ~100-200 chunks/second

## Celery Integration

For production, integrate with Celery for async task processing:

```python
from celery import shared_task
import asyncio

@shared_task(bind=True, max_retries=3)
def ingest_document_task(
    self,
    tenant_id: str,
    kb_id: str,
    file_path: str = None,
    url: str = None,
):
    """Celery task wrapper for async document ingestion."""
    try:
        loop = asyncio.get_event_loop()
        task = loop.run_until_complete(
            ingest_document(tenant_id, kb_id, file_path, url)
        )
        return task.to_dict()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
```

## Configuration

Configure via environment variables or `config.py`:

```python
# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=zaia_chatbot

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Embeddings
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Processing
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

## Testing

Run tests to verify pipeline functionality:

```bash
# Unit tests
pytest tests/test_ingestion/

# Integration tests
pytest tests/test_ingestion_integration/
```

## Monitoring

Monitor pipeline health:

- Track processing times
- Monitor error rates
- Check storage capacity
- Verify embedding quality
- Monitor entity extraction accuracy

## Troubleshooting

### Common Issues

1. **spaCy model not found**
   ```bash
   python -m spacy download en_core_web_sm
   ```

2. **Qdrant connection failed**
   - Check Qdrant is running: `docker ps`
   - Verify host and port in config

3. **MongoDB connection failed**
   - Check MongoDB is running
   - Verify connection string

4. **Neo4j connection failed**
   - Check Neo4j is running
   - Verify credentials

5. **Out of memory**
   - Reduce batch size
   - Process documents individually
   - Use smaller embedding model

## License

Part of the ZAIA RAG Chatbot Platform.
