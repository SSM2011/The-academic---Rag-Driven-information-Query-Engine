'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';

function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'admin') router.push('/student');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      <Sidebar role="admin" />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
