"""
Example usage of the ZAIA knowledge ingestion pipeline.

This script demonstrates how to use the ingestion pipeline to process
various types of documents and store them in the knowledge base.
"""

import asyncio
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def example_basic_ingestion():
    """Example: Basic document ingestion."""
    from app.ingestion import ingest_document

    logger.info("=" * 60)
    logger.info("Example 1: Basic PDF Ingestion")
    logger.info("=" * 60)

    # Ingest a PDF file
    task = await ingest_document(
        tenant_id="demo_tenant",
        kb_id="demo_kb",
        file_path="/path/to/your/document.pdf"
    )

    logger.info(f"Status: {task.status}")
    logger.info(f"Chunks processed: {task.chunks_processed}")
    logger.info(f"Tokens processed: {task.tokens_processed}")
    logger.info(f"Entities extracted: {task.entities_extracted}")

    if task.error:
        logger.error(f"Error: {task.error}")


async def example_url_ingestion():
    """Example: Ingest from URL."""
    from app.ingestion import ingest_document

    logger.info("=" * 60)
    logger.info("Example 2: URL Ingestion")
    logger.info("=" * 60)

    # Ingest from a URL
    task = await ingest_document(
        tenant_id="demo_tenant",
        kb_id="demo_kb",
        url="https://en.wikipedia.org/wiki/Artificial_intelligence"
    )

    logger.info(f"Status: {task.status}")
    logger.info(f"Chunks processed: {task.chunks_processed}")
    logger.info(f"Entities extracted: {task.entities_extracted}")


async def example_text_ingestion():
    """Example: Ingest plain text."""
    from app.ingestion import ingest_document

    logger.info("=" * 60)
    logger.info("Example 3: Plain Text Ingestion")
    logger.info("=" * 60)

    # Ingest plain text
    sample_text = """
    Artificial Intelligence (AI) is transforming the world of technology.
    Companies like Google, Microsoft, and OpenAI are leading the way in AI research.
    Machine learning models can now understand natural language and generate human-like responses.

    The field of AI includes several subfields:
    - Natural Language Processing (NLP)
    - Computer Vision
    - Robotics
    - Expert Systems

    AI applications are found in healthcare, finance, transportation, and many other industries.
    """

    task = await ingest_document(
        tenant_id="demo_tenant",
        kb_id="demo_kb",
        text=sample_text
    )

    logger.info(f"Status: {task.status}")
    logger.info(f"Chunks processed: {task.chunks_processed}")
    logger.info(f"Entities extracted: {task.entities_extracted}")


async def example_custom_pipeline():
    """Example: Using custom pipeline configuration."""
    from app.ingestion.pipeline import IngestionPipeline

    logger.info("=" * 60)
    logger.info("Example 4: Custom Pipeline Configuration")
    logger.info("=" * 60)

    # Create custom pipeline
    pipeline = IngestionPipeline(
        chunk_size=256,  # Smaller chunks
        chunk_overlap=30,  # Less overlap
        embedding_model="all-MiniLM-L6-v2"
    )

    # Initialize
    await pipeline.initialize()

    # Process document
    task = await pipeline.ingest(
        tenant_id="demo_tenant",
        kb_id="demo_kb",
        text="This is a custom pipeline example with different configuration."
    )

    logger.info(f"Chunks processed: {task.chunks_processed}")

    # Don't forget to close
    await pipeline.close()


async def example_component_usage():
    """Example: Using individual components."""
    from app.ingestion.loaders import TextLoader
    from app.ingestion.processors import SmartChunker, EntityExtractor
    from app.ingestion.embedders import Embedder

    logger.info("=" * 60)
    logger.info("Example 5: Using Individual Components")
    logger.info("=" * 60)

    # 1. Load text
    loader = TextLoader()
    text = """
    The Python programming language was created by Guido van Rossum.
    It is widely used at companies like Google, Facebook, and Netflix.
    Python is popular for web development, data science, and artificial intelligence.
    """

    # 2. Chunk text
    chunker = SmartChunker()
    chunks = await chunker.chunk(text, chunk_size=100, overlap=20)
    logger.info(f"Created {len(chunks)} chunks")

    for i, chunk in enumerate(chunks):
        logger.info(f"Chunk {i}: {chunk['text'][:50]}...")

    # 3. Extract entities
    entity_extractor = EntityExtractor()
    await entity_extractor.initialize()

    entities = await entity_extractor.extract(text)
    logger.info(f"Extracted {len(entities)} entities:")
    for entity in entities:
        logger.info(f"  - {entity['text']} ({entity['type']})")

    # 4. Generate embeddings
    embedder = Embedder()
    await embedder.initialize()

    embedding = await embedder.embed(text)
    logger.info(f"Generated embedding with {len(embedding)} dimensions")

    # 5. Compute similarity
    text2 = "Java is another popular programming language."
    similarity = await embedder.compute_similarity(text, text2)
    logger.info(f"Similarity between texts: {similarity:.3f}")


