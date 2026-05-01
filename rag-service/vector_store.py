"""
vector_store.py — Qdrant vector database client.

Qdrant stores each chunk as a Point:
  id       : UUID (deterministic from chunk_id string)
  vector   : 1536-dim float list (OpenAI text-embedding-3-small)
  payload  : { document_id, document_name, chunk_index, content,
               page_number, token_count }

Collection uses:
  Distance.COSINE  — OpenAI embeddings are cosine-comparable
  VectorParams(size=1536, distance=COSINE)
"""

import uuid
import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    SearchRequest,
)

from config import (
    QDRANT_HOST, QDRANT_PORT, QDRANT_COLLECTION, EMBEDDING_DIMS
)

logger = logging.getLogger(__name__)


def _make_client() -> QdrantClient:
    return QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=30)


def _chunk_id_to_uuid(chunk_id: str) -> str:
    """Convert a deterministic string chunk_id to a UUID (Qdrant requires UUID or uint64)."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))


def ensure_collection() -> None:
    """Create the Qdrant collection if it doesn't already exist."""
    client = _make_client()
    existing = [c.name for c in client.get_collections().collections]
    if QDRANT_COLLECTION not in existing:
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(
                size=EMBEDDING_DIMS,
                distance=Distance.COSINE,
            ),
        )
        logger.info(f"Created Qdrant collection '{QDRANT_COLLECTION}' (dims={EMBEDDING_DIMS}, distance=COSINE)")
    else:
        logger.info(f"Qdrant collection '{QDRANT_COLLECTION}' already exists")


def upsert_chunks(chunks: list[dict], embeddings: list[list[float]]) -> int:
    """
    Insert or update chunk vectors in Qdrant.

    Args:
        chunks     : list of chunk dicts (from chunker output converted to dict)
        embeddings : parallel list of embedding vectors

    Returns:
        number of points upserted
    """
    client = _make_client()
    ensure_collection()

    points = []
    for chunk, vector in zip(chunks, embeddings):
        point_id = _chunk_id_to_uuid(chunk["chunk_id"])
        points.append(PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "document_id":   chunk["document_id"],
                "document_name": chunk["document_name"],
                "chunk_index":   chunk["chunk_index"],
                "content":       chunk["content"],
                "page_number":   chunk["page_number"],
                "token_count":   chunk.get("token_count", 0),
            },
        ))

    # Qdrant recommends batching large upserts
    batch_size = 100
    for i in range(0, len(points), batch_size):
        client.upsert(
            collection_name=QDRANT_COLLECTION,
            points=points[i:i + batch_size],
            wait=True,
        )

    logger.info(f"Upserted {len(points)} vectors into '{QDRANT_COLLECTION}'")
    return len(points)


def search(
    query_vector: list[float],
    top_k: int = 5,
    document_ids: Optional[list[str]] = None,
    score_threshold: float = 0.0,
) -> list[dict]:
    """
    Cosine similarity search in Qdrant.

    Args:
        query_vector   : embedded query (1536 floats)
        top_k          : number of results to return
        document_ids   : optional list of document_id strings to restrict search
        score_threshold: minimum cosine score (Qdrant cosine scores are 0–1)

    Returns:
        List of result dicts with keys: document_id, document_name, chunk_index,
        content, page_number, token_count, score
    """
    client = _make_client()

    # Build optional filter by document_id
    qdrant_filter = None
    if document_ids:
        qdrant_filter = Filter(
            should=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=doc_id),
                )
                for doc_id in document_ids
            ]
        )

    results = client.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=query_vector,
        limit=top_k,
        query_filter=qdrant_filter,
        score_threshold=score_threshold,
        with_payload=True,
    )

    return [
        {
            "document_id":   r.payload["document_id"],
            "document_name": r.payload["document_name"],
            "chunk_index":   r.payload["chunk_index"],
            "content":       r.payload["content"],
            "page_number":   r.payload["page_number"],
            "token_count":   r.payload.get("token_count", 0),
            "score":         round(r.score, 4),
        }
        for r in results
    ]


def delete_document(document_id: str) -> int:
    """
    Delete all vectors for a given document_id from Qdrant.

    Uses Qdrant's delete_by_filter — no index rebuild needed (unlike FAISS).
    Returns approximate count of deleted points.
    """
    client = _make_client()

    # Count before
    before = client.count(
        collection_name=QDRANT_COLLECTION,
        count_filter=Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
        ),
        exact=True,
    ).count

    client.delete(
        collection_name=QDRANT_COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
        ),
        wait=True,
    )

    logger.info(f"Deleted {before} vectors for document_id='{document_id}'")
    return before


def collection_stats() -> dict:
    """Return collection info from Qdrant."""
    client = _make_client()
    info = client.get_collection(QDRANT_COLLECTION)
    return {
        "total_vectors":    info.vectors_count,
        "indexed_vectors":  info.indexed_vectors_count,
        "status":           str(info.status),
        "distance":         str(info.config.params.vectors.distance),
        "dimensions":       info.config.params.vectors.size,
        "collection":       QDRANT_COLLECTION,
    }


def health() -> dict:
    """Check if Qdrant is reachable."""
    try:
        client = _make_client()
        client.get_collections()
        return {"ok": True, "host": QDRANT_HOST, "port": QDRANT_PORT}
    except Exception as e:
        return {"ok": False, "error": str(e)}
