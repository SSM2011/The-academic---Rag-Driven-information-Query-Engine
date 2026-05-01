'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { query as queryService } from '@/services/api';

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    queryService.getSessions()
      .then(d => setSessions(d.sessions || []))
      .finally(() => setLoading(false));
  }, []);

  const openSession = async (id) => {
    setDetailLoading(true);
    try {
      const data = await queryService.getSession(id);
      setSelected(data.session);
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    await queryService.deleteSession(id);
    setSessions(s => s.filter(x => x.id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const continueChat = () => {
    // Navigate to chat (session resumption would be a future enhancement)
    router.push('/student');
  };

  const formatDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = d => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      {/* Session list */}
      <div className="w-80 flex-shrink-0 overflow-y-auto"
        style={{ background: 'var(--bg-primary)', borderRight: '1px solid var(--border-light)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            Chat History
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', marginTop: '0.2rem' }}>
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
              No conversations yet
            </p>
            <button onClick={() => router.push('/student')} className="btn-primary text-sm mt-3">Start chatting</button>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map(session => (
              <div key={session.id}
                onClick={() => openSession(session.id)}
                className="rounded-xl p-4 mb-1.5 cursor-pointer transition-all group"
                style={{
                  background: selected?._id === session.id ? 'rgba(139,26,26,0.07)' : 'transparent',
                  border: `1px solid ${selected?._id === session.id ? 'rgba(139,26,26,0.2)' : 'transparent'}`,
                }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug flex-1"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {session.title}
                  </p>
                  <button
                    onClick={e => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ color: '#dc2626', background: '#fef2f2' }}>
                    ✕
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-body)' }}>
                    {session.messageCount} messages
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                    {formatDate(session.updatedAt)}
                  </span>
                </div>
                {session.lastMessage && (
                  <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {session.lastMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {detailLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }}/>)}</div>
          </div>
        ) : !selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>←</div>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Select a conversation to view it
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 400 }}>
                  {selected.title}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', marginTop: '0.2rem' }}>
                  {formatDate(selected.createdAt)} · {selected.messages?.length || 0} messages
                </p>
              </div>
              <button onClick={continueChat} className="btn-primary text-sm">
                New chat →
              </button>
            </div>

            <div className="space-y-4">
              {selected.messages?.map((msg, i) => (
                <div key={i}
                  className="paper-card rounded-xl p-5 animate-fade-in"
                  style={{ borderLeft: `3px solid ${msg.role === 'user' ? 'var(--accent)' : 'var(--border)'}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: msg.role === 'user' ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {msg.role === 'user' ? '🎓 You' : '🤖 AI'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {msg.content}
                  </p>
                  {msg.sources?.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                        {msg.sources.length} sources cited
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((s, j) => (
                          <span key={j} className="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                            {s.documentName} · p.{s.page}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
