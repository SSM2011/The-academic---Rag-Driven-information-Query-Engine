"""
main.py — FastAPI RAG service.

Endpoints called by the Node.js backend:

  POST /embed          — Process uploaded PDF: chunk → embed → upsert to Qdrant
  POST /query          — RAG: retrieve from Qdrant + generate answer with GPT
  POST /search         — Semantic search only (no LLM), returns raw chunks
  DELETE /document/{id}— Delete all vectors for a document from Qdrant
  GET  /health         — Liveness check
  GET  /stats          — Qdrant collection stats
"""

import logging
import io
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import RAG_SERVICE_PORT
from chunker import chunk_document
from embedder import embed_texts
from vector_store import (
    ensure_collection,
    upsert_chunks,
    delete_document,
    collection_stats,
    health as qdrant_health,
)
from retriever import retrieve_and_generate, semantic_search_only

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("rag-service")


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting RAG service — ensuring Qdrant collection exists...")
    try:
        ensure_collection()
        logger.info("Qdrant collection ready ✅")
    except Exception as e:
        logger.warning(f"Could not connect to Qdrant on startup: {e}")
    yield
    logger.info("RAG service shutting down")


app = FastAPI(
    title="College RAG Service",
    description="PDF ingestion, Qdrant vector search, and GPT-4o-mini answer generation",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ──────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    document_ids: Optional[list[str]] = None
    chat_history: Optional[list[dict]] = None
    top_k: int = 5


class SearchRequest(BaseModel):
    question: str
    document_ids: Optional[list[str]] = None
    top_k: int = 8


class EmbedStatusCallback(BaseModel):
    """Node backend optionally polls /health; embed runs async."""
    pass


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    qdrant = qdrant_health()
    return {
        "status": "ok" if qdrant["ok"] else "degraded",
        "qdrant": qdrant,
        "service": "rag-service",
    }


@app.get("/stats")
async def stats():
    try:
        return collection_stats()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Qdrant unavailable: {e}")


@app.post("/embed")
async def embed_document(
    pdf: UploadFile = File(...),
    document_id: str = Form(...),
    document_name: str = Form(...),
):
    """
    Full ingestion pipeline for a single PDF:
      1. Read bytes
      2. Extract text per page (PyMuPDF)
      3. Chunk with sliding window (tiktoken, 500-token chunks, 80-token overlap)
      4. Embed all chunks (OpenAI text-embedding-3-small)
      5. Upsert into Qdrant with full metadata payload

    Called by Node.js backend after admin triggers embedding.
    """
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await pdf.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    logger.info(f"Processing PDF '{document_name}' ({len(pdf_bytes):,} bytes) for doc_id={document_id}")

    # Step 1 — Chunk
    try:
        chunks, total_pages = chunk_document(
            pdf_bytes=pdf_bytes,
            document_id=document_id,
            document_name=document_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    logger.info(f"Produced {len(chunks)} chunks from {total_pages} pages")

    # Step 2 — Embed
    texts = [c.content for c in chunks]
    embeddings = await embed_texts(texts)

    # Step 3 — Upsert to Qdrant
    chunk_dicts = [
        {
            "chunk_id":     c.chunk_id,
            "document_id":  c.document_id,
            "document_name":c.document_name,
            "chunk_index":  c.chunk_index,
            "content":      c.content,
            "page_number":  c.page_number,
            "token_count":  c.token_count,
        }
        for c in chunks
    ]
    count = upsert_chunks(chunk_dicts, embeddings)

    logger.info(f"Upserted {count} vectors for '{document_name}'")

    return {
        "success":      True,
        "document_id":  document_id,
        "document_name":document_name,
        "total_pages":  total_pages,
        "total_chunks": count,
    }


@app.post("/query")
async def query(req: QueryRequest):
    """
    RAG pipeline:
      1. Embed question
      2. Search Qdrant (cosine similarity, filtered by document_ids if given)
      3. Build grounded prompt
      4. Generate answer with GPT-4o-mini
      5. Return answer + structured source citations
    """
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="question is required.")

    try:
        result = await retrieve_and_generate(
            query=req.question.strip(),
            top_k=req.top_k,
            document_ids=req.document_ids,
            chat_history=req.chat_history or [],
        )
    except Exception as e:
        logger.exception("Error in retrieve_and_generate")
        raise HTTPException(status_code=500, detail=str(e))

    return result


@app.post("/search")
async def semantic_search(req: SearchRequest):
    """
    Semantic search only — no LLM generation.
    Returns the raw chunks with Qdrant cosine similarity scores.
    Used by the student 'Search' page.
    """
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="question is required.")

    try:
        chunks = await semantic_search_only(
            query=req.question.strip(),
            top_k=req.top_k,
            document_ids=req.document_ids,
        )
    except Exception as e:
        logger.exception("Error in semantic_search_only")
        raise HTTPException(status_code=500, detail=str(e))

    return {"chunks": chunks}


@app.delete("/document/{document_id}")
async def remove_document(document_id: str):
    """
    Delete all Qdrant vectors for a document.
    Called by Node.js when an admin deletes a document.
    """
    try:
        deleted = delete_document(document_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "success": True,
        "document_id": document_id,
        "deleted_vectors": deleted,
    }


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=RAG_SERVICE_PORT, reload=False)
