const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true },
  estimatedPage: { type: Number, default: 1 },
  tokenCount: { type: Number, default: 0 }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  storagePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'embedded', 'failed'],
    default: 'uploaded'
  },
  totalChunks: {
    type: Number,
    default: 0
  },
  totalPages: {
    type: Number,
    default: 0
  },
  errorMessage: {
    type: String
  },
  embeddedAt: {
    type: Date
  },
  // Store chunks for retrieval without vector DB dependency
  chunks: [chunkSchema],
  // Store embeddings as JSON (for demo - production would use FAISS/Pinecone)
  vectorIndexPath: {
    type: String
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  subject: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

documentSchema.index({ uploadedBy: 1, status: 1 });
documentSchema.index({ originalName: 'text' });

module.exports = mongoose.model('Document', documentSchema);
