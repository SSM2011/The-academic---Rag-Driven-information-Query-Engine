'use client';
import { useState } from 'react';
import { query as queryService } from '@/services/api';

export default function SearchPage() {
  const [q, setQ]           = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]);
    try {
      const data = await queryService.semanticSearch(q);
      setResults(data.chunks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pct = (s) => `${(s * 100).toFixed(1)}%`;

  const getScoreColor = (score) => {
    if (score > 0.7) return '#16a34a';
    if (score > 0.5) return '#d97706';
    return '#dc2626';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 400 }}>
          Semantic Search
        </h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '0.3rem' }}>
          Find the most relevant text chunks from your course documents — without AI generation
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="paper-card rounded-xl p-6 mb-6">
        <div className="flex gap-3">
          <input
            className="input-field text-base flex-1"
            placeholder="e.g. binary search tree operations…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button type="submit" disabled={!q.trim() || loading} className="btn-primary px-8 flex-shrink-0">
            {loading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            ) : 'Search'}
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          Uses cosine similarity on text embeddings — finds semantically related content, not just keyword matches
        </p>
      </form>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="flex justify-center gap-2 mb-3">
            {[0,1,2].map(i => <div key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }}/>)}
          </div>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>Searching knowledge base…</p>
        </div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-12 paper-card rounded-xl">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
          <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>No matching chunks found</p>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Try a different query, or ask your admin to upload relevant documents
          </p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Found <strong style={{ color: 'var(--text-primary)' }}>{results.length}</strong> relevant chunks for "<em>{q}</em>"
          </p>
          <div className="space-y-4">
            {results.map((r, i) => (
              <div key={i} className="paper-card rounded-xl p-6 animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-1 rounded"
                      style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--accent)' }}>
                      #{i + 1}
                    </span>
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                        {r.documentName}
                      </span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Page ~{r.page} · Chunk {r.chunkIndex}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        background: `${getScoreColor(r.score)}18`,
                        color: getScoreColor(r.score),
                        border: `1px solid ${getScoreColor(r.score)}40`,
                        fontFamily: 'var(--font-mono)',
                      }}>
                      {pct(r.score)} match
                    </div>
                  </div>
                </div>

                {/* Similarity bar */}
                <div className="progress-bar mb-3">
                  <div className="progress-fill" style={{ width: pct(r.score), background: getScoreColor(r.score) }}/>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  {r.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
