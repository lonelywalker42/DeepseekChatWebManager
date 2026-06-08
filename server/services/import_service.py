"""Import service — parse Markdown and PDF files into session format."""

import re
import logging
from pathlib import Path

from models.schemas import MessageInput

logger = logging.getLogger(__name__)


def parse_markdown(content: str, filename: str = "document.md") -> tuple[str, list[MessageInput]]:
    """
    Parse a Markdown file into a session title and messages.
    Each ## heading starts a new topic block; content becomes assistant messages.
    """
    lines = content.strip().split("\n")
    title = filename
    messages = []

    # Extract title from first # heading
    for line in lines:
        if line.startswith("# ") and not line.startswith("## "):
            title = line[2:].strip()
            break

    # Split by ## headings
    sections = re.split(r"^## ", content, flags=re.MULTILINE)

    for section in sections:
        section = section.strip()
        if not section:
            continue

        # First line is the heading (or title for the first section)
        heading_end = section.find("\n")
        if heading_end == -1:
            heading = section
            body = ""
        else:
            heading = section[:heading_end].strip()
            body = section[heading_end:].strip()

        if not body:
            continue

        # Each section becomes a user question + assistant answer pair
        messages.append(MessageInput(role="user", content=f"请解释：{heading}"))
        messages.append(MessageInput(role="assistant", content=body))

    if not messages:
        # No ## headings found, treat entire content as one message
        messages.append(MessageInput(role="assistant", content=content))

    return title, messages


def parse_pdf(file_path: str, filename: str = "document.pdf") -> tuple[str, list[MessageInput]]:
    """
    Parse a PDF file into a session title and messages.
    Extracts text per page, splits by page or heading patterns.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF is required for PDF parsing. Install with: pip install pymupdf")

    doc = fitz.open(file_path)
    title = filename.replace(".pdf", "")
    messages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()

        if not text:
            continue

        # Check if there's a heading-like first line
        first_line = text.split("\n")[0].strip()
        if len(first_line) < 80 and not first_line.endswith("."):
            heading = first_line
            body = "\n".join(text.split("\n")[1:]).strip()
            if body:
                messages.append(MessageInput(role="user", content=f"请解释：{heading}"))
                messages.append(MessageInput(role="assistant", content=body))
            else:
                messages.append(MessageInput(role="assistant", content=text))
        else:
            messages.append(MessageInput(role="assistant", content=text))

    doc.close()

    if not messages:
        raise ValueError("PDF file appears to be empty or unreadable")

    return title, messages


def parse_text(content: str, filename: str = "document.txt") -> tuple[str, list[MessageInput]]:
    """Parse a plain text file into a session."""
    title = filename.replace(".txt", "").replace(".text", "")
    content = content.strip()

    if not content:
        raise ValueError("File is empty")

    # Split by double newlines as paragraphs
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]

    messages = []
    for i, para in enumerate(paragraphs):
        # Short paragraphs might be headings
        if len(para) < 100 and "\n" not in para:
            messages.append(MessageInput(role="user", content=f"请解释：{para}"))
        else:
            messages.append(MessageInput(role="assistant", content=para))

    if not messages:
        messages.append(MessageInput(role="assistant", content=content))

    return title, messages


def detect_and_parse(file_content: bytes, filename: str) -> tuple[str, list[MessageInput]]:
    """Auto-detect file type and parse accordingly."""
    suffix = Path(filename).suffix.lower()

    if suffix in (".md", ".markdown"):
        text = file_content.decode("utf-8", errors="replace")
        return parse_markdown(text, filename)

    elif suffix == ".pdf":
        # Write to temp file for PyMuPDF
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        try:
            return parse_pdf(tmp_path, filename)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    elif suffix in (".txt", ".text"):
        text = file_content.decode("utf-8", errors="replace")
        return parse_text(text, filename)

    else:
        # Try as text
        try:
            text = file_content.decode("utf-8", errors="replace")
            return parse_text(text, filename)
        except Exception:
            raise ValueError(f"Unsupported file format: {suffix}")
