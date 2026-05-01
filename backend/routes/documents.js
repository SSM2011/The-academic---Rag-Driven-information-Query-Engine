const router    = require('express').Router();
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
const FormData  = require('form-data');
const fetch     = require('node-fetch');
const Document  = require('../models/Document');
const { protect, restrictTo } = require('../middleware/auth');

const RAG_SERVICE = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

// ── Multer config ─────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('Only PDF files are allowed.'));
  },
});

// All document routes require admin
router.use(protect, restrictTo('admin'));

// ── POST /api/documents/upload ────────────────────────────────────────────
router.post('/upload', upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No PDF uploaded.' });

    const doc = await Document.create({
      originalName: req.file.originalname,
      storagePath:  req.file.path,
      fileSize:     req.file.size,
      mimeType:     req.file.mimetype,
      uploadedBy:   req.user._id,
      description:  req.body.description || '',
      subject:      req.body.subject || '',
    });

    res.status(201).json({
      message:  'Document uploaded. Trigger embedding to make it searchable.',
      document: doc,
    });
  } catch (err) { next(err); }
});

// ── POST /api/documents/:id/embed ────────────────────────────────────────
// Forwards the stored PDF file to the Python RAG service, which chunks,
// embeds, and upserts into Qdrant.
router.post('/:id/embed', async (req, res, next) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Document not found.' });
  if (doc.status === 'processing')
    return res.status(409).json({ message: 'Already processing.' });

  doc.status = 'processing';
  doc.errorMessage = undefined;
  await doc.save();

  // Respond immediately; embedding runs in background
  res.json({ message: 'Embedding started…', documentId: doc._id });

  // ── Background: call Python RAG service ──────────────────────────────
  ;(async () => {
    try {
      const fd = new FormData();
      fd.append('pdf', fs.createReadStream(doc.storagePath), {
        filename:    doc.originalName,
        contentType: 'application/pdf',
      });
      fd.append('document_id',   doc._id.toString());
      fd.append('document_name', doc.originalName);

      const ragRes = await fetch(`${RAG_SERVICE}/embed`, {
        method:  'POST',
        body:    fd,
        headers: fd.getHeaders(),
        timeout: 5 * 60 * 1000,   // 5 min for large PDFs
      });

      if (!ragRes.ok) {
        const err = await ragRes.text();
        throw new Error(`RAG service error ${ragRes.status}: ${err}`);
      }

      const data = await ragRes.json();

      doc.status      = 'embedded';
      doc.totalChunks = data.total_chunks;
      doc.totalPages  = data.total_pages;
      doc.embeddedAt  = new Date();
      doc.errorMessage = undefined;
      await doc.save();

      console.log(`✅ Embedded '${doc.originalName}': ${data.total_chunks} chunks, ${data.total_pages} pages`);
    } catch (err) {
      doc.status       = 'failed';
      doc.errorMessage = err.message;
      await doc.save();
      console.error(`❌ Embedding failed for '${doc.originalName}':`, err.message);
    }
  })();
});

// ── GET /api/documents ────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const [docs, total] = await Promise.all([
      Document.find(filter)
        .populate('uploadedBy', 'name email')
        .select('-chunks -vectorIndexPath')
        .sort('-createdAt')
        .limit(+limit)
        .skip((+page - 1) * +limit),
      Document.countDocuments(filter),
    ]);

    res.json({ documents: docs, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) { next(err); }
});

// ── GET /api/documents/stats/overview ────────────────────────────────────
router.get('/stats/overview', async (req, res, next) => {
  try {
    const [total, embedded, processing, failed, agg] = await Promise.all([
      Document.countDocuments(),
      Document.countDocuments({ status: 'embedded' }),
      Document.countDocuments({ status: 'processing' }),
      Document.countDocuments({ status: 'failed' }),
      Document.aggregate([{
        $group: { _id: null, totalSize: { $sum: '$fileSize' }, totalChunks: { $sum: '$totalChunks' } },
      }]),
    ]);

    // Also fetch Qdrant stats from RAG service
    let qdrantStats = null;
    try {
      const r = await fetch(`${RAG_SERVICE}/stats`, { timeout: 3000 });
      if (r.ok) qdrantStats = await r.json();
    } catch { /* Qdrant optional */ }

    res.json({
      total, embedded, processing, failed,
      uploaded:       total - embedded - processing - failed,
      totalSizeBytes: agg[0]?.totalSize   || 0,
      totalChunks:    agg[0]?.totalChunks || 0,
      qdrant:         qdrantStats,
    });
  } catch (err) { next(err); }
});

// ── GET /api/documents/:id ────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .select('-chunks');
    if (!doc) return res.status(404).json({ message: 'Document not found.' });
    res.json({ document: doc });
  } catch (err) { next(err); }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────
// Deletes MongoDB record, PDF file, AND vectors from Qdrant
router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    // 1. Delete vectors from Qdrant via RAG service
    try {
      await fetch(`${RAG_SERVICE}/document/${doc._id}`, {
        method: 'DELETE',
        timeout: 10000,
      });
    } catch (e) {
      console.warn('Could not delete Qdrant vectors:', e.message);
    }

    // 2. Delete PDF file from disk
    if (fs.existsSync(doc.storagePath)) fs.unlinkSync(doc.storagePath);

    // 3. Delete MongoDB record
    await doc.deleteOne();

    res.json({ message: 'Document deleted.' });
  } catch (err) { next(err); }
});

// ── GET /api/documents/vector/health ─────────────────────────────────────
router.get('/vector/health', async (req, res, next) => {
  try {
    const r = await fetch(`${RAG_SERVICE}/health`, { timeout: 5000 });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

module.exports = router;
