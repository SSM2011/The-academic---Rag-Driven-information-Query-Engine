# KnowledgeVault — College RAG System
### Final Year Project | AI-Powered Academic Knowledge Management

A production-grade, role-based **Retrieval-Augmented Generation (RAG)** system built for college environments. Admins upload course PDFs; students ask questions and receive AI-generated answers grounded in those documents, with source citations.

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                     │
│  Admin: Dashboard · Upload · Documents · Analytics · Users       │
│  Student: Chat · History · Semantic Search                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API (JWT)
┌───────────────────────────▼─────────────────────────────────────┐
│                     BACKEND (Express.js)                          │
│  /auth  /documents  /query                                        │
└──────┬──────────────────────────┬────────────────────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼──────────────────────────────┐
│  MongoDB     │          │           RAG Pipeline                  │
│  Users       │          │  PDF → Clean → Chunk → Embed → Store   │
│  Documents   │          │  Query → Embed → Similarity → LLM      │
│  ChatSessions│          └──────────────────────────────────────┬─┘
└─────────────┘                                                   │
                                                         ┌────────▼───────┐
                                                         │  OpenAI API     │
                                                         │  Embeddings +   │
                                                         │  GPT-4o-mini    │
                                                         └────────────────┘
```

---

## 🗂 Folder Structure

```
college-rag/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # JWT protect + RBAC restrictTo
│   ├── models/
│   │   ├── User.js              # name, email, password (hashed), role
│   │   ├── Document.js          # PDF metadata + chunks + status
│   │   └── ChatSession.js       # conversation history per user
│   ├── rag/
│   │   ├── chunker.js           # PDF parse, clean, sliding-window chunk
│   │   ├── embedder.js          # OpenAI embeddings, cosine sim, FAISS-like JSON store
│   │   └── retriever.js         # top-k retrieval + GPT-4o-mini answer generation
│   ├── routes/
│   │   ├── auth.js              # register, login, me, users
│   │   ├── documents.js         # upload, embed, list, delete, chunks, stats
│   │   └── query.js             # ask (RAG), semantic search, sessions CRUD
│   ├── data/vectors/            # JSON vector indexes (one file per document)
│   ├── uploads/                 # Uploaded PDF files
│   ├── server.js                # Express app with security middleware
│   ├── seed.js                  # Create demo users
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.js              # Root redirect (reads JWT role)
│       │   ├── login/page.js        # Login + Register with role selection
│       │   ├── admin/
│       │   │   ├── layout.js        # Auth guard (admin only)
│       │   │   ├── page.js          # Dashboard with stats + recent docs
│       │   │   ├── upload/page.js   # PDF upload + pipeline visualiser
│       │   │   ├── documents/page.js# Document table with embed/delete
│       │   │   ├── analytics/page.js# Ring charts, bar charts
│       │   │   └── users/page.js    # User management table
│       │   └── student/
│       │       ├── layout.js        # Auth guard (student only)
│       │       ├── page.js          # Main chat interface
│       │       ├── history/page.js  # Session list + detail viewer
│       │       └── search/page.js   # Semantic chunk search
│       ├── components/
│       │   └── Sidebar.js           # Role-aware navigation sidebar
│       ├── lib/
│       │   └── auth-context.js      # React auth context + hooks
│       └── services/
│           └── api.js               # Typed API client for all endpoints
│
└── docker-compose.yml               # MongoDB + Backend + Frontend
```

---

## ⚙️ Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key

### 1. Clone and install

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY and JWT_SECRET
npm install

# Frontend
cd ../frontend
cp .env.local.example .env.local
npm install
```

### 2. Configure `.env` (backend)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/college-rag
JWT_SECRET=your_random_secret_here_min_32_chars
OPENAI_API_KEY=sk-...
ADMIN_CODE=ADMIN2024        # code required to register as admin
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Seed demo users

```bash
cd backend
node seed.js
```

### 4. Start development servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev           # runs on :5000

# Terminal 2 - Frontend
cd frontend
npm run dev           # runs on :3000
```

### 5. Open browser

```
http://localhost:3000
```

---

## 🐳 Docker (Full Stack)

```bash
# Create root .env
echo "JWT_SECRET=changeme_32chars_minimum" > .env
echo "OPENAI_API_KEY=sk-..." >> .env
echo "ADMIN_CODE=ADMIN2024" >> .env

docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:5000/api/health
- MongoDB:  localhost:27017

---

## 👤 Demo Accounts

| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| Admin   | admin@college.edu       | admin123    |
| Student | student@college.edu     | student123  |
| Student | rahul@college.edu       | student123  |

---

## 🔌 API Reference

### Auth
| Method | Endpoint              | Access  | Description            |
|--------|-----------------------|---------|------------------------|
| POST   | /api/auth/register    | Public  | Register user          |
| POST   | /api/auth/login       | Public  | Login, returns JWT     |
| GET    | /api/auth/me          | Any     | Current user info      |
| GET    | /api/auth/users       | Admin   | List all users         |

