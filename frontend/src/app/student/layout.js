'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';

function StudentGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role === 'admin') router.push('/admin');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex gap-2">
          {[0,1,2].map(i => <div key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }}/>)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      <Sidebar role="student"/>
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}

export default function StudentLayout({ children }) {
  return (
    <AuthProvider>
      <StudentGuard>{children}</StudentGuard>
    </AuthProvider>
  );
}
