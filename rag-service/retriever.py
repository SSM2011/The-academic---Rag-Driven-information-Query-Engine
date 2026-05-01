"""
retriever.py — RAG retrieval and answer generation.

Pipeline:
  1. Embed the student's query (OpenAI text-embedding-3-small)
  2. Search Qdrant for top-k cosine-similar chunks
  3. Filter by minimum score threshold
  4. Build a strict, grounded prompt with source context
  5. Call GPT-4o-mini to generate a cited answer
"""

import logging
from typing import Optional
from openai import AsyncOpenAI

from embedder import embed_query
from vector_store import search
from config import (
    OPENAI_API_KEY,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    TOP_K,
    MIN_SCORE,
)

logger = logging.getLogger(__name__)

_llm = AsyncOpenAI(api_key=OPENAI_API_KEY)


def _build_system_prompt() -> str:
    return """You are an expert academic assistant for a college knowledge management system.

Answer student questions using ONLY the provided context extracted from uploaded course materials.

STRICT RULES:
1. Use ONLY the context provided below — never use external or prior knowledge.
2. If the context does not contain enough information to answer, respond exactly:
   "The uploaded course materials don't contain enough information to answer this question. Please consult your textbook or ask your instructor."
3. Always cite sources inline using [Source N] notation.
4. End every answer with a "Sources:" section listing each cited source.
5. Be clear, structured, and educational in your explanation.
6. Never fabricate facts, formulas, definitions, or references."""


def _build_user_prompt(query: str, chunks: list[dict]) -> str:
    context_blocks = []
    for i, chunk in enumerate(chunks):
        context_blocks.append(
            f'[Source {i + 1}: "{chunk["document_name"]}", '
            f'Page {chunk["page_number"]}, '
            f'Similarity {chunk["score"] * 100:.1f}%]\n'
            f'{chunk["content"]}'
        )
    context = "\n\n---\n\n".join(context_blocks)

    return (
        f"CONTEXT FROM COURSE MATERIALS:\n\n{context}\n\n"
        f"STUDENT QUESTION: {query}\n\n"
        f"Answer strictly from the context above, with inline [Source N] citations:"
    )


async def retrieve_and_generate(
    query: str,
    top_k: int = TOP_K,
    document_ids: Optional[list[str]] = None,
    chat_history: Optional[list[dict]] = None,
) -> dict:
    """
    Full RAG pipeline.

    Args:
        query        : Student's question
        top_k        : Max chunks to retrieve
        document_ids : Optional document filter (None = search all)
        chat_history : Previous messages [{"role": ..., "content": ...}]

    Returns dict with:
        answer         : Generated answer string
        sources        : List of source dicts (document_name, page, score, preview)
        retrieved_chunks: Number of chunks used
        model          : LLM model name
        tokens_used    : Total tokens consumed
    """
    # Step 1 — Embed query
    logger.info(f"Embedding query: {query[:60]}...")
    query_vector = await embed_query(query)

    # Step 2 — Search Qdrant (fetch extra for filtering)
    raw_results = search(
        query_vector=query_vector,
        top_k=top_k * 2,
        document_ids=document_ids,
        score_threshold=MIN_SCORE,
    )

    # Step 3 — Filter + cap at top_k
    chunks = raw_results[:top_k]

    if not chunks:
        return {
            "answer": (
                "I couldn't find relevant information in the uploaded documents for your question. "
                "Please ensure the relevant course materials have been uploaded and embedded by your admin."
            ),
            "sources": [],
            "retrieved_chunks": 0,
            "model": LLM_MODEL,
            "tokens_used": 0,
        }

    # Step 4 — Build messages
    messages = [{"role": "system", "content": _build_system_prompt()}]

    # Inject last 6 messages for multi-turn context (3 exchanges)
    if chat_history:
        for msg in chat_history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": _build_user_prompt(query, chunks)})

    # Step 5 — Generate
    logger.info(f"Calling {LLM_MODEL} with {len(chunks)} context chunks")
    completion = await _llm.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=LLM_TEMPERATURE,
        max_tokens=LLM_MAX_TOKENS,
    )

    answer = completion.choices[0].message.content

    # Step 6 — Format sources for frontend
    sources = [
        {
            "document_name": c["document_name"],
            "document_id":   c["document_id"],
            "page":          c["page_number"],
            "chunk_index":   c["chunk_index"],
            "score":         c["score"],
            "preview":       c["content"][:250] + ("..." if len(c["content"]) > 250 else ""),
        }
        for c in chunks
    ]

    return {
        "answer":           answer,
        "sources":          sources,
        "retrieved_chunks": len(chunks),
        "model":            LLM_MODEL,
        "tokens_used":      completion.usage.total_tokens if completion.usage else 0,
    }


async def semantic_search_only(
    query: str,
    top_k: int = 8,
    document_ids: Optional[list[str]] = None,
) -> list[dict]:
    """
    Semantic search without LLM generation.
    Returns the raw retrieved chunks with scores for the student 'Search' page.
    """
    query_vector = await embed_query(query)
    results = search(
        query_vector=query_vector,
        top_k=top_k,
        document_ids=document_ids,
        score_threshold=MIN_SCORE,
    )
    return [
        {
            "document_name": r["document_name"],
            "document_id":   r["document_id"],
            "page":          r["page_number"],
            "chunk_index":   r["chunk_index"],
            "score":         r["score"],
            "content":       r["content"],
        }
        for r in results
    ]
