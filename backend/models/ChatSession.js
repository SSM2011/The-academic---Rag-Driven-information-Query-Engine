const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
  documentName: String,
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  page: Number,
  chunkIndex: Number,
  score: Number,
  preview: String
}, { _id: false });

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: [sourceSchema],
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New conversation'
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

chatSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
