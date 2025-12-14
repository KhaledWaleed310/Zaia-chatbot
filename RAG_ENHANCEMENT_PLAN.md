# AIDEN RAG ENHANCEMENT MASTER PLAN
## Mission: Build the World's Best RAG System

---

## CURRENT SYSTEM ANALYSIS

### Strengths (Already Implemented)
- **Triple-Database Hybrid Search**: Qdrant (vector) + MongoDB (full-text) + Neo4j (knowledge graph)
- **RRF Fusion**: Reciprocal Rank Fusion combining all three sources
- **Entity Extraction**: SpaCy NER with co-occurrence relations
- **DeepSeek LLM**: With prompt caching (87% cost reduction)
- **Analytics**: Sentiment analysis, quality scoring, unanswered detection

### Current Limitations to Address
1. No cross-encoder reranking after initial retrieval
2. Fixed-size chunking only (no semantic boundaries)
3. No query expansion or rewriting
4. No adaptive retrieval (always top-5)
5. Basic entity relations (co-occurrence only)
6. No contextual compression
7. Heuristic quality scoring (not LLM-based)
8. No diversity in retrieval (MMR)

---

## ENHANCEMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ENHANCED INGESTION PIPELINE                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    ▼                             ▼                             ▼
┌─────────────┐           ┌─────────────┐           ┌─────────────────┐
│  SEMANTIC   │           │   PARENT-   │           │    DOCUMENT     │
│  CHUNKING   │           │   CHILD     │           │    STRUCTURE    │
│             │           │  HIERARCHY  │           │   PRESERVATION  │
│ - Natural   │           │             │           │                 │
│   breaks    │           │ - Parent:   │           │ - Headings      │
│ - Sentence  │           │   full doc  │           │ - Sections      │
│   aware     │           │ - Child:    │           │ - Tables        │
│ - Topic     │           │   chunks    │           │ - Metadata      │
│   coherent  │           │             │           │                 │
└──────┬──────┘           └──────┬──────┘           └────────┬────────┘
       │                         │                           │
       └─────────────────────────┼───────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ENHANCED EMBEDDING LAYER                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│  │ BGE-Large-EN   │  │ Multi-Vector   │  │ Hypothetical Doc   │    │
│  │ (1024 dim)     │  │ (title+content)│  │ Embeddings (HyDE)  │    │
│  └────────────────┘  └────────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────────┐
│                      TRIPLE DATABASE STORAGE                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐      │
│  │   QDRANT     │    │   MONGODB    │    │     NEO4J        │      │
│  │   Vectors    │    │   Full-text  │    │  Knowledge Graph │      │
│  │   + HNSW     │    │   + BM25     │    │  + Causal Rels   │      │
│  │   + Filters  │    │   + Facets   │    │  + Multi-hop     │      │
│  └──────────────┘    └──────────────┘    └──────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     ENHANCED QUERY PIPELINE                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
    User Query                    ▼
         │            ┌─────────────────────┐
         │            │   QUERY ANALYZER    │
         │            │  - Intent detection │
         │            │  - Entity extraction│
         │            │  - Filter extraction│
         │            └──────────┬──────────┘
         │                       ▼
         │            ┌─────────────────────┐
         │            │   QUERY ENHANCER    │
         │            │  - Query rewriting  │
         │            │  - Multi-query gen  │
         │            │  - HyDE generation  │
         │            │  - Expansion terms  │
         │            └──────────┬──────────┘
         │                       ▼
         │            ┌─────────────────────────────────────────┐
         │            │       PARALLEL MULTI-RETRIEVAL          │
         │            │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
         │            │  │ Qdrant  │ │ MongoDB │ │  Neo4j  │    │
         │            │  │ (Top-20)│ │ (Top-20)│ │ (Top-20)│    │
         │            │  └────┬────┘ └────┬────┘ └────┬────┘    │
         │            │       └───────────┼───────────┘         │
         │            │                   ▼                     │
         │            │         RRF Fusion (Top-30)             │
         │            └───────────────────┬─────────────────────┘
         │                                ▼
         │            ┌─────────────────────────────────────────┐
         │            │        CROSS-ENCODER RERANKING          │
         │            │   (ms-marco-MiniLM or BGE-reranker)     │
         │            │              Top-30 → Top-10            │
         │            └───────────────────┬─────────────────────┘
         │                                ▼
         │            ┌─────────────────────────────────────────┐
         │            │     MAXIMAL MARGINAL RELEVANCE (MMR)    │
         │            │       Balance relevance + diversity     │
         │            │              Top-10 → Top-5             │
         │            └───────────────────┬─────────────────────┘
         │                                ▼
         │            ┌─────────────────────────────────────────┐
         │            │       CONTEXTUAL COMPRESSION            │
         │            │  - Extract relevant sentences only      │
         │            │  - Summarize long chunks                │
         │            │  - Preserve source attribution          │
         │            └───────────────────┬─────────────────────┘
                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ENHANCED RESPONSE GENERATION                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    CHAIN-OF-THOUGHT PROMPTING                  │ │
