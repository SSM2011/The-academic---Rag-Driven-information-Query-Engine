'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { documents } from '@/services/api';
import { useAuth } from '@/lib/auth-context';

function StatCard({ label, value, sub, color = 'var(--accent)' }) {
  return (
    <div className="paper-card rounded-xl p-6">
      <div className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color }}>
        {value}
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    embedded: 'badge-embedded',
    processing: 'badge-processing',
    uploaded: 'badge-uploaded',
    failed: 'badge-failed',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${classes[status] || 'badge-uploaded'}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, docsData] = await Promise.all([
          documents.stats(),
          documents.list({ limit: 8 })
        ]);
        setStats(statsData);
        setRecentDocs(docsData.documents || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 400 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <em>{user?.name?.split(' ')[0]}</em>
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-body)' }}>
          Here's your knowledge base overview
        </p>
      </div>

      {/* Quick action */}
      <div className="mb-8 rounded-xl p-6 flex items-center justify-between"
        style={{ background: 'var(--accent)', backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.06), transparent)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.3rem', fontWeight: 400 }}>
            Add course materials
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '0.2rem', fontFamily: 'var(--font-body)' }}>
            Upload PDFs to make them searchable by students
          </p>
        </div>
        <button onClick={() => router.push('/admin/upload')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'white', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'none'}>
          Upload PDF →
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="paper-card rounded-xl p-6 animate-pulse" style={{ height: '100px' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Documents" value={stats?.total || 0} sub="All uploaded PDFs" />
          <StatCard label="Embedded" value={stats?.embedded || 0} sub="Searchable by students" color="#16a34a" />
          <StatCard label="Total Chunks" value={stats?.totalChunks?.toLocaleString() || 0} sub="Text segments indexed" color="#2563eb" />
          <StatCard label="Storage Used" value={formatSize(stats?.totalSizeBytes)} sub="PDF storage" color="#d97706" />
        </div>
      )}

      {/* Recent documents */}
      <div className="paper-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            Recent Documents
          </h2>
          <button onClick={() => router.push('/admin/documents')}
            className="text-sm transition-colors"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>
            View all →
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="text-center py-16">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>No documents uploaded yet</p>
            <button onClick={() => router.push('/admin/upload')} className="btn-primary mt-4 text-sm">
              Upload your first PDF
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {['Document', 'Subject', 'Chunks', 'Status', 'Uploaded'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentDocs.map((doc, i) => (
                <tr key={doc._id}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: i < recentDocs.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => router.push(`/admin/documents`)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center text-xs"
                        style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--accent)' }}>
                        PDF
                      </div>
                      <div>
                        <div className="text-sm font-medium truncate max-w-48" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                          {doc.originalName}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {(doc.fileSize / 1024).toFixed(0)} KB · {doc.totalPages || 0} pages
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {doc.subject || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {doc.totalChunks || 0}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {formatDate(doc.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
