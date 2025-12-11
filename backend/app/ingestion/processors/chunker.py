"""
Smart text chunker with sentence boundary detection.

Provides intelligent text chunking that:
- Respects sentence boundaries for clean splits
- Maintains context with configurable overlap
- Preserves semantic coherence
- Returns chunks with detailed metadata
"""

import logging
from typing import List, Dict, Any, Optional
import re
import asyncio

logger = logging.getLogger(__name__)


class SmartChunker:
    """
    Intelligent text chunker that creates semantically coherent chunks.

    Uses sentence boundary detection to avoid splitting in the middle of sentences,
    maintains context through overlap, and provides detailed metadata for each chunk.
    """

    def __init__(self):
        """Initialize the smart chunker."""
        # Sentence boundary patterns
        self.sentence_endings = re.compile(
            r'([.!?]+[\s\n]+|[\n]{2,})',
            re.MULTILINE
        )

        # Additional sentence boundary indicators
        self.quote_endings = re.compile(
            r'([.!?]+["\'\)]*[\s\n]+)',
            re.MULTILINE
        )

    async def chunk(
        self,
        text: str,
        chunk_size: int = 512,
        overlap: int = 50,
        min_chunk_size: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Split text into intelligent chunks with overlap.

        Args:
            text: Text to chunk
            chunk_size: Target size for each chunk (in characters)
            overlap: Number of overlapping characters between chunks
            min_chunk_size: Minimum chunk size (defaults to chunk_size // 4)

        Returns:
            List of chunk dictionaries with text and metadata
        """
        try:
            if not text or not text.strip():
                logger.warning("Empty text provided for chunking")
                return []

            min_chunk_size = min_chunk_size or max(chunk_size // 4, 100)

            logger.debug(
                f"Chunking text: {len(text)} chars, "
                f"chunk_size={chunk_size}, overlap={overlap}"
            )

            # Run chunking in thread pool for CPU-intensive work
            chunks = await asyncio.to_thread(
                self._chunk_text,
                text,
                chunk_size,
                overlap,
                min_chunk_size,
            )

            logger.debug(f"Created {len(chunks)} chunks")
            return chunks

        except Exception as e:
            logger.error(f"Error chunking text: {e}")
            raise

    def _chunk_text(
        self,
        text: str,
        chunk_size: int,
        overlap: int,
        min_chunk_size: int,
    ) -> List[Dict[str, Any]]:
        """
        Perform the actual chunking (synchronous).

        Args:
            text: Text to chunk
            chunk_size: Target chunk size
            overlap: Overlap size
            min_chunk_size: Minimum chunk size

        Returns:
            List of chunk dictionaries
        """
        # First, split into sentences
        sentences = self._split_into_sentences(text)

        if not sentences:
            return []

        chunks = []
        current_chunk = []
        current_size = 0
        start_pos = 0

        for sentence in sentences:
            sentence_size = len(sentence)

            # If adding this sentence exceeds chunk_size, finalize current chunk
            if current_size + sentence_size > chunk_size and current_chunk:
                # Create chunk from accumulated sentences
                chunk_text = "".join(current_chunk)
                chunk_data = self._create_chunk_metadata(
                    chunk_text,
                    len(chunks),
                    start_pos,
                )
                chunks.append(chunk_data)

                # Start new chunk with overlap
                if overlap > 0:
                    # Keep last few sentences for overlap
                    overlap_text = chunk_text[-overlap:]
                    overlap_sentences = self._split_into_sentences(overlap_text)
                    current_chunk = overlap_sentences
                    current_size = len(overlap_text)
                    start_pos = start_pos + len(chunk_text) - overlap
                else:
                    current_chunk = []
                    current_size = 0
                    start_pos = start_pos + len(chunk_text)

            # Add sentence to current chunk
            current_chunk.append(sentence)
            current_size += sentence_size

        # Add final chunk if it meets minimum size
        if current_chunk:
            chunk_text = "".join(current_chunk)
            if len(chunk_text.strip()) >= min_chunk_size or not chunks:
                chunk_data = self._create_chunk_metadata(
                    chunk_text,
                    len(chunks),
                    start_pos,
                )
                chunks.append(chunk_data)
            elif chunks:
                # If final chunk is too small, merge with previous
                chunks[-1]["text"] += chunk_text
                chunks[-1]["end_pos"] = start_pos + len(chunk_text)
                chunks[-1]["char_count"] = len(chunks[-1]["text"])
                chunks[-1]["token_count"] = self._estimate_tokens(chunks[-1]["text"])

        return chunks

    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences using boundary detection.

        Args:
            text: Text to split

        Returns:
            List of sentences
        """
        # First pass: split on clear sentence boundaries
        parts = self.sentence_endings.split(text)

        sentences = []
        current_sentence = ""

        for part in parts:
            if not part:
                continue

            current_sentence += part

            # Check if this is a sentence boundary
            if self.sentence_endings.match(part):
                if current_sentence.strip():
                    sentences.append(current_sentence)
                current_sentence = ""

        # Add any remaining text
        if current_sentence.strip():
            sentences.append(current_sentence)

        # If no sentences were detected, use paragraph splitting
        if len(sentences) <= 1:
            sentences = self._split_into_paragraphs(text)

        return sentences

    def _split_into_paragraphs(self, text: str) -> List[str]:
        """
        Split text into paragraphs as fallback.

        Args:
            text: Text to split

        Returns:
            List of paragraphs
        """
        # Split on multiple newlines
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() + "\n\n" for p in paragraphs if p.strip()]

    def _create_chunk_metadata(
        self,
        text: str,
        index: int,
        start_pos: int,
    ) -> Dict[str, Any]:
        """
        Create metadata for a chunk.

        Args:
            text: Chunk text
            index: Chunk index
            start_pos: Starting position in original text

        Returns:
            Chunk dictionary with metadata
        """
        return {
            "text": text,
            "chunk_index": index,
            "char_count": len(text),
            "token_count": self._estimate_tokens(text),
            "start_pos": start_pos,
            "end_pos": start_pos + len(text),
            "sentence_count": len(self._split_into_sentences(text)),
        }

    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text.

        Uses a simple heuristic: ~4 characters per token for English.
        For more accurate counts, integrate with a tokenizer like tiktoken.

        Args:
            text: Text to estimate

        Returns:
            Estimated token count
        """
        # Simple estimation: average of 4 chars per token
        # Can be replaced with actual tokenizer for accuracy
        return len(text) // 4

    async def chunk_by_tokens(
        self,
        text: str,
        max_tokens: int = 512,
        overlap_tokens: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Chunk text by token count instead of character count.

        Args:
            text: Text to chunk
            max_tokens: Maximum tokens per chunk
            overlap_tokens: Overlap in tokens

        Returns:
            List of chunk dictionaries
        """
        # Convert token counts to character estimates
        chunk_size = max_tokens * 4  # ~4 chars per token
        overlap = overlap_tokens * 4

        return await self.chunk(
            text=text,
            chunk_size=chunk_size,
            overlap=overlap,
        )

    async def chunk_by_semantic_units(
        self,
        text: str,
        chunk_size: int = 512,
        overlap: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Chunk text by semantic units (paragraphs, sections).

        Tries to keep related content together by respecting document structure.

        Args:
            text: Text to chunk
            chunk_size: Target chunk size
            overlap: Overlap size

        Returns:
            List of chunk dictionaries
        """
        try:
            # Split into semantic units (sections, paragraphs)
            units = self._extract_semantic_units(text)

            chunks = []
            current_chunk = []
            current_size = 0
            start_pos = 0

            for unit in units:
                unit_size = len(unit)

                # If unit alone exceeds chunk_size, chunk it separately
                if unit_size > chunk_size * 1.5:
                    # Flush current chunk if any
                    if current_chunk:
                        chunk_text = "\n\n".join(current_chunk)
                        chunks.append(
                            self._create_chunk_metadata(chunk_text, len(chunks), start_pos)
                        )
                        start_pos += len(chunk_text)
                        current_chunk = []
                        current_size = 0

                    # Chunk the large unit
                    unit_chunks = await self.chunk(unit, chunk_size, overlap)
                    for uc in unit_chunks:
                        uc["chunk_index"] = len(chunks)
                        uc["start_pos"] += start_pos
                        uc["end_pos"] += start_pos
                        chunks.append(uc)
                    start_pos += unit_size
                    continue

                # If adding unit exceeds chunk_size, finalize current chunk
                if current_size + unit_size > chunk_size and current_chunk:
                    chunk_text = "\n\n".join(current_chunk)
                    chunks.append(
                        self._create_chunk_metadata(chunk_text, len(chunks), start_pos)
                    )
                    start_pos += len(chunk_text)

                    # Handle overlap
                    if overlap > 0 and current_chunk:
                        current_chunk = [current_chunk[-1]]
                        current_size = len(current_chunk[0])
                    else:
                        current_chunk = []
                        current_size = 0

                # Add unit to current chunk
                current_chunk.append(unit)
                current_size += unit_size

            # Add final chunk
            if current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                chunks.append(
                    self._create_chunk_metadata(chunk_text, len(chunks), start_pos)
                )

            return chunks

        except Exception as e:
            logger.error(f"Error in semantic chunking: {e}")
            # Fallback to regular chunking
            return await self.chunk(text, chunk_size, overlap)

    def _extract_semantic_units(self, text: str) -> List[str]:
        """
        Extract semantic units from text (sections, paragraphs).

        Args:
            text: Text to process

        Returns:
            List of semantic units
        """
        # Look for markdown headers or section markers
        if re.search(r'^#{1,6}\s+', text, re.MULTILINE):
            # Markdown document
            sections = re.split(r'\n(?=#{1,6}\s+)', text)
            return [s.strip() for s in sections if s.strip()]

        # Look for numbered sections
        if re.search(r'^\d+\.?\s+', text, re.MULTILINE):
            sections = re.split(r'\n(?=\d+\.?\s+)', text)
            return [s.strip() for s in sections if s.strip()]

        # Fall back to paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if p.strip()]
