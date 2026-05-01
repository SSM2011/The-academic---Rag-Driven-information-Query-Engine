'use client';
import { useState, useEffect, useCallback } from 'react';
import { documents } from '@/services/api';
import { useRouter } from 'next/navigation';

function StatusBadge({ status }) {
  const styles = {
    embedded: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    processing: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    uploaded: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    failed: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  };
  const s = styles[status] || styles.uploaded;
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [embedding, setEmbedding] = useState({}); // docId -> bool
  const [deleting, setDeleting] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documents.list({ limit: 50 });
      setDocs(data.documents || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEmbed = async (docId) => {
    setEmbedding(e => ({ ...e, [docId]: true }));
    try {
      await documents.embed(docId);
      setDocs(d => d.map(doc => doc._id === docId ? { ...doc, status: 'processing' } : doc));
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const data = await documents.get(docId);
          if (['embedded', 'failed'].includes(data.document.status)) {
            clearInterval(poll);
            setDocs(d => d.map(doc => doc._id === docId ? { ...doc, ...data.document } : doc));
            setEmbedding(e => ({ ...e, [docId]: false }));
          }
        } catch { clearInterval(poll); }
      }, 3000);
    } catch (err) {
      alert(err.message);
      setEmbedding(e => ({ ...e, [docId]: false }));
    }
  };

  const handleDelete = async (docId, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(d => ({ ...d, [docId]: true }));
    try {
      await documents.delete(docId);
      setDocs(d => d.filter(doc => doc._id !== docId));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(d => ({ ...d, [docId]: false }));
    }
  };

  const filtered = docs.filter(doc => {
    const matchStatus = filter === 'all' || doc.status === filter;
    const matchSearch = !search || doc.originalName.toLowerCase().includes(search.toLowerCase()) ||
      doc.subject?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const formatSize = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 400 }}>
            Documents
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '0.2rem' }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''} in knowledge base
          </p>
        </div>
        <button onClick={() => router.push('/admin/upload')} className="btn-primary">
          + Upload PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input className="input-field max-w-64 text-sm" placeholder="Search documents..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {['all', 'embedded', 'uploaded', 'processing', 'failed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-4 py-2 text-sm capitalize transition-all"
              style={{
                background: filter === s ? 'var(--accent)' : 'transparent',
                color: filter === s ? 'white' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="paper-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Loading documents...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {search ? 'No documents match your search' : 'No documents found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
                  {['Document', 'Subject', 'Pages', 'Chunks', 'Size', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) => (
                  <tr key={doc._id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold"
                          style={{ background: 'rgba(139,26,26,0.1)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                          PDF
                        </div>
                        <span className="text-sm max-w-44 truncate block" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                          title={doc.originalName}>
                          {doc.originalName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {doc.subject || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                      {doc.totalPages || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                      {doc.totalChunks || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {formatSize(doc.fileSize)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {doc.status === 'uploaded' || doc.status === 'failed' ? (
                          <button onClick={() => handleEmbed(doc._id)}
                            disabled={embedding[doc._id]}
                            className="text-xs px-3 py-1.5 rounded transition-all"
                            style={{
                              background: 'rgba(139,26,26,0.08)',
                              color: 'var(--accent)',
                              fontFamily: 'var(--font-body)',
                              border: '1px solid rgba(139,26,26,0.2)',
                            }}>
                            {embedding[doc._id] ? '...' : 'Embed'}
                          </button>
                        ) : null}
                        <button onClick={() => handleDelete(doc._id, doc.originalName)}
                          disabled={deleting[doc._id]}
                          className="text-xs px-3 py-1.5 rounded transition-all"
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontFamily: 'var(--font-body)',
                            border: '1px solid #fecaca',
                          }}>
                          {deleting[doc._id] ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
