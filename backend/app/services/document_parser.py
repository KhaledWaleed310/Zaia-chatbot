import os
from typing import List, Tuple
from PyPDF2 import PdfReader
from docx import Document
from bs4 import BeautifulSoup
import requests
import tiktoken


def parse_pdf(file_path: str) -> str:
    """Extract text from PDF file."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text.strip()


def parse_docx(file_path: str) -> str:
    """Extract text from DOCX file."""
    doc = Document(file_path)
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text.strip()


def parse_txt(file_path: str) -> str:
    """Read text file."""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read().strip()


def parse_url(url: str) -> str:
    """Extract text from URL."""
    response = requests.get(url, timeout=30)
    soup = BeautifulSoup(response.content, 'html.parser')

    # Remove scripts and styles
    for script in soup(["script", "style"]):
        script.decompose()

    text = soup.get_text(separator='\n')
    # Clean up whitespace
    lines = (line.strip() for line in text.splitlines())
    return '\n'.join(line for line in lines if line)


def parse_document(file_path: str, content_type: str = None) -> str:
    """Parse document based on file type."""
    if content_type:
        if 'pdf' in content_type:
            return parse_pdf(file_path)
        elif 'docx' in content_type or 'document' in content_type:
            return parse_docx(file_path)
        elif 'text' in content_type:
            return parse_txt(file_path)

    # Fallback to extension
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return parse_pdf(file_path)
    elif ext == '.docx':
        return parse_docx(file_path)
    elif ext in ['.txt', '.md']:
        return parse_txt(file_path)
    else:
        return parse_txt(file_path)


def count_tokens(text: str) -> int:
    """Count tokens using tiktoken."""
    enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> List[Tuple[str, int, int]]:
    """
    Chunk text by token count with overlap.
    Returns list of (chunk_text, start_char, end_char).
    """
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)

    chunks = []
    start = 0

    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = enc.decode(chunk_tokens)

        # Find character positions
        char_start = len(enc.decode(tokens[:start])) if start > 0 else 0
        char_end = len(enc.decode(tokens[:end]))

        chunks.append((chunk_text, char_start, char_end))

        if end >= len(tokens):
            break

        start = end - overlap

    return chunks
