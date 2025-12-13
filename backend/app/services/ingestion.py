import uuid
from typing import List, Dict
from datetime import datetime
from qdrant_client.http.models import PointStruct
from ..core.config import settings
from ..core.database import get_mongodb, get_qdrant, get_neo4j
from .document_parser import parse_document, parse_url, chunk_text
from .embedding import generate_embeddings
from .entity_extractor import extract_entities_with_relations


async def ingest_document(
    file_path: str,
    document_id: str,
    tenant_id: str,
    bot_id: str,
    content_type: str = None,
    filename: str = None
) -> Dict:
    """
    Full ingestion pipeline:
    1. Parse document
    2. Chunk text
    3. Generate embeddings
    4. Extract entities
    5. Store in all three databases
    """
    db = get_mongodb()
    qdrant = get_qdrant()
    neo4j_driver = get_neo4j()

    # 1. Parse document
    if file_path.startswith("http"):
        text = parse_url(file_path)
    else:
        text = parse_document(file_path, content_type)

    if not text:
        raise ValueError("Could not extract text from document")

    # 2. Chunk text
    chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)

    # 3. Generate embeddings for all chunks
    chunk_texts = [c[0] for c in chunks]
    embeddings = generate_embeddings(chunk_texts)

    # 4. Extract entities from all chunks
    all_entities = []
    all_relations = []

    for chunk_text_content, _, _ in chunks:
        entities, relations = extract_entities_with_relations(chunk_text_content)
        all_entities.append(entities)
        all_relations.extend(relations)

    # 5. Store in databases
    chunk_ids = []
    mongo_docs = []
    qdrant_points = []

    for i, (chunk_content, start_char, end_char) in enumerate(chunks):
        chunk_id = str(uuid.uuid4())
        chunk_ids.append(chunk_id)

        # MongoDB document
        mongo_docs.append({
            "_id": chunk_id,
            "document_id": document_id,
            "tenant_id": tenant_id,
            "bot_id": bot_id,
            "content": chunk_content,
            "chunk_index": i,
            "start_char": start_char,
            "end_char": end_char,
            "entities": all_entities[i],
            "created_at": datetime.utcnow()
        })

        # Qdrant point
        qdrant_points.append(PointStruct(
            id=chunk_id,
            vector=embeddings[i],
            payload={
                "document_id": document_id,
                "tenant_id": tenant_id,
                "bot_id": bot_id,
                "content": chunk_content,
                "chunk_index": i,
                "filename": filename
            }
        ))

    # Insert into MongoDB
    if mongo_docs:
        await db.chunks.insert_many(mongo_docs)

    # Insert into Qdrant
    if qdrant_points:
        qdrant.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=qdrant_points
        )

    # Insert into Neo4j
    async with neo4j_driver.session() as session:
        # Create entity nodes
        for i, entities in enumerate(all_entities):
            chunk_id = chunk_ids[i]

            for entity in entities:
                await session.run("""
                    MERGE (e:Entity {name: $name, tenant_id: $tenant_id, bot_id: $bot_id})
                    ON CREATE SET e.label = $label, e.mentions = 1
                    ON MATCH SET e.mentions = e.mentions + 1
                    WITH e
                    MERGE (c:Chunk {chunk_id: $chunk_id})
                    ON CREATE SET c.content = $content, c.tenant_id = $tenant_id, c.bot_id = $bot_id
                    MERGE (e)-[:APPEARS_IN]->(c)
                """,
                    name=entity["text"],
                    label=entity["label"],
                    tenant_id=tenant_id,
                    bot_id=bot_id,
                    chunk_id=chunk_id,
                    content=chunks[i][0][:500]  # Store first 500 chars
                )

        # Create relations
        for relation in all_relations:
            await session.run("""
                MATCH (e1:Entity {name: $source, tenant_id: $tenant_id, bot_id: $bot_id})
                MATCH (e2:Entity {name: $target, tenant_id: $tenant_id, bot_id: $bot_id})
                MERGE (e1)-[r:CO_OCCURS_WITH]-(e2)
                ON CREATE SET r.count = 1
                ON MATCH SET r.count = r.count + 1
            """,
                source=relation["source"],
                target=relation["target"],
                tenant_id=tenant_id,
                bot_id=bot_id
            )

    # Update document status
    await db.documents.update_one(
        {"_id": document_id},
        {
            "$set": {
                "status": "completed",
                "chunks_count": len(chunks),
                "processed_at": datetime.utcnow()
            }
        }
    )

    return {
        "document_id": document_id,
        "chunks_count": len(chunks),
        "entities_count": sum(len(e) for e in all_entities),
        "relations_count": len(all_relations)
    }


async def delete_document_data(document_id: str, tenant_id: str, bot_id: str):
    """Delete all data associated with a document from all databases."""
    db = get_mongodb()
    qdrant = get_qdrant()
    neo4j_driver = get_neo4j()

    # Get chunk IDs
    chunks = await db.chunks.find(
        {"document_id": document_id, "tenant_id": tenant_id},
        {"_id": 1}
    ).to_list(length=None)

    chunk_ids = [str(c["_id"]) for c in chunks]

    # Delete from MongoDB
    await db.chunks.delete_many({"document_id": document_id, "tenant_id": tenant_id})

    # Delete from Qdrant
    if chunk_ids:
        qdrant.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=chunk_ids
        )

    # Delete from Neo4j
    async with neo4j_driver.session() as session:
        await session.run("""
            MATCH (c:Chunk {tenant_id: $tenant_id, bot_id: $bot_id})
            WHERE c.chunk_id IN $chunk_ids
            DETACH DELETE c
        """,
            tenant_id=tenant_id,
            bot_id=bot_id,
            chunk_ids=chunk_ids
        )

    # Delete document record
    await db.documents.delete_one({"_id": document_id})
