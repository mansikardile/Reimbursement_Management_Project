'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ExpensesPage() {
  const { token } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchExpenses = useCallback(async () => {
    if (!token) return;
    try {
      const url = filter ? `/api/expenses?status=${filter}` : '/api/expenses';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, filter]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>My Expenses</h1>
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
            <div className="page-loader"><div className="spinner" /><p>Loading expenses...</p></div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No expenses found</h3>
              <p>{filter ? 'No expenses match this filter' : 'Submit your first expense to see it here'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Original Amount</th>
                    <th>Converted</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</td>
                      <td>{exp.category}</td>
                      <td>{exp.amount.toFixed(2)} {exp.originalCurrency}</td>
                      <td style={{ fontWeight: 600 }}>{exp.convertedAmount.toFixed(2)} {exp.companyCurrency}</td>
                      <td><span className={`badge badge-${exp.status.toLowerCase().replace('_', '-')}`}>{exp.status.replace('_', ' ')}</span></td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{new Date(exp.expenseDate).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 60, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              width: exp.totalSteps > 0 ? `${(Math.min(exp.currentStep, exp.totalSteps) / exp.totalSteps) * 100}%` : '100%',
                              background: exp.status === 'APPROVED' ? '#2ecc71' : exp.status === 'REJECTED' ? '#e74c3c' : '#714b67',
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
                            {exp.totalSteps > 0 ? `${Math.min(exp.currentStep, exp.totalSteps)}/${exp.totalSteps}` : 'Auto'}
                          </span>
                        </div>
                      </td>
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