│  │  1. Analyze query intent                                       │ │
│  │  2. Identify relevant context pieces                           │ │
│  │  3. Reason through answer construction                         │ │
│  │  4. Generate response with citations                           │ │
│  │  5. Self-verify accuracy                                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    SELF-REFLECTION LAYER                       │ │
│  │  - Check if answer addresses query fully                       │ │
│  │  - Verify citations are accurate                               │ │
│  │  - Add confidence score                                        │ │
│  │  - Flag low-confidence responses for review                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: ADVANCED CHUNKING & EMBEDDING

### 1.1 Semantic Chunking
**File**: `backend/app/services/semantic_chunker.py` (NEW)

```python
Features:
- Split at semantic boundaries (topic shifts)
- Preserve sentence integrity
- Adaptive chunk sizes (256-1024 tokens based on content)
- Overlap at sentence level, not token level
```

**Implementation**:
- Use sentence embeddings to detect topic shifts
- Split when cosine similarity drops below threshold
- Keep paragraphs together when possible

### 1.2 Parent-Child Chunk Hierarchy
**File**: `backend/app/services/hierarchical_chunker.py` (NEW)

```python
Structure:
- Parent: Full document or large section
- Children: Fine-grained chunks
- Link: child_id references parent_id

Retrieval Strategy:
- Search children for precision
- Fetch parent for context
- Send both to LLM
```

### 1.3 Upgrade Embedding Model
**Current**: `all-MiniLM-L6-v2` (384 dim)
**Upgrade to**: `BAAI/bge-large-en-v1.5` (1024 dim)

**Why BGE-Large**:
- State-of-the-art on MTEB benchmark
- Better semantic understanding
- Instruction-aware embeddings

**Migration Plan**:
1. Add new collection in Qdrant (`zaia_embeddings_v2`)
2. Re-embed all documents with new model
3. Run parallel testing
4. Switch over when validated

### 1.4 Multi-Vector Embeddings
Store multiple vectors per chunk:
- `title_vector`: Section/document title
- `content_vector`: Chunk content
- `summary_vector`: LLM-generated summary
- `query_vector`: What questions this chunk answers (HyDE)

---

## PHASE 2: QUERY ENHANCEMENT

### 2.1 Query Analyzer
**File**: `backend/app/services/query_analyzer.py` (NEW)

```python
Analysis:
- Intent classification (factual, procedural, comparative, etc.)
- Entity extraction (products, dates, people)
- Filter extraction ("last month", "category X")
- Complexity estimation (simple → multi-hop)
```

### 2.2 Query Rewriter
**File**: `backend/app/services/query_rewriter.py` (NEW)

```python
Strategies:
- Expand abbreviations
- Add domain context
- Clarify ambiguous terms
- Generate sub-questions for complex queries
```

### 2.3 Multi-Query Retrieval
Generate 3-5 query variations:
- Original query
- Paraphrased versions
- Hypothetical document (HyDE)
- Keyword-focused version

Retrieve for each, then fuse results.

### 2.4 Hypothetical Document Embeddings (HyDE)
```python
Process:
1. Use LLM to generate hypothetical answer
2. Embed the hypothetical answer
3. Search for similar real documents
4. This bridges query-document vocabulary gap
```

---

## PHASE 3: ADVANCED RETRIEVAL & RERANKING

### 3.1 Cross-Encoder Reranking
**File**: `backend/app/services/reranker.py` (NEW)

**Model**: `BAAI/bge-reranker-large` or `cross-encoder/ms-marco-MiniLM-L-6-v2`

```python
Pipeline:
1. Initial retrieval: Top-30 from RRF fusion
2. Rerank: Score each (query, document) pair
3. Return: Top-10 by reranker score
```

**Why Cross-Encoder**:
- Bi-encoders (current) embed query and doc separately
- Cross-encoders jointly encode (query, doc) for better relevance

