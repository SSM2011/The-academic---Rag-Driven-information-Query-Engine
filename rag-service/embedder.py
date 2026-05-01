"""
embedder.py — OpenAI embedding generation with batching and retry.

Model: text-embedding-3-small (1536 dims)
"""

import asyncio
import logging
from openai import AsyncOpenAI
from config import OPENAI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMS

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

BATCH_SIZE = 100   # OpenAI allows up to 2048 inputs per request


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of texts using OpenAI's embedding API.
    Automatically batches to stay within API limits.

    Returns a list of 1536-dim float vectors in the same order as input.
    """
    if not texts:
        return []

    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        logger.info(f"Embedding batch {i // BATCH_SIZE + 1} ({len(batch)} texts)")

        response = await _client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=batch,
        )
        # Response is sorted by index — use .index to guarantee ordering
        sorted_data = sorted(response.data, key=lambda e: e.index)
        all_embeddings.extend(e.embedding for e in sorted_data)

        # Polite pause between large batches
        if i + BATCH_SIZE < len(texts):
            await asyncio.sleep(0.25)

    return all_embeddings


async def embed_query(text: str) -> list[float]:
    """Embed a single query string."""
    response = await _client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[text],
    )
    return response.data[0].embedding
