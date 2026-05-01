'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Sidebar({ role = 'student' }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const adminNav = [
    { label: 'Dashboard', icon: '⊞', path: '/admin' },
    { label: 'Upload Document', icon: '↑', path: '/admin/upload' },
    { label: 'Documents', icon: '⊟', path: '/admin/documents' },
    { label: 'Analytics', icon: '◈', path: '/admin/analytics' },
    { label: 'Users', icon: '◉', path: '/admin/users' },
  ];

  const studentNav = [
    { label: 'Chat', icon: '◎', path: '/student' },
    { label: 'History', icon: '◷', path: '/student/history' },
    { label: 'Search', icon: '◉', path: '/student/search' },
  ];

  const nav = role === 'admin' ? adminNav : studentNav;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col h-screen" style={{
      width: '240px',
      minWidth: '240px',
      background: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-light)',
    }}>
      {/* Logo */}
      <div className="px-6 py-6" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
              <path d="M8 0L1 4v8l7 4 7-4V4L8 0zM8 2.2L13.4 5.5 8 8.8 2.6 5.5 8 2.2zM2 7.1l5 2.9v5.2L2 12.3V7.1zm6 8.1V9.9l5-2.9v5.2L8 15.2z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
              KnowledgeVault
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {role}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {nav.map(item => {
            const isActive = pathname === item.path || (item.path !== '/admin' && item.path !== '/student' && pathname.startsWith(item.path));
            return (
              <button key={item.path}
                onClick={() => router.push(item.path)}
                className={`nav-item w-full text-left ${isActive ? 'active' : ''}`}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{item.icon}</span>
                <span style={{ fontFamily: 'var(--font-body)' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User info */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
            style={{ background: 'var(--accent)' }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              {user?.name}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full text-sm py-2 rounded-lg transition-all"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', border: '1px solid var(--border-light)' }}
          onMouseOver={e => e.target.style.color = 'var(--accent)'}
          onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
