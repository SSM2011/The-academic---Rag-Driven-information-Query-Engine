"""
chunker.py — PDF text extraction and sliding-window word chunking.

Uses:
  - PyMuPDF (fitz) for robust PDF text extraction with per-page tracking
  - Word-based sliding window (500 words, 80-word overlap)
    equivalent to ~500-600 tokens for English text

No external vocab downloads needed — fully offline-capable.
"""

import re
import fitz          # PyMuPDF
from dataclasses import dataclass
from config import CHUNK_SIZE_TOKENS, CHUNK_OVERLAP_TOKENS


@dataclass
class Chunk:
    chunk_id:      str    # "{document_id}_chunk_{index}"
    document_id:   str
    document_name: str
    chunk_index:   int
    content:       str
    token_count:   int    # word count (proxy for token count)
    page_number:   int    # 1-based page where chunk begins


def _clean(text: str) -> str:
    """Remove non-printable characters and collapse excessive whitespace."""
    text = re.sub(r"[^\x20-\x7E\n\t]", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{3,}", "  ", text)
    return text.strip()


def extract_pages(pdf_bytes: bytes) -> list[tuple[int, str]]:
    """
    Extract text per page from a PDF.
    Returns [(page_number, cleaned_text), ...] — 1-based page numbers.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for i in range(len(doc)):
        text = _clean(doc[i].get_text("text"))
        if text:
            pages.append((i + 1, text))
    doc.close()
    return pages


def chunk_document(
    pdf_bytes:     bytes,
    document_id:   str,
    document_name: str,
    chunk_size:    int = CHUNK_SIZE_TOKENS,
    overlap:       int = CHUNK_OVERLAP_TOKENS,
) -> tuple[list[Chunk], int]:
    """
    PDF bytes → list of Chunk objects.

    Strategy:
      1. Extract text per page (PyMuPDF)
      2. Build a flat (word, page_number) stream across all pages
      3. Slide a window of `chunk_size` words with `overlap` word overlap
      4. Each chunk is assigned the page number where its first word appears

    Returns:
      (chunks, total_pages)
    """
    pages = extract_pages(pdf_bytes)
    if not pages:
        raise ValueError(
            "No extractable text found in PDF. "
            "It may be a scanned/image-only PDF — please use an OCR-processed version."
        )

    total_pages = pages[-1][0]

    # Flatten pages into a (word, page_number) stream
    word_page: list[tuple[str, int]] = []
    for page_num, text in pages:
        for word in text.split():
            word_page.append((word, page_num))

    if not word_page:
        raise ValueError("PDF contained no words after text extraction.")

    chunks: list[Chunk] = []
    start       = 0
    chunk_index = 0

    while start < len(word_page):
        end    = min(start + chunk_size, len(word_page))
        window = word_page[start:end]

        content = " ".join(w for w, _ in window).strip()

        if len(content) > 40:   # skip near-empty trailing chunks
            page_number = window[0][1]
            chunks.append(Chunk(
                chunk_id      = f"{document_id}_chunk_{chunk_index}",
                document_id   = document_id,
                document_name = document_name,
                chunk_index   = chunk_index,
                content       = content,
                token_count   = len(window),   # word count ≈ token count
                page_number   = page_number,
            ))
            chunk_index += 1

        if end >= len(word_page):
            break
        start = end - overlap   # slide back by overlap to maintain continuity

    return chunks, total_pages
