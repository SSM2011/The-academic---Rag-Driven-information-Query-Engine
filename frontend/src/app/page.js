'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    // Decode role from JWT without a library
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        router.replace('/login');
        return;
      }
      router.replace(payload.role === 'admin' ? '/admin' : '/student');
    } catch {
      localStorage.removeItem('token');
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent)' }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="white">
            <path d="M8 0L1 4v8l7 4 7-4V4L8 0zM8 2.2L13.4 5.5 8 8.8 2.6 5.5 8 2.2zM2 7.1l5 2.9v5.2L2 12.3V7.1zm6 8.1V9.9l5-2.9v5.2L8 15.2z"/>
          </svg>
        </div>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
          Loading KnowledgeVault…
        </p>
      </div>
    </div>
  );
}
