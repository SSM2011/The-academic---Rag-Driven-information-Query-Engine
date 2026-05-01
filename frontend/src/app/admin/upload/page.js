'use client';
import { useState, useRef } from 'react';
import { documents } from '@/services/api';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ description: '', subject: '' });
  const [stage, setStage] = useState('idle'); // idle | uploading | embedding | done | error
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [embedProgress, setEmbedProgress] = useState(0);

  const handleFile = (f) => {
    if (!f || f.type !== 'application/pdf') {
      setMessage('Please select a valid PDF file.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setMessage('File size must be under 50MB.');
      return;
    }
    setFile(f);
    setMessage('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStage('uploading');
    setMessage('');

    try {
      const fd = new FormData();
      fd.append('pdf', file);
      fd.append('description', form.description);
      fd.append('subject', form.subject);

      const data = await documents.upload(fd);
      setUploadedDoc(data.document);
      setStage('idle');
      setMessage('upload_success');
    } catch (err) {
      setStage('error');
      setMessage(err.message);
    }
  };

  const handleEmbed = async () => {
    if (!uploadedDoc) return;
    setStage('embedding');
    setMessage('');

    // Simulate progress
    const interval = setInterval(() => {
      setEmbedProgress(p => Math.min(p + Math.random() * 12, 85));
    }, 800);

    try {
      await documents.embed(uploadedDoc._id);

      clearInterval(interval);
      setEmbedProgress(100);

      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 30) { clearInterval(poll); return; }
        try {
          const d = await documents.get(uploadedDoc._id);
          if (d.document.status === 'embedded') {
            clearInterval(poll);
            setStage('done');
          } else if (d.document.status === 'failed') {
            clearInterval(poll);
            setStage('error');
            setMessage(d.document.errorMessage || 'Embedding failed.');
          }
        } catch { }
      }, 3000);

    } catch (err) {
      clearInterval(interval);
      setStage('error');
      setMessage(err.message);
    }
  };

  const reset = () => {
    setFile(null);
    setUploadedDoc(null);
    setStage('idle');
    setMessage('');
    setEmbedProgress(0);
    setForm({ description: '', subject: '' });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <button onClick={() => router.push('/admin')} className="text-sm mb-4 flex items-center gap-1"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          ← Back to dashboard
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 400 }}>
          Upload Document
        </h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '0.3rem' }}>
          Add course material to the knowledge base
        </p>
      </div>

      {stage === 'done' ? (
        <div className="paper-card rounded-xl p-10 text-center">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            Document Embedded Successfully
          </h2>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '0.5rem' }}>
            Students can now search and ask questions about this document.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={reset} className="btn-primary">Upload Another</button>
            <button onClick={() => router.push('/admin/documents')}
              className="px-5 py-2.5 rounded text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              View All Documents
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File drop zone */}
          <div className="paper-card rounded-xl p-8">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              Select PDF File
            </h2>

            {!file ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl flex flex-col items-center justify-center py-16 cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                  background: dragOver ? 'rgba(139,26,26,0.04)' : 'var(--bg-secondary)',
                }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Drop your PDF here
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem', fontFamily: 'var(--font-body)' }}>
                  or click to browse — up to 50MB
                </div>
                <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                  onChange={e => handleFile(e.target.files?.[0])} />
              </div>
            ) : (
              <div className="rounded-xl p-5 flex items-center gap-4"
                style={{ background: 'rgba(139,26,26,0.05)', border: '1px solid rgba(139,26,26,0.2)' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--accent)', color: 'white', fontFamily: 'var(--font-mono)' }}>
                  PDF
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--text-primary)' }}>{file.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button onClick={() => setFile(null)} style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>×</button>
              </div>
            )}

            {message && message !== 'upload_success' && (
              <div className="mt-3 rounded-lg px-4 py-2.5 text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontFamily: 'var(--font-body)' }}>
                {message}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="paper-card rounded-xl p-8">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              Document Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  Subject / Course
                </label>
                <input className="input-field" type="text" placeholder="e.g., Data Structures, Machine Learning"
                  value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  Description (optional)
                </label>
                <textarea className="input-field resize-none" rows={3}
                  placeholder="Brief description of this document..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Pipeline steps */}
          <div className="paper-card rounded-xl p-8">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              Processing Pipeline
            </h2>

            <div className="space-y-3">
              {[
                { step: 1, label: 'Upload PDF', sub: 'Store file securely', done: !!uploadedDoc, active: stage === 'uploading' },
                { step: 2, label: 'Extract & Chunk Text', sub: '500-token chunks with overlap', done: stage === 'done', active: stage === 'embedding' },
                { step: 3, label: 'Generate Embeddings', sub: 'text-embedding-3-small via OpenAI', done: stage === 'done', active: stage === 'embedding' },
                { step: 4, label: 'Store in Vector Index', sub: 'Cosine similarity search ready', done: stage === 'done', active: false },
              ].map(({ step, label, sub, done, active }) => (
                <div key={step} className="flex items-center gap-4 py-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all"
                    style={{
                      background: done ? '#16a34a' : active ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: (done || active) ? 'white' : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                    {done ? '✓' : active ? '…' : step}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: done ? '#16a34a' : 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {stage === 'embedding' && (
              <div className="mt-4">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${embedProgress}%` }} />
                </div>
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Generating embeddings... {Math.round(embedProgress)}%
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!uploadedDoc ? (
              <button onClick={handleUpload} disabled={!file || stage === 'uploading'}
                className="btn-primary flex-1">
                {stage === 'uploading' ? 'Uploading...' : 'Upload Document'}
              </button>
            ) : (
              <>
                <button onClick={handleEmbed} disabled={stage === 'embedding'}
                  className="btn-primary flex-1">
                  {stage === 'embedding' ? 'Embedding...' : 'Generate Embeddings →'}
                </button>
                <button onClick={reset}
                  className="px-5 py-2.5 rounded text-sm"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  Reset
                </button>
              </>
            )}
          </div>

          {message === 'upload_success' && (
            <div className="rounded-lg px-4 py-3 text-sm"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontFamily: 'var(--font-body)' }}>
              ✅ Document uploaded. Click "Generate Embeddings" to make it searchable.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
