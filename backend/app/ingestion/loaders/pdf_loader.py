"""
PDF document loader using pypdf.

Extracts text content from PDF files with metadata including page numbers.
"""

import logging
from typing import Dict, Any, Tuple
from pathlib import Path
import asyncio

try:
    from pypdf import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        raise ImportError(
            "PDF support requires pypdf or PyPDF2. Install with: pip install pypdf"
        )

logger = logging.getLogger(__name__)


class PDFLoader:
    """
    Loader for PDF documents.

    Extracts text content from PDF files page by page, maintaining page number metadata
    for accurate source attribution.
    """

    def __init__(self):
        """Initialize PDF loader."""
        self.supported_extensions = [".pdf"]

    async def load(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Load and extract text from a PDF file.

        Args:
            file_path: Path to the PDF file

        Returns:
            Tuple of (extracted_text, metadata)

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a valid PDF
        """
        try:
            file_path_obj = Path(file_path)

            if not file_path_obj.exists():
                raise FileNotFoundError(f"PDF file not found: {file_path}")

            if file_path_obj.suffix.lower() not in self.supported_extensions:
                raise ValueError(f"File is not a PDF: {file_path}")

            logger.info(f"Loading PDF: {file_path}")

            # Run PDF parsing in thread pool to avoid blocking
            text, metadata = await asyncio.to_thread(self._extract_text, file_path_obj)

            logger.info(
                f"Loaded PDF: {metadata['page_count']} pages, "
                f"{len(text)} characters"
            )

            return text, metadata

        except Exception as e:
            logger.error(f"Failed to load PDF {file_path}: {e}")
            raise

    def _extract_text(self, file_path: Path) -> Tuple[str, Dict[str, Any]]:
        """
        Extract text from PDF file (synchronous).

        Args:
            file_path: Path object for the PDF file

        Returns:
            Tuple of (extracted_text, metadata)
        """
        try:
            reader = PdfReader(str(file_path))

            # Extract metadata
            metadata = {
                "source_type": "pdf",
                "file_name": file_path.name,
                "file_size": file_path.stat().st_size,
                "page_count": len(reader.pages),
            }

            # Add PDF metadata if available
            if reader.metadata:
                metadata["title"] = reader.metadata.get("/Title", "")
                metadata["author"] = reader.metadata.get("/Author", "")
                metadata["subject"] = reader.metadata.get("/Subject", "")
                metadata["creator"] = reader.metadata.get("/Creator", "")

            # Extract text from all pages
            all_text = []
            page_texts = []

            for page_num, page in enumerate(reader.pages, start=1):
                try:
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        # Add page marker for chunking
                        page_content = f"\n\n--- Page {page_num} ---\n\n{page_text}"
                        all_text.append(page_content)
                        page_texts.append({
                            "page_number": page_num,
                            "text": page_text.strip(),
                            "char_count": len(page_text.strip()),
                        })
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num}: {e}")
                    continue

            # Combine all page texts
            full_text = "\n".join(all_text)

            # Add page breakdown to metadata
            metadata["pages"] = page_texts
            metadata["total_chars"] = len(full_text)

            if not full_text.strip():
                logger.warning(f"No text extracted from PDF: {file_path}")

            return full_text, metadata

        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise


    async def load_page(self, file_path: str, page_number: int) -> Tuple[str, Dict[str, Any]]:
        """
        Load text from a specific page of a PDF.

        Args:
            file_path: Path to the PDF file
            page_number: Page number to extract (1-indexed)

        Returns:
            Tuple of (page_text, metadata)
        """
        try:
            file_path_obj = Path(file_path)

            if not file_path_obj.exists():
                raise FileNotFoundError(f"PDF file not found: {file_path}")

            text, metadata = await asyncio.to_thread(
                self._extract_page, file_path_obj, page_number
            )

            return text, metadata

        except Exception as e:
            logger.error(f"Failed to load PDF page {page_number} from {file_path}: {e}")
            raise

    def _extract_page(
        self, file_path: Path, page_number: int
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Extract text from a specific page (synchronous).

        Args:
            file_path: Path object for the PDF file
            page_number: Page number to extract (1-indexed)

        Returns:
            Tuple of (page_text, metadata)
        """
        try:
            reader = PdfReader(str(file_path))

            if page_number < 1 or page_number > len(reader.pages):
                raise ValueError(
                    f"Invalid page number {page_number}. "
                    f"PDF has {len(reader.pages)} pages."
                )

            # Extract text from specific page (convert to 0-indexed)
            page = reader.pages[page_number - 1]
            page_text = page.extract_text()

            metadata = {
                "source_type": "pdf",
                "file_name": file_path.name,
                "page_number": page_number,
                "total_pages": len(reader.pages),
            }

            return page_text, metadata

        except Exception as e:
            logger.error(f"Error extracting page {page_number}: {e}")
            raise
