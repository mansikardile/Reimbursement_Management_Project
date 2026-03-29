'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function UsersPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE', managerId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(data.users || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const managers = users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, managerId: form.managerId || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('User created successfully!', 'success');
        setShowModal(false);
        setForm({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE', managerId: '' });
        fetchUsers();
      } else {
        setErrors(data.details || { general: data.error });
      }
    } catch {
      setErrors({ general: 'Network error' });
    }
    setSubmitting(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        showToast('Role updated!', 'success');
        fetchUsers();
      }
    } catch { /* ignore */ }
  };

  const handleManagerChange = async (userId: string, managerId: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, managerId: managerId || null }),
      });
      if (res.ok) {
        showToast('Manager updated!', 'success');
        fetchUsers();
      }
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add User</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="page-loader"><div className="spinner" /><p>Loading users...</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Manager</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: u.role === 'ADMIN' ? 'linear-gradient(135deg, #714b67, #5a3a52)' : u.role === 'MANAGER' ? 'linear-gradient(135deg, #3498db, #2980b9)' : 'linear-gradient(135deg, #95a5a6, #7f8c8d)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700,
                          }}>
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <span style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</span>
                        </div>
                      </td>
                      <td style={{ color: '#6b7280' }}>{u.email}</td>
                      <td>
                        <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.8125rem', fontWeight: 500, background: '#fff' }}>
                          <option value="EMPLOYEE">Employee</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td>
                        <select value={u.managerId || ''} onChange={e => handleManagerChange(u.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.8125rem', background: '#fff' }}>
                          <option value="">No manager</option>
                          {managers.filter(m => m.id !== u.id).map(m => (
                            <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {errors.general && <div style={{ padding: '12px 16px', background: '#fdeaea', color: '#c0392b', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>{errors.general}</div>}
              <form onSubmit={handleCreate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className={`form-input ${errors.firstName ? 'error' : ''}`} value={form.firstName}
                      onChange={e => setForm({ ...form, firstName: e.target.value })} />
                    {errors.firstName && <span className="form-error">{errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className={`form-input ${errors.lastName ? 'error' : ''}`} value={form.lastName}
                      onChange={e => setForm({ ...form, lastName: e.target.value })} />
                    {errors.lastName && <span className="form-error">{errors.lastName}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className={`form-input ${errors.password ? 'error' : ''}`} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} />
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manager</label>
                    <select className="form-select" value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}>
                      <option value="">None</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                  {submitting ? <span className="spinner" /> : null}
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
