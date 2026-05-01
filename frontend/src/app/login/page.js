'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function LoginForm() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ name: '', email: '', password: '', adminCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        user = await login(form.email, form.password);
      } else {
        user = await register(form.name, form.email, form.password, role, form.adminCode);
      }
      router.push(user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-secondary)' }}>
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16" 
        style={{ background: 'var(--accent)', backgroundImage: 'radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.05) 0%, transparent 60%)' }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <path d="M8 0L1 4v8l7 4 7-4V4L8 0zM8 2.2L13.4 5.5 8 8.8 2.6 5.5 8 2.2zM2 7.1l5 2.9v5.2L2 12.3V7.1zm6 8.1V9.9l5-2.9v5.2L8 15.2z"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.2rem', fontWeight: 600 }}>
              KnowledgeVault
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '2.8rem', lineHeight: 1.2, fontWeight: 400 }}>
            The academic - Rag-Driven<br />
            <em>Information</em><br />
            Query<br />
            Engine.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '1.5rem', fontSize: '1rem', lineHeight: 1.8, fontFamily: 'var(--font-body)' }}>
            Upload course materials. Ask questions.<br />
            Get answers grounded in your curriculum.
          </p>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[['Accurate', 'Grounded in your docs'], ['Fast', 'Instant retrieval'], ['Cited', 'With page sources']].map(([t, s]) => (
              <div key={t}>
                <div style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{t}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--accent)' }}>
              KnowledgeVault
            </span>
          </div>

          <div className="paper-card rounded-2xl p-10">
            <div className="mb-8">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                {mode === 'login' ? 'Sign in to access your knowledge base' : 'Join your college knowledge system'}
              </p>
            </div>

            {/* Mode tabs */}
            <div className="flex mb-6 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); }}
                  className="flex-1 py-2 text-sm capitalize transition-all duration-200"
                  style={{
                    background: mode === m ? 'var(--accent)' : 'transparent',
                    color: mode === m ? 'white' : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: mode === m ? 500 : 400,
                  }}>
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {mode === 'register' && (
              <div className="flex mb-5 rounded-lg overflow-hidden gap-2">
                {['student', 'admin'].map(r => (
                  <button key={r} onClick={() => setRole(r)}
                    className="flex-1 py-2 text-sm capitalize rounded-lg transition-all"
                    style={{
                      background: role === r ? (r === 'admin' ? '#1a3a5c' : 'var(--bg-tertiary)') : 'transparent',
                      color: role === r ? (r === 'admin' ? 'white' : 'var(--text-primary)') : 'var(--text-muted)',
                      border: `1px solid ${role === r ? 'transparent' : 'var(--border)'}`,
                      fontFamily: 'var(--font-body)',
                    }}>
                    {r === 'student' ? '🎓 Student' : '🔑 Admin'}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Full Name</label>
                  <input className="input-field" type="text" placeholder="Dr. Rajan Kumar" value={form.name} onChange={update('name')} required />
                </div>
              )}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Email Address</label>
                <input className="input-field" type="email" placeholder="you@college.edu" value={form.email} onChange={update('email')} required />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Password</label>
                <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={update('password')} required minLength={6} />
              </div>
              {mode === 'register' && role === 'admin' && (
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Admin Registration Code</label>
                  <input className="input-field" type="password" placeholder="Enter admin code" value={form.adminCode} onChange={update('adminCode')} />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Contact your system administrator for this code</p>
                </div>
              )}

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32" opacity="0.25"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-light)' }}>
              <p className="text-xs text-center mb-3" style={{ color: 'var(--text-muted)' }}>Demo credentials</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Admin', email: 'admin@college.edu', pass: 'admin123' },
                  { label: 'Student', email: 'student@college.edu', pass: 'student123' },
                ].map(d => (
                  <button key={d.label} onClick={() => setForm(f => ({ ...f, email: d.email, password: d.pass }))}
                    className="rounded p-2 text-left transition-all"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 500 }}>{d.label}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{d.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