### Documents
| Method | Endpoint                        | Access | Description                    |
|--------|---------------------------------|--------|--------------------------------|
| POST   | /api/documents/upload           | Admin  | Upload PDF (multipart)         |
| POST   | /api/documents/:id/embed        | Admin  | Run embedding pipeline         |
| GET    | /api/documents                  | Admin  | List documents (paginated)     |
| GET    | /api/documents/:id              | Admin  | Get document detail            |
| GET    | /api/documents/:id/chunks       | Admin  | Get chunks (paginated)         |
| DELETE | /api/documents/:id              | Admin  | Delete document + vector index |
| GET    | /api/documents/stats/overview   | Admin  | Analytics data                 |

### Query
| Method | Endpoint                    | Access  | Description                      |
|--------|-----------------------------|---------|----------------------------------|
| POST   | /api/query                  | Any     | RAG question or semantic search  |
| GET    | /api/query/sessions         | Any     | List user's chat sessions        |
| GET    | /api/query/sessions/:id     | Any     | Get full session with messages   |
| DELETE | /api/query/sessions/:id     | Any     | Archive (soft-delete) session    |

#### POST /api/query body
```json
{
  "question": "What is dynamic programming?",
  "sessionId": "optional-existing-session-id",
  "mode": "rag",           // "rag" (default) | "semantic"
  "documentIds": null      // null = search all, or ["id1","id2"]
}
```

---

## 🧠 RAG Pipeline Explained

### Ingestion (Admin triggers)
```
PDF Upload
   ↓
pdf-parse  →  Extract raw text
   ↓
cleanText  →  Remove artifacts, normalise whitespace
   ↓
chunkText  →  Sliding window: 500 words, 80-word overlap
   ↓
OpenAI     →  text-embedding-3-small (1536 dims per chunk)
   ↓
JSON store →  data/vectors/{docId}.json
   ↓
MongoDB    →  Save metadata + chunk text
```

### Retrieval (Student asks)
```
Question
   ↓
OpenAI     →  Embed query (same model)
   ↓
Cosine     →  Score all chunks across all documents
similarity
   ↓
Top-5      →  Filter score ≥ 0.3
chunks
   ↓
Prompt     →  System: "only use context", User: context + question
builder
   ↓
GPT-4o-mini → temperature=0.1 (factual, grounded)
   ↓
Response   →  answer + sources with page numbers + scores
```

---

## 🔐 Security Features

- **bcrypt** password hashing (cost factor 12)
- **JWT** tokens (7-day expiry)
- **RBAC** middleware — admin-only routes enforced server-side
- **Helmet.js** — HTTP security headers
- **Rate limiting** — 100 req/15min per IP
- **Multer** — PDF-only, 50MB limit
- **Admin code** — required for admin registration

---

## 💡 Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Vector DB | JSON files on disk | Zero dependency for demo; swap to FAISS/Pinecone for scale |
| Embedding model | text-embedding-3-small | Cost-efficient, 1536 dims, excellent quality |
| LLM | gpt-4o-mini | Fast, cheap, accurate for factual Q&A |
| Temperature | 0.1 | Factual mode — reduces hallucination |
| Chunk size | 500 words / 80 overlap | Balances context vs precision |
| Min score | 0.3 cosine | Filters irrelevant chunks before LLM call |
| Chat history | Last 6 messages passed to LLM | Multi-turn context without token bloat |

---

## 🚀 Scaling to Production

When ready to scale beyond a single server:

1. **Vector DB** → Replace JSON store with [Pinecone](https://pinecone.io) or [Weaviate](https://weaviate.io)
2. **LLM** → Use streaming (`stream: true`) for real-time token display
3. **PDF Processing** → Use a queue (Bull/BullMQ + Redis) for background jobs
4. **File Storage** → Move uploads to AWS S3 or Cloudflare R2
5. **Auth** → Add refresh tokens, OAuth (Google)
6. **Rate limiting** → Per-user limits in Redis

---

## 📋 Presentation Checklist

- [ ] Demo: Admin logs in → uploads a PDF → triggers embedding
- [ ] Demo: Student logs in → asks a question → sees answer with citations
- [ ] Demo: Student uses semantic search → shows raw chunk scores
- [ ] Demo: Admin analytics → document stats, subject breakdown
- [ ] Explain: Why chunking with overlap prevents missed context
- [ ] Explain: Why temperature=0.1 reduces hallucination
- [ ] Explain: Why cosine similarity works better than keyword search
- [ ] Explain: How RBAC prevents students from uploading/deleting

---

*Built as a final year project demonstrating RAG architecture, vector embeddings, LLM integration, JWT authentication, and full-stack development.*
