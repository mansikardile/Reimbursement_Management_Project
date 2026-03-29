'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user, company, token } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>({ total: 0, pending: 0, approved: 0, rejected: 0, totalAmount: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/expenses?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const expenses = data.expenses || [];
      setRecentExpenses(expenses);

      const total = data.total || 0;
      const pending = expenses.filter((e: { status: string }) => e.status === 'PENDING' || e.status === 'IN_REVIEW').length;
      const approved = expenses.filter((e: { status: string }) => e.status === 'APPROVED').length;
      const rejected = expenses.filter((e: { status: string }) => e.status === 'REJECTED').length;
      const totalAmount = expenses.reduce((s: number, e: { convertedAmount: number }) => s + e.convertedAmount, 0);
      setStats({ total, pending, approved, rejected, totalAmount });
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const roleLabelMap: Record<string, string> = {
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
          Welcome, {user?.firstName}! 👋
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.9375rem' }}>
          {roleLabelMap[user?.role || 'EMPLOYEE']} at {company?.name} • {company?.currency}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f5f0f4', color: '#714b67' }}>📋</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Expenses</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef5e7', color: '#f39c12' }}>⏳</div>
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending Approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f8f0', color: '#2ecc71' }}>✅</div>
          <div className="stat-value">{stats.approved}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fdeaea', color: '#e74c3c' }}>❌</div>
          <div className="stat-value">{stats.rejected}</div>
          <div className="stat-label">Rejected</div>
        </div>
      </div>

      {/* Recent expenses */}
      <div className="card">
        <div className="card-header">
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Expenses</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <h3>No expenses yet</h3>
              <p>Submit your first expense to get started</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td style={{ fontWeight: 500 }}>{exp.description}</td>
                      <td>{exp.category}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {exp.convertedAmount.toFixed(2)} {exp.companyCurrency}
                        </span>
                        {exp.originalCurrency !== exp.companyCurrency && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>
                            ({exp.amount} {exp.originalCurrency})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${exp.status.toLowerCase().replace('_', '-')}`}>
                          {exp.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                        {new Date(exp.expenseDate).toLocaleDateString()}
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
