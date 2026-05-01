'use client';
import { useState, useEffect } from 'react';
import { documents, auth } from '@/services/api';

function Ring({ value, max, label, color }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="10"/>
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 55 55)" style={{ transition: 'stroke-dasharray 1s ease' }}/>
        <text x="55" y="55" textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fill: 'var(--text-primary)' }}>
          {value}
        </text>
      </svg>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs truncate" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-8 text-xs text-right" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats]   = useState(null);
  const [docs, setDocs]     = useState([]);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([documents.stats(), documents.list({ limit: 50 }), auth.getUsers()])
      .then(([s, d, u]) => { setStats(s); setDocs(d.documents || []); setUsers(u.users || []); })
      .finally(() => setLoading(false));
  }, []);

  const formatBytes = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

  const subjectMap = docs.reduce((acc, d) => {
    const key = d.subject || 'Uncategorised';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const subjects = Object.entries(subjectMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSubj = subjects[0]?.[1] || 1;

  const chunkLeaders = [...docs].filter(d => d.totalChunks > 0).sort((a, b) => b.totalChunks - a.totalChunks).slice(0, 6);
  const maxChunks = chunkLeaders[0]?.totalChunks || 1;

  const colors = ['#8B1A1A', '#c44', '#d97706', '#2563eb', '#16a34a', '#7c3aed', '#db2777', '#0891b2'];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }}/>)}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 400 }}>
          Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '0.3rem' }}>
          Knowledge base health and usage overview
        </p>
      </div>

      {/* Ring stats */}
      <div className="paper-card rounded-xl p-8 mb-6">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '2rem' }}>
          Document Status
        </h2>
        <div className="flex flex-wrap justify-around gap-6">
          <Ring value={stats?.total || 0}      max={stats?.total || 1}     label="Total"      color="#2563eb"/>
          <Ring value={stats?.embedded || 0}   max={stats?.total || 1}     label="Embedded"   color="#16a34a"/>
          <Ring value={stats?.processing || 0} max={stats?.total || 1}     label="Processing" color="#d97706"/>
          <Ring value={stats?.failed || 0}     max={stats?.total || 1}     label="Failed"     color="#dc2626"/>
          <Ring value={stats?.totalChunks || 0} max={Math.max(stats?.totalChunks, 1)} label="Chunks" color="#8B1A1A"/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Subjects */}
        <div className="paper-card rounded-xl p-6">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            Documents by Subject
          </h2>
          {subjects.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>No subjects tagged yet.</p>
          ) : (
            <div className="space-y-3">
              {subjects.map(([subj, count], i) => (
                <Bar key={subj} label={subj} value={count} max={maxSubj} color={colors[i % colors.length]}/>
              ))}
            </div>
          )}
        </div>

        {/* Chunk leaders */}
        <div className="paper-card rounded-xl p-6">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            Largest Documents (by Chunks)
          </h2>
          {chunkLeaders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>No embedded documents yet.</p>
          ) : (
            <div className="space-y-3">
              {chunkLeaders.map((doc, i) => (
                <Bar key={doc._id}
                  label={doc.originalName.replace('.pdf', '').slice(0, 22)}
                  value={doc.totalChunks} max={maxChunks}
                  color={colors[i % colors.length]}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Storage & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Storage', value: formatBytes(stats?.totalSizeBytes || 0), icon: '💾', sub: 'PDF files on disk' },
          { label: 'Total Users',   value: users.length,                            icon: '👥', sub: `${users.filter(u=>u.role==='admin').length} admin · ${users.filter(u=>u.role==='student').length} student` },
          { label: 'Avg Chunks/Doc',value: stats?.total > 0 ? Math.round((stats?.totalChunks || 0) / stats.total) : 0, icon: '✂️', sub: 'Per embedded document' },
        ].map(card => (
          <div key={card.label} className="paper-card rounded-xl p-6">
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{card.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-primary)' }}>{card.value}</div>
            <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{card.label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
