'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function AllExpensesPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchExpenses = useCallback(async () => {
    if (!token) return;
    try {
      const url = filter ? `/api/expenses?status=${filter}&limit=100` : '/api/expenses?limit=100';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, filter]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleAdminOverride = async (expenseId: string, action: string) => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, comments: 'Admin override' }),
      });
      if (res.ok) {
        showToast(`Expense ${action.toLowerCase()}d by admin`, 'success');
        fetchExpenses();
      }
    } catch { showToast('Failed to override', 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>All Company Expenses</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
              {f === '' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="page-loader"><div className="spinner" /><p>Loading...</p></div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No expenses found</h3>
              <p>No company expenses match this filter</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    {user?.role === 'ADMIN' && <th>Override</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #714b67, #8e6585)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700,
                          }}>{exp.submitter.firstName[0]}{exp.submitter.lastName[0]}</div>
                          <span style={{ fontSize: '0.8125rem' }}>{exp.submitter.firstName} {exp.submitter.lastName}</span>
                        </div>
                      </td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</td>
                      <td>{exp.category}</td>
                      <td style={{ fontWeight: 600 }}>{exp.convertedAmount.toFixed(2)} {exp.companyCurrency}</td>
                      <td><span className={`badge badge-${exp.status.toLowerCase().replace('_', '-')}`}>{exp.status.replace('_', ' ')}</span></td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{new Date(exp.expenseDate).toLocaleDateString()}</td>
                      {user?.role === 'ADMIN' && (
                        <td>
                          {(exp.status === 'PENDING' || exp.status === 'IN_REVIEW') && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-success btn-sm" onClick={() => handleAdminOverride(exp.id, 'APPROVE')}>✓</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleAdminOverride(exp.id, 'REJECT')}>✕</button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
