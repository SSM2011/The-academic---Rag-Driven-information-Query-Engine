const router      = require('express').Router();
const fetch       = require('node-fetch');
const { protect } = require('../middleware/auth');
const ChatSession = require('../models/ChatSession');

const RAG_SERVICE = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

router.use(protect);

// ── POST /api/query ───────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { question, sessionId, documentIds, mode = 'rag' } = req.body;

    if (!question?.trim())
      return res.status(400).json({ message: 'Question is required.' });
    if (question.trim().length < 3)
      return res.status(400).json({ message: 'Question too short.' });

    // Load or create chat session
    let session = sessionId
      ? await ChatSession.findOne({ _id: sessionId, userId: req.user._id })
      : null;

    if (!session) {
      session = await ChatSession.create({
        userId:   req.user._id,
        title:    question.slice(0, 60) + (question.length > 60 ? '…' : ''),
        messages: [],
      });
    }

    session.messages.push({ role: 'user', content: question });

    let result;

    if (mode === 'semantic') {
      // ── Semantic search — no LLM ────────────────────────────────────
      const ragRes = await fetch(`${RAG_SERVICE}/search`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          question,
          document_ids: documentIds || null,
          top_k: 8,
        }),
        timeout: 30000,
      });
      if (!ragRes.ok) {
        const err = await ragRes.text();
        throw new Error(`RAG service: ${err}`);
      }
      result = await ragRes.json();
      result.mode = 'semantic';

    } else {
      // ── Full RAG pipeline ───────────────────────────────────────────
      const chatHistory = session.messages.slice(-10, -1);

      const ragRes = await fetch(`${RAG_SERVICE}/query`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          question,
          document_ids:  documentIds || null,
          chat_history:  chatHistory,
          top_k: 5,
        }),
        timeout: 60000,
      });

      if (!ragRes.ok) {
        const err = await ragRes.text();
        throw new Error(`RAG service: ${err}`);
      }

      result = await ragRes.json();

      // Persist assistant reply to session
      session.messages.push({
        role:    'assistant',
        content: result.answer,
        sources: result.sources || [],
      });
      await session.save();
    }

    res.json({ ...result, sessionId: session._id });
  } catch (err) { next(err); }
});

// ── GET /api/query/sessions ───────────────────────────────────────────────
router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id, isActive: true })
      .select('title createdAt updatedAt messages')
      .sort('-updatedAt')
      .limit(30);

    res.json({
      sessions: sessions.map(s => ({
        id:           s._id,
        title:        s.title,
        messageCount: s.messages.length,
        createdAt:    s.createdAt,
        updatedAt:    s.updatedAt,
        lastMessage:  s.messages.at(-1)?.content?.slice(0, 100),
      })),
    });
  } catch (err) { next(err); }
});

// ── GET /api/query/sessions/:id ───────────────────────────────────────────
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    res.json({ session });
  } catch (err) { next(err); }
});

// ── DELETE /api/query/sessions/:id ───────────────────────────────────────
router.delete('/sessions/:id', async (req, res, next) => {
  try {
    await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false }
    );
    res.json({ message: 'Session deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
