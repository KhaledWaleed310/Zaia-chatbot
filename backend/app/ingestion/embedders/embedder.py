"""
Text embedding generator using sentence-transformers.

Generates dense vector embeddings for semantic search and similarity matching.
"""

import logging
from typing import List, Union, Optional
import asyncio
import numpy as np

logger = logging.getLogger(__name__)


class Embedder:
    """
    Text embedder using sentence-transformers models.

    Generates dense vector embeddings for text, enabling semantic search
    and similarity comparisons. Supports both single and batch embedding generation.
    """

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        device: Optional[str] = None,
        batch_size: int = 32,
    ):
        """
        Initialize embedder.

        Args:
            model_name: Name of sentence-transformers model
            device: Device to run on ('cuda', 'cpu', or None for auto-detect)
            batch_size: Batch size for batch encoding
        """
        self.model_name = model_name
        self.device = device
        self.batch_size = batch_size
        self.model = None
        self.dimension = None

    async def initialize(self):
        """Initialize the embedding model."""
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer

                logger.info(f"Loading embedding model: {self.model_name}")

                # Load model in thread pool to avoid blocking
                self.model = await asyncio.to_thread(
                    SentenceTransformer,
                    self.model_name,
                    device=self.device,
                )

                # Get embedding dimension
                self.dimension = self.model.get_sentence_embedding_dimension()

                logger.info(
                    f"Embedding model loaded: {self.model_name} "
                    f"(dimension: {self.dimension})"
                )

            except ImportError:
                logger.error(
                    "sentence-transformers not installed. "
                    "Install with: pip install sentence-transformers"
                )
                raise
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise

    async def embed(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed

        Returns:
            Embedding vector as list of floats

        Raises:
            ValueError: If text is empty
        """
        if self.model is None:
            await self.initialize()

        try:
            if not text or not text.strip():
                raise ValueError("Cannot embed empty text")

            # Generate embedding in thread pool
            embedding = await asyncio.to_thread(
                self._encode_single,
                text,
            )

            return embedding.tolist()

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    def _encode_single(self, text: str) -> np.ndarray:
        """
        Encode single text (synchronous).

        Args:
            text: Text to encode

        Returns:
            Embedding as numpy array
        """
        embedding = self.model.encode(
            text,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        return embedding

    async def embed_batch(
        self,
        texts: List[str],
        show_progress: bool = False,
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.

        Args:
            texts: List of texts to embed
            show_progress: Whether to show progress bar

        Returns:
            List of embedding vectors

        Raises:
            ValueError: If texts list is empty
        """
        if self.model is None:
            await self.initialize()

        try:
            if not texts:
                raise ValueError("Cannot embed empty list of texts")

            # Filter out empty texts
            valid_indices = []
            valid_texts = []

            for i, text in enumerate(texts):
                if text and text.strip():
                    valid_indices.append(i)
                    valid_texts.append(text)

            if not valid_texts:
                logger.warning("All texts were empty, returning empty embeddings")
                return [[0.0] * self.dimension for _ in texts]

            # Generate embeddings in thread pool
            embeddings = await asyncio.to_thread(
                self._encode_batch,
                valid_texts,
                show_progress,
            )

            # Reconstruct full list with None for invalid texts
            result = []
            valid_idx = 0

            for i in range(len(texts)):
                if i in valid_indices:
                    result.append(embeddings[valid_idx].tolist())
                    valid_idx += 1
                else:
                    # Return zero vector for empty texts
                    result.append([0.0] * self.dimension)

            return result

        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise

    def _encode_batch(
        self,
        texts: List[str],
        show_progress: bool = False,
    ) -> np.ndarray:
        """
        Encode batch of texts (synchronous).

        Args:
            texts: Texts to encode
            show_progress: Show progress bar

        Returns:
            Embeddings as numpy array
        """
        embeddings = self.model.encode(
            texts,
            batch_size=self.batch_size,
            convert_to_numpy=True,
            show_progress_bar=show_progress,
        )
        return embeddings

    async def embed_documents_with_metadata(
        self,
        documents: List[dict],
        text_key: str = "text",
    ) -> List[dict]:
        """
        Embed documents and attach embeddings to metadata.

        Args:
            documents: List of document dictionaries
            text_key: Key containing the text to embed

        Returns:
            Documents with 'embedding' field added
        """
        try:
            # Extract texts
            texts = [doc.get(text_key, "") for doc in documents]

            # Generate embeddings
            embeddings = await self.embed_batch(texts)

            # Attach to documents
            for doc, embedding in zip(documents, embeddings):
                doc["embedding"] = embedding

            return documents

        except Exception as e:
            logger.error(f"Error embedding documents: {e}")
            raise

    async def compute_similarity(
        self,
        text1: str,
        text2: str,
    ) -> float:
        """
        Compute cosine similarity between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Similarity score between -1 and 1
        """
        try:
            # Generate embeddings
            embeddings = await self.embed_batch([text1, text2])

            # Compute cosine similarity
            similarity = self._cosine_similarity(
                np.array(embeddings[0]),
                np.array(embeddings[1]),
            )

            return float(similarity)

        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            raise

    def _cosine_similarity(
        self,
        vec1: np.ndarray,
        vec2: np.ndarray,
    ) -> float:
        """
        Compute cosine similarity between two vectors.

        Args:
            vec1: First vector
            vec2: Second vector

        Returns:
            Cosine similarity score
        """
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    async def find_most_similar(
        self,
        query: str,
        candidates: List[str],
        top_k: int = 5,
    ) -> List[tuple[int, str, float]]:
        """
        Find most similar texts to query from candidates.

        Args:
            query: Query text
            candidates: List of candidate texts
            top_k: Number of top results to return

        Returns:
            List of (index, text, similarity_score) tuples
        """
        try:
            # Embed query and candidates
            all_texts = [query] + candidates
            embeddings = await self.embed_batch(all_texts)

            query_embedding = np.array(embeddings[0])
            candidate_embeddings = np.array(embeddings[1:])

            # Compute similarities
            similarities = []
            for i, cand_emb in enumerate(candidate_embeddings):
                sim = self._cosine_similarity(query_embedding, cand_emb)
                similarities.append((i, candidates[i], sim))

            # Sort by similarity (descending)
            similarities.sort(key=lambda x: x[2], reverse=True)

            # Return top k
            return similarities[:top_k]

        except Exception as e:
            logger.error(f"Error finding similar texts: {e}")
            raise

    def get_model_info(self) -> dict:
        """
        Get information about the loaded model.

        Returns:
            Dictionary with model information
        """
        if self.model is None:
            return {
                "model_name": self.model_name,
                "loaded": False,
            }

        return {
            "model_name": self.model_name,
            "loaded": True,
            "dimension": self.dimension,
            "device": str(self.model.device),
            "max_seq_length": self.model.max_seq_length,
        }

    async def warm_up(self):
        """
        Warm up the model by encoding a sample text.

        Useful for initializing CUDA kernels and caching.
        """
        try:
            logger.info("Warming up embedding model...")
            await self.embed("This is a warmup text to initialize the model.")
            logger.info("Model warmed up successfully")
        except Exception as e:
            logger.warning(f"Model warmup failed: {e}")
