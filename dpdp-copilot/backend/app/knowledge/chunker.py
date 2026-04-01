"""
Text chunking pipeline for DPDP legal documents.

Takes raw text from PDFs and produces overlapping chunks with metadata:
- source: which document (dpdp_act_2023, dpdp_rules_2025, etc.)
- section: detected section/rule reference (e.g., "Section 6", "Rule 3")
- obligation_category: mapped from section_map.py
- chunk_index: position in original document

Chunk strategy:
- ~500 tokens (~2000 chars) per chunk
- 200 char overlap between chunks
- Prefer splitting on paragraph boundaries
- Each chunk carries its own metadata
"""

import re
import logging
from typing import Optional
from app.knowledge.section_map import DPDP_SECTIONS, DPDP_RULES

logger = logging.getLogger("chunker")

# Default chunking parameters
DEFAULT_CHUNK_SIZE = 2000       # chars (~500 tokens)
DEFAULT_CHUNK_OVERLAP = 200     # chars overlap between consecutive chunks

# Regex to detect section/rule headers in DPDP text
SECTION_PATTERN = re.compile(
    r'(?:^|\n)\s*(?:Section|SECTION)\s+(\d+[A-Za-z]?(?:\(\d+\))?)',
    re.IGNORECASE
)
RULE_PATTERN = re.compile(
    r'(?:^|\n)\s*(?:Rule|RULE)\s+(\d+[A-Za-z]?(?:\(\d+\))?)',
    re.IGNORECASE
)


def _split_oversized_paragraphs(
    paragraphs: list[str], chunk_size: int, chunk_overlap: int
) -> list[str]:
    """Break paragraphs longer than chunk_size into overlapping windows."""
    out: list[str] = []
    for para in paragraphs:
        if len(para) <= chunk_size:
            out.append(para)
            continue
        start = 0
        while start < len(para):
            end = min(start + chunk_size, len(para))
            out.append(para[start:end])
            if end >= len(para):
                break
            start = max(end - chunk_overlap, start + 1)
    return out


def chunk_text(
    text: str,
    source: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[dict]:
    """
    Split text into overlapping chunks with metadata.

    Args:
        text: Full document text
        source: Source identifier (e.g., "dpdp_act_2023")
        chunk_size: Max characters per chunk
        chunk_overlap: Overlap between consecutive chunks

    Returns:
        List of chunk dicts:
        {
            "text": "chunk content...",
            "metadata": {
                "source": "dpdp_act_2023",
                "section": "Section 6",
                "obligation_category": "consent",
                "chunk_index": 0
            }
        }
    """
    if not text or not text.strip():
        logger.warning(f"Empty text provided for source: {source}")
        return []

    # Split into paragraphs first
    paragraphs = _split_into_paragraphs(text)
    paragraphs = _split_oversized_paragraphs(paragraphs, chunk_size, chunk_overlap)

    # Build chunks from paragraphs
    chunks = []
    current_chunk = ""
    current_section = ""
    chunk_index = 0

    for para in paragraphs:
        # Detect if this paragraph starts a new section
        detected_section = _detect_section(para)
        if detected_section:
            current_section = detected_section

        # If adding this paragraph exceeds chunk_size, finalize current chunk
        if current_chunk and len(current_chunk) + len(para) > chunk_size:
            chunks.append(_make_chunk(
                text=current_chunk.strip(),
                source=source,
                section=current_section,
                chunk_index=chunk_index,
            ))
            chunk_index += 1

            # Start new chunk with overlap from end of previous
            if len(current_chunk) > chunk_overlap:
                overlap_text = current_chunk[-chunk_overlap:]
            else:
                overlap_text = current_chunk
            current_chunk = overlap_text + "\n\n" + para
        else:
            current_chunk += ("\n\n" if current_chunk else "") + para

    # Don't forget the last chunk
    if current_chunk.strip():
        chunks.append(_make_chunk(
            text=current_chunk.strip(),
            source=source,
            section=current_section,
            chunk_index=chunk_index,
        ))

    logger.info(f"Chunked '{source}': {len(text)} chars → {len(chunks)} chunks")
    return chunks


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF file using PyMuPDF (fitz).

    Args:
        pdf_path: Path to PDF file

    Returns:
        Full extracted text

    Raises:
        FileNotFoundError: If PDF doesn't exist
        RuntimeError: If text extraction fails
    """
    import fitz  # PyMuPDF

    try:
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        text_parts = []
        for page_num in range(page_count):
            page = doc[page_num]
            text_parts.append(page.get_text())
        doc.close()
        full_text = "\n".join(text_parts)
        logger.info(
            f"Extracted {len(full_text)} chars from {pdf_path} ({page_count} pages)"
        )
        return full_text
    except FileNotFoundError:
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to extract text from {pdf_path}: {e}")


# ============================================================
# INTERNAL HELPERS
# ============================================================

def _split_into_paragraphs(text: str) -> list[str]:
    """Split text into paragraphs, filtering out empty ones."""
    # Split on double newlines or more
    raw_paragraphs = re.split(r'\n\s*\n', text)
    # Filter empty, strip whitespace
    return [p.strip() for p in raw_paragraphs if p.strip()]


def _detect_section(text: str) -> Optional[str]:
    """
    Detect if text contains a Section or Rule header.
    Returns the first match (e.g., "Section 6") or None.
    """
    match = SECTION_PATTERN.search(text)
    if match:
        return f"Section {match.group(1)}"

    match = RULE_PATTERN.search(text)
    if match:
        return f"Rule {match.group(1)}"

    return None


def _get_obligation_for_section(section_ref: str) -> str:
    """
    Map a section/rule reference to an obligation category.
    Returns "general" if no mapping found.
    """
    # Normalize: "Section 8(7)" → check "Section 8" as well
    base_ref = re.sub(r'\(\d+\)', '', section_ref).strip()

    # Check exact match first
    for ref, data in DPDP_SECTIONS.items():
        if section_ref == ref or base_ref == ref:
            if data["obligations"]:
                return data["obligations"][0]

    for ref, data in DPDP_RULES.items():
        if section_ref == ref or base_ref == ref:
            if data["obligations"]:
                return data["obligations"][0]

    return "general"


def _make_chunk(text: str, source: str, section: str, chunk_index: int) -> dict:
    """Create a chunk dict with metadata."""
    obligation = _get_obligation_for_section(section) if section else "general"

    return {
        "text": text,
        "metadata": {
            "source": source,
            "section": section or "unknown",
            "obligation_category": obligation,
            "chunk_index": chunk_index,
        },
    }
