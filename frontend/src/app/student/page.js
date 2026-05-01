'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { query as queryService } from '@/services/api';
import { useAuth } from '@/lib/auth-context';

function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="source-card cursor-pointer" onClick={() => setExpanded(e => !e)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'rgba(139,26,26,0.1)', color: 'var(--accent)' }}>
            [{index + 1}]
          </span>
          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
            {source.documentName}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>p.{source.page}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
            {(source.score * 100).toFixed(0)}%
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
          {source.preview}
        </p>
      )}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-slide-up">
        <div className="max-w-[75%]">
          <div className="chat-user px-5 py-3 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 animate-slide-up">
      <div className="max-w-[82%] space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)' }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
              <path d="M8 0L1 4v8l7 4 7-4V4L8 0z"/>
            </svg>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>KnowledgeVault AI</span>
        </div>
        <div className="chat-assistant px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: 'var(--font-body)' }}>
          {msg.content}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div>
            <p className="text-xs mb-2 ml-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Sources ({msg.sources.length})
            </p>
            <div className="space-y-1.5">
              {msg.sources.map((s, i) => <SourceCard key={i} source={s} index={i}/>)}
            </div>
          </div>
        )}
        {msg.tokensUsed && (
          <p className="text-xs ml-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {msg.tokensUsed} tokens · {msg.retrievedChunks} chunks retrieved
          </p>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="chat-assistant px-5 py-4 flex items-center gap-1.5">
        <div className="loading-dot"/>
        <div className="loading-dot"/>
        <div className="loading-dot"/>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Explain the concept of recursion with an example",
  "What are the key differences between TCP and UDP?",
  "Summarise the main topics covered in this module",
  "How does dynamic programming differ from divide and conquer?",
];

export default function StudentChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: question }]);

    try {
      const res = await queryService.ask(question, sessionId);
      if (res.sessionId) setSessionId(res.sessionId);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.answer,
        sources: res.sources || [],
        tokensUsed: res.tokensUsed,
        retrievedChunks: res.retrievedChunks,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${err.message}. Please try again.`,
        sources: [],
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, sessionId]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const startNew = () => {
    setMessages([]);
    setSessionId(null);
    setInput('');
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            Ask your course materials
          </h1>
          {sessionId && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Session: {sessionId.slice(-8)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button onClick={startNew}
              className="text-sm px-3 py-1.5 rounded-lg transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              + New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(139,26,26,0.08)' }}>
              <svg width="28" height="28" viewBox="0 0 16 16" fill="var(--accent)">
                <path d="M8 0L1 4v8l7 4 7-4V4L8 0zM8 2.2L13.4 5.5 8 8.8 2.6 5.5 8 2.2zM2 7.1l5 2.9v5.2L2 12.3V7.1zm6 8.1V9.9l5-2.9v5.2L8 15.2z"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: 400 }}>
              Hello, <em>{user?.name?.split(' ')[0]}</em>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '0.5rem', lineHeight: 1.7 }}>
              Ask any question about your course materials.<br/>
              I'll find the most relevant sections and answer with citations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-8 w-full">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl text-sm transition-all"
                  style={{
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.5,
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => <Message key={i} msg={msg}/>)}
            {loading && <TypingIndicator/>}
            <div ref={bottomRef}/>
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              className="input-field resize-none pr-4"
              style={{ minHeight: '48px', maxHeight: '160px', overflowY: 'auto', lineHeight: '1.6' }}
              placeholder="Ask a question about your course materials… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={handleKey}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn-primary flex-shrink-0 flex items-center gap-2"
            style={{ height: '48px', padding: '0 20px' }}>
            {loading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
            <span className="text-sm">Send</span>
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          Answers are grounded in uploaded course documents only · Always verify with your instructor
        </p>
      </div>
    </div>
  );
}
