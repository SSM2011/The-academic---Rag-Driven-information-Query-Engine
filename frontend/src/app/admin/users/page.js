'use client';
import { useState, useEffect } from 'react';
import { auth } from '@/services/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    auth.getUsers()
      .then(data => setUsers(data.users || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const formatDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const adminCount   = users.filter(u => u.role === 'admin').length;
  const studentCount = users.filter(u => u.role === 'student').length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 400 }}>
          Users
        </h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '0.3rem' }}>
          {users.length} registered users — {adminCount} admin · {studentCount} student
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total',    value: users.length,  color: '#2563eb' },
          { label: 'Admins',   value: adminCount,    color: '#8B1A1A' },
          { label: 'Students', value: studentCount,  color: '#16a34a' },
        ].map(c => (
          <div key={c.label} className="paper-card rounded-xl p-5 text-center">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: c.color }}>{c.value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input className="input-field max-w-64 text-sm" placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}/>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {['all','admin','student'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="px-4 py-2 text-sm capitalize transition-all"
              style={{
                background: roleFilter === r ? 'var(--accent)' : 'transparent',
                color: roleFilter === r ? 'white' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
              }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="paper-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>No users found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
                {['User','Email','Role','Status','Joined'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user._id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                        style={{ background: user.role === 'admin' ? '#1a3a5c' : 'var(--accent)', fontFamily: 'var(--font-body)' }}>
                        {user.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontFamily: 'var(--font-body)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: user.role === 'admin' ? '#eff6ff' : '#f0fdf4',
                        color: user.role === 'admin' ? '#2563eb' : '#16a34a',
                        border: `1px solid ${user.role === 'admin' ? '#bfdbfe' : '#bbf7d0'}`,
                        fontFamily: 'var(--font-body)',
                      }}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: user.isActive !== false ? '#f0fdf4' : '#fef2f2',
                        color: user.isActive !== false ? '#16a34a' : '#dc2626',
                        border: `1px solid ${user.isActive !== false ? '#bbf7d0' : '#fecaca'}`,
                      }}>
                      {user.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {formatDate(user.createdAt)}
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