### 3.2 Maximal Marginal Relevance (MMR)
**Purpose**: Balance relevance with diversity

```python
MMR Score = λ * Relevance - (1-λ) * MaxSimilarity(doc, selected_docs)

Where:
- λ = 0.7 (favor relevance but penalize redundancy)
- Prevents returning near-duplicate chunks
```

### 3.3 Adaptive Retrieval
**File**: `backend/app/services/adaptive_retriever.py` (NEW)

```python
Logic:
- Simple queries: Top-3 chunks
- Medium complexity: Top-5 chunks
- Complex/multi-hop: Top-8 chunks + graph traversal
- Low confidence retrieval: Expand search, use HyDE
```

### 3.4 Contextual Compression
**File**: `backend/app/services/context_compressor.py` (NEW)

```python
Strategies:
- Extract only relevant sentences from each chunk
- Summarize very long chunks (>500 tokens)
- Remove redundant information across chunks
- Maintain source attribution for citations
```

---

## PHASE 4: KNOWLEDGE GRAPH ENHANCEMENT

### 4.1 Advanced Relation Extraction
**Current**: Co-occurrence only
**Enhanced**:

```python
Relation Types:
- IS_A (taxonomy)
- PART_OF (composition)
- CAUSES (causality)
- RELATED_TO (association)
- TEMPORAL (before, after, during)
- LOCATED_IN (spatial)
```

**Implementation**: Use LLM for relation extraction
```python
Prompt: "Extract relationships from: [text]
Return: [(entity1, relation, entity2), ...]"
```

### 4.2 Multi-Hop Reasoning
**File**: `backend/app/services/graph_reasoner.py` (NEW)

```python
Strategy:
1. Extract entities from query
2. Find direct matches in graph
3. Traverse 1-2 hops for related context
4. Score paths by relation strength
5. Return connected subgraph as context
```

### 4.3 Temporal Knowledge
Track when information was added/updated:
- `created_at`: Document ingestion date
- `valid_from`/`valid_to`: Content validity period
- Prioritize recent information for time-sensitive queries

---

## PHASE 5: RESPONSE GENERATION IMPROVEMENTS

### 5.1 Chain-of-Thought Prompting
**File**: `backend/app/services/llm.py` (MODIFY)

```python
Enhanced System Prompt:
"""
You are Aiden, an expert AI assistant. When answering:

1. ANALYZE: Identify what the user is really asking
2. RETRIEVE: Consider which context pieces are relevant
3. REASON: Think through the answer step by step
4. RESPOND: Provide a clear, accurate answer
5. CITE: Reference specific sources for claims
6. VERIFY: Check if your answer fully addresses the query

Always show your reasoning briefly before the final answer.
"""
```

### 5.2 Self-Reflection Layer
**File**: `backend/app/services/response_validator.py` (NEW)

```python
Validation Checks:
1. Does response address all parts of the query?
2. Are all claims supported by provided context?
3. Are there any contradictions?
4. Is confidence level appropriate?

If validation fails → regenerate or flag for human review
```

### 5.3 Citation Verification
```python
Process:
1. Extract claims from response
2. Match each claim to source chunk
3. Verify claim is supported by chunk
4. Add inline citations: "According to [Source 1]..."
```

### 5.4 Confidence Scoring
```python
Confidence Factors:
- Context relevance scores
- Number of supporting sources
- Query-response alignment
- Presence of hedging language

Output: confidence_score (0.0-1.0)
Display to user when confidence < 0.7
```

---

## PHASE 6: EVALUATION & MONITORING

### 6.1 LLM-as-Judge
**File**: `backend/app/services/llm_evaluator.py` (NEW)

```python
Evaluation Dimensions:
1. Faithfulness: Is response grounded in context?
2. Relevance: Does response answer the question?
3. Completeness: Are all aspects addressed?
4. Coherence: Is response well-structured?
5. Harmlessness: No hallucinations or harmful content

Score: 1-5 for each dimension
```

### 6.2 Retrieval Metrics
Track automatically:
- **MRR** (Mean Reciprocal Rank): How early is relevant doc found?
- **NDCG** (Normalized Discounted Cumulative Gain): Ranking quality
- **Recall@K**: % of relevant docs in top-K
- **Precision@K**: % of top-K that are relevant

### 6.3 A/B Testing Framework
**File**: `backend/app/services/ab_testing.py` (NEW)