async def example_batch_processing():
    """Example: Batch processing multiple documents."""
    from app.ingestion import ingest_document

    logger.info("=" * 60)
    logger.info("Example 6: Batch Processing")
    logger.info("=" * 60)

    documents = [
        {"type": "text", "content": "First document about AI and machine learning."},
        {"type": "text", "content": "Second document about natural language processing."},
        {"type": "text", "content": "Third document about computer vision and robotics."},
    ]

    tasks = []
    for i, doc in enumerate(documents):
        logger.info(f"Processing document {i + 1}/{len(documents)}")
        task = await ingest_document(
            tenant_id="demo_tenant",
            kb_id=f"demo_kb_{i}",
            text=doc["content"]
        )
        tasks.append(task)

    # Summary
    total_chunks = sum(t.chunks_processed for t in tasks)
    total_entities = sum(t.entities_extracted for t in tasks)

    logger.info(f"Batch complete:")
    logger.info(f"  Total chunks: {total_chunks}")
    logger.info(f"  Total entities: {total_entities}")


async def example_search_operations():
    """Example: Searching stored data."""
    from app.ingestion.stores import QdrantStore, MongoStore, Neo4jStore
    from app.ingestion.embedders import Embedder

    logger.info("=" * 60)
    logger.info("Example 7: Search Operations")
    logger.info("=" * 60)

    tenant_id = "demo_tenant"
    kb_id = "demo_kb"

    # 1. Vector similarity search
    logger.info("Vector Similarity Search:")
    vector_store = QdrantStore()
    await vector_store.initialize()

    embedder = Embedder()
    await embedder.initialize()

    query = "What is artificial intelligence?"
    query_vector = await embedder.embed(query)

    results = await vector_store.search(
        tenant_id=tenant_id,
        kb_id=kb_id,
        query_vector=query_vector,
        limit=5
    )

    logger.info(f"Found {len(results)} similar chunks")
    for i, result in enumerate(results):
        logger.info(f"  {i + 1}. Score: {result['score']:.3f}")
        logger.info(f"     Text: {result['text'][:100]}...")

    # 2. Full-text search
    logger.info("\nFull-Text Search:")
    mongo_store = MongoStore()
    await mongo_store.initialize()

    results = await mongo_store.search_text(
        tenant_id=tenant_id,
        kb_id=kb_id,
        query="artificial intelligence machine learning",
        limit=5
    )

    logger.info(f"Found {len(results)} matching documents")

    # 3. Entity search
    logger.info("\nEntity Search:")
    results = await mongo_store.search_entities(
        tenant_id=tenant_id,
        kb_id=kb_id,
        entity_text="Google",
        entity_type="ORG",
        limit=5
    )

    logger.info(f"Found {len(results)} chunks mentioning 'Google'")

    # 4. Knowledge graph queries
    logger.info("\nKnowledge Graph Query:")
    graph_store = Neo4jStore()
    await graph_store.initialize()

    related = await graph_store.find_related_entities(
        tenant_id=tenant_id,
        kb_id=kb_id,
        entity_text="Google",
        max_depth=2,
        limit=10
    )

    logger.info(f"Found {len(related)} related entities:")
    for entity in related[:5]:
        logger.info(f"  - {entity['text']} ({entity['type']}) - Distance: {entity['distance']}")

    # Cleanup
    await vector_store.close()
    await mongo_store.close()
    await graph_store.close()


async def example_error_handling():
    """Example: Error handling."""
    from app.ingestion import ingest_document

    logger.info("=" * 60)
    logger.info("Example 8: Error Handling")
    logger.info("=" * 60)

    # Try to ingest non-existent file
    task = await ingest_document(
        tenant_id="demo_tenant",
        kb_id="demo_kb",
        file_path="/path/to/nonexistent/file.pdf"
    )

    if task.status == "failed":
        logger.error(f"Ingestion failed: {task.error}")
    else:
        logger.info("Ingestion succeeded")


async def main():
    """Run all examples."""
    examples = [
        ("Basic Ingestion", example_basic_ingestion),
        ("URL Ingestion", example_url_ingestion),
        ("Text Ingestion", example_text_ingestion),
        ("Custom Pipeline", example_custom_pipeline),
        ("Component Usage", example_component_usage),
        ("Batch Processing", example_batch_processing),
        ("Search Operations", example_search_operations),
        ("Error Handling", example_error_handling),
    ]

    for name, example_func in examples:
        try:
            logger.info(f"\n\nRunning: {name}")
            await example_func()
        except Exception as e:
            logger.error(f"Example '{name}' failed: {e}", exc_info=True)

        # Add delay between examples
        await asyncio.sleep(1)


if __name__ == "__main__":
    # Run specific example or all
    import sys

    if len(sys.argv) > 1:
        example_name = sys.argv[1]
        example_map = {
            "basic": example_basic_ingestion,
            "url": example_url_ingestion,
            "text": example_text_ingestion,
            "custom": example_custom_pipeline,
            "components": example_component_usage,
            "batch": example_batch_processing,
            "search": example_search_operations,
            "error": example_error_handling,
        }

        if example_name in example_map:
            asyncio.run(example_map[example_name]())
        else:
            print(f"Unknown example: {example_name}")
            print(f"Available examples: {', '.join(example_map.keys())}")
    else:
        # Run all examples
        asyncio.run(main())
