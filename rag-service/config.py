"""config.py — centralised settings loaded from environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()

# ── OpenAI ────────────────────────────────────────────────────────────────
OPENAI_API_KEY: str = os.environ["OPENAI_API_KEY"]
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMS: int  = int(os.getenv("EMBEDDING_DIMS", "1536"))
LLM_MODEL: str       = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.1"))
LLM_MAX_TOKENS: int    = int(os.getenv("LLM_MAX_TOKENS", "1500"))

# ── Qdrant ───────────────────────────────────────────────────────────────
QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "college_rag")

# ── Chunking ─────────────────────────────────────────────────────────────
CHUNK_SIZE_TOKENS: int  = int(os.getenv("CHUNK_SIZE_TOKENS", "500"))
CHUNK_OVERLAP_TOKENS: int = int(os.getenv("CHUNK_OVERLAP_TOKENS", "80"))

# ── Retrieval ────────────────────────────────────────────────────────────
TOP_K: int = int(os.getenv("TOP_K", "5"))
MIN_SCORE: float = float(os.getenv("MIN_SCORE", "0.30"))

# ── Service ──────────────────────────────────────────────────────────────
RAG_SERVICE_PORT: int = int(os.getenv("RAG_SERVICE_PORT", "8000"))