```python
Features:
- Route % of traffic to experimental pipeline
- Compare metrics between variants
- Automatic winner detection
- Gradual rollout support
```

### 6.4 Continuous Learning
```python
Feedback Loop:
1. User feedback (thumbs up/down) → weight adjustments
2. Unanswered questions → knowledge gap detection
3. Low-quality responses → prompt refinement
4. Popular queries → pre-compute answers
```

---

## IMPLEMENTATION PRIORITY & TIMELINE

### Sprint 1: Foundation (High Impact)
1. **Cross-encoder reranking** - Biggest quality improvement
2. **Query rewriting** - Better retrieval accuracy
3. **BGE embedding upgrade** - Better semantic matching

### Sprint 2: Retrieval (Medium Impact)
4. **Semantic chunking** - Better chunk quality
5. **MMR diversity** - Reduce redundancy
6. **Contextual compression** - More relevant context

### Sprint 3: Generation (High Impact)
7. **Chain-of-thought prompting** - Better reasoning
8. **Self-reflection layer** - Quality assurance
9. **Citation verification** - Trustworthiness

### Sprint 4: Advanced (Medium Impact)
10. **Multi-query retrieval** - Comprehensive search
11. **HyDE** - Bridge vocabulary gap
12. **LLM-as-judge** - Automated evaluation

### Sprint 5: Knowledge Graph (Medium Impact)
13. **Advanced relations** - Richer graph
14. **Multi-hop reasoning** - Complex queries
15. **Temporal knowledge** - Time-aware retrieval

---

## EXPECTED IMPROVEMENTS

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Answer Relevance | ~70% | 90%+ | +20% |
| Retrieval Precision@5 | ~60% | 85%+ | +25% |
| Response Accuracy | ~75% | 95%+ | +20% |
| User Satisfaction | ~70% | 90%+ | +20% |
| Hallucination Rate | ~15% | <2% | -13% |
| Query Understanding | ~65% | 90%+ | +25% |

---

## NEW DEPENDENCIES TO ADD

```txt
# requirements.txt additions

# Better embeddings
FlagEmbedding>=1.2.0  # BGE models

# Reranking
sentence-transformers>=2.6.0  # Already have, ensure version

# NLP enhancements
nltk>=3.8.0  # Sentence tokenization
textstat>=0.7.0  # Readability metrics

# Evaluation
ragas>=0.1.0  # RAG evaluation framework
```

---

## DATABASE SCHEMA UPDATES

### Qdrant - New Collection
```python
Collection: zaia_embeddings_v2
Vector Size: 1024 (BGE-large)
Payload:
  + parent_id: Optional[str]  # For hierarchy
  + chunk_type: str  # "parent", "child", "summary"
  + title_vector: List[float]  # Multi-vector
```

### MongoDB - New Fields
```javascript
// chunks collection
{
  + parent_id: String,
  + chunk_type: String,
  + section_title: String,
  + summary: String,
  + questions: [String]  // What questions this answers
}

// New: query_logs collection
{
  query: String,
  rewritten_query: String,
  retrieved_chunks: [String],
  reranked_order: [Int],
  response_quality: Float,
  user_feedback: String
}
```

### Neo4j - New Relations
```cypher
// Beyond co-occurrence
(:Entity)-[:CAUSES]->(:Entity)
(:Entity)-[:IS_A]->(:Entity)
(:Entity)-[:PART_OF]->(:Entity)
(:Entity)-[:TEMPORAL {type: "before"|"after"}]->(:Entity)
```

---

## SUCCESS CRITERIA

1. **Retrieval Quality**: NDCG@5 > 0.85
2. **Answer Accuracy**: LLM-judge score > 4.5/5
3. **Hallucination Rate**: < 2% of responses
4. **User Satisfaction**: > 90% positive feedback
5. **Latency**: P95 < 3 seconds for response
6. **Cost Efficiency**: < $0.01 per conversation

---

## TEAM ASSIGNMENTS

### Backend AI Team
- Implement enhanced retrieval pipeline
- Upgrade embedding model
- Build reranking layer

### NLP Team
- Advanced chunking strategies
- Query enhancement
- Entity/relation extraction

### LLM Team
- Chain-of-thought prompting
- Self-reflection layer
- LLM-as-judge evaluator

### Infrastructure Team
- Database migrations
- A/B testing framework
- Monitoring dashboards

---

*This plan will transform Aiden into the world's most advanced RAG system.*
