"""
Plain text and markdown file loader.

Handles loading of text-based files including .txt, .md, .csv, and other text formats.
"""

import logging
from typing import Dict, Any, Tuple
from pathlib import Path
import asyncio
import mimetypes

logger = logging.getLogger(__name__)


class TextLoader:
    """
    Loader for plain text files.

    Supports various text-based formats including:
    - Plain text (.txt)
    - Markdown (.md)
    - CSV (.csv)
    - JSON (.json)
    - Other text formats
    """

    def __init__(self, encoding: str = "utf-8", fallback_encodings: list = None):
        """
        Initialize text loader.

        Args:
            encoding: Primary encoding to try
            fallback_encodings: List of encodings to try if primary fails
        """
        self.encoding = encoding
        self.fallback_encodings = fallback_encodings or [
            "utf-8",
            "latin-1",
            "cp1252",
            "iso-8859-1",
        ]
        self.supported_extensions = [
            ".txt",
            ".md",
            ".markdown",
            ".csv",
            ".json",
            ".log",
            ".rst",
            ".tex",
        ]

    async def load(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Load and extract text from a text file.

        Args:
            file_path: Path to the text file

        Returns:
            Tuple of (text_content, metadata)

        Raises:
            FileNotFoundError: If file doesn't exist
            UnicodeDecodeError: If file cannot be decoded with any encoding
        """
        try:
            file_path_obj = Path(file_path)

            if not file_path_obj.exists():
                raise FileNotFoundError(f"Text file not found: {file_path}")

            logger.info(f"Loading text file: {file_path}")

            # Run file reading in thread pool to avoid blocking
            text, metadata = await asyncio.to_thread(self._read_file, file_path_obj)

            logger.info(
                f"Loaded text file: {len(text)} characters from {file_path}"
            )

            return text, metadata

        except Exception as e:
            logger.error(f"Failed to load text file {file_path}: {e}")
            raise

    def _read_file(self, file_path: Path) -> Tuple[str, Dict[str, Any]]:
        """
        Read text file with automatic encoding detection (synchronous).

        Args:
            file_path: Path object for the text file

        Returns:
            Tuple of (text_content, metadata)
        """
        text = None
        used_encoding = None
        decode_errors = []

        # Try encodings in order
        for encoding in self.fallback_encodings:
            try:
                with open(file_path, "r", encoding=encoding) as f:
                    text = f.read()
                used_encoding = encoding
                break
            except UnicodeDecodeError as e:
                decode_errors.append(f"{encoding}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Error reading file with {encoding}: {e}")
                continue

        if text is None:
            error_msg = f"Could not decode file with any encoding. Tried: {', '.join([e for e in decode_errors])}"
            logger.error(error_msg)
            raise UnicodeDecodeError(
                "unknown", b"", 0, 0, error_msg
            )

        # Extract metadata
        metadata = {
            "source_type": "text",
            "file_name": file_path.name,
            "file_extension": file_path.suffix,
            "file_size": file_path.stat().st_size,
            "encoding": used_encoding,
            "char_count": len(text),
        }

        # Detect file type
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if mime_type:
            metadata["mime_type"] = mime_type

        # Add format-specific metadata
        if file_path.suffix.lower() in [".md", ".markdown"]:
            metadata["format"] = "markdown"
            md_metadata = self._extract_markdown_metadata(text)
            metadata.update(md_metadata)

        elif file_path.suffix.lower() == ".csv":
            metadata["format"] = "csv"
            csv_metadata = self._extract_csv_metadata(text)
            metadata.update(csv_metadata)

        elif file_path.suffix.lower() == ".json":
            metadata["format"] = "json"
            json_metadata = self._extract_json_metadata(text)
            metadata.update(json_metadata)

        else:
            metadata["format"] = "plain_text"

        # Count lines
        lines = text.split("\n")
        metadata["line_count"] = len(lines)
        metadata["non_empty_lines"] = len([line for line in lines if line.strip()])

        return text, metadata

    def _extract_markdown_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extract metadata from markdown content.

        Args:
            text: Markdown text

        Returns:
            Dictionary with markdown-specific metadata
        """
        metadata = {}

        try:
            # Count headers
            lines = text.split("\n")
            headers = {
                "h1": 0,
                "h2": 0,
                "h3": 0,
                "h4": 0,
                "h5": 0,
                "h6": 0,
            }

            for line in lines:
                stripped = line.strip()
                if stripped.startswith("#"):
                    level = len(stripped) - len(stripped.lstrip("#"))
                    if 1 <= level <= 6:
                        headers[f"h{level}"] += 1

            metadata["headers"] = headers
            metadata["total_headers"] = sum(headers.values())

            # Count code blocks
            code_blocks = text.count("```")
            metadata["code_blocks"] = code_blocks // 2

            # Count links
            metadata["links"] = text.count("](")

        except Exception as e:
            logger.debug(f"Error extracting markdown metadata: {e}")

        return metadata

    def _extract_csv_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extract metadata from CSV content.

        Args:
            text: CSV text

        Returns:
            Dictionary with CSV-specific metadata
        """
        metadata = {}

        try:
            lines = text.split("\n")
            non_empty_lines = [line for line in lines if line.strip()]

            if non_empty_lines:
                # Try to detect delimiter
                first_line = non_empty_lines[0]
                comma_count = first_line.count(",")
                tab_count = first_line.count("\t")
                pipe_count = first_line.count("|")

                if comma_count > tab_count and comma_count > pipe_count:
                    delimiter = ","
                elif tab_count > comma_count and tab_count > pipe_count:
                    delimiter = "\t"
                elif pipe_count > 0:
                    delimiter = "|"
                else:
                    delimiter = ","

                metadata["delimiter"] = delimiter
                metadata["estimated_columns"] = first_line.count(delimiter) + 1
                metadata["estimated_rows"] = len(non_empty_lines)

        except Exception as e:
            logger.debug(f"Error extracting CSV metadata: {e}")

        return metadata

    def _extract_json_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extract metadata from JSON content.

        Args:
            text: JSON text

        Returns:
            Dictionary with JSON-specific metadata
        """
        metadata = {}

        try:
            import json

            data = json.loads(text)

            if isinstance(data, dict):
                metadata["json_type"] = "object"
                metadata["top_level_keys"] = list(data.keys())
                metadata["key_count"] = len(data.keys())
            elif isinstance(data, list):
                metadata["json_type"] = "array"
                metadata["array_length"] = len(data)
            else:
                metadata["json_type"] = type(data).__name__

            metadata["valid_json"] = True

        except json.JSONDecodeError as e:
            metadata["valid_json"] = False
            metadata["json_error"] = str(e)
        except Exception as e:
            logger.debug(f"Error extracting JSON metadata: {e}")

        return metadata

    async def load_with_line_numbers(
        self, file_path: str
    ) -> Tuple[str, Dict[str, Any], list]:
        """
        Load text file with line number information.

        Args:
            file_path: Path to the text file

        Returns:
            Tuple of (text, metadata, lines_with_numbers)
        """
        try:
            text, metadata = await self.load(file_path)

            # Split into lines with numbers
            lines = text.split("\n")
            numbered_lines = [
                {"line_number": i + 1, "text": line}
                for i, line in enumerate(lines)
            ]

            return text, metadata, numbered_lines

        except Exception as e:
            logger.error(f"Failed to load with line numbers: {e}")
            raise

    async def load_section(
        self,
        file_path: str,
        start_line: int = 1,
        end_line: Optional[int] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Load a specific section of a text file.

        Args:
            file_path: Path to the text file
            start_line: Starting line number (1-indexed)
            end_line: Ending line number (1-indexed), None for end of file

        Returns:
            Tuple of (section_text, metadata)
        """
        try:
            # Load full file first
            text, metadata = await self.load(file_path)

            # Extract section
            lines = text.split("\n")
            start_idx = max(0, start_line - 1)
            end_idx = end_line if end_line is not None else len(lines)

            section_lines = lines[start_idx:end_idx]
            section_text = "\n".join(section_lines)

            # Update metadata
            metadata["section_start"] = start_line
            metadata["section_end"] = end_idx
            metadata["section_lines"] = len(section_lines)
            metadata["section_chars"] = len(section_text)

            return section_text, metadata

        except Exception as e:
            logger.error(f"Failed to load section: {e}")
            raise
