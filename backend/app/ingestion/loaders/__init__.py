"""
Document loaders for various file formats.

Supports loading and text extraction from:
- PDF files
- Word documents (DOCX)
- Web pages (URL)
- Plain text and markdown files
"""

from .pdf_loader import PDFLoader
from .docx_loader import DOCXLoader
from .url_loader import URLLoader
from .text_loader import TextLoader

__all__ = [
    "PDFLoader",
    "DOCXLoader",
    "URLLoader",
    "TextLoader",
]
