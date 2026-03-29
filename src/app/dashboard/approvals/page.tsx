'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ApprovalsPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ id: string; action: string } | null>(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/expenses?status=PENDING&limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Also fetch IN_REVIEW
      const res2 = await fetch('/api/expenses?status=IN_REVIEW&limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data2 = await res2.json();
      const all = [...(data.expenses || []), ...(data2.expenses || [])];
      // Filter only those where current user is the current approver
      const pending = all.filter(exp => {
        return exp.approvalSteps?.some(
          (s: { approverId: string; status: string }) => s.approverId === user?.id && s.status === 'PENDING'
        );
      });
      setExpenses(pending);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, user]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/expenses/${actionModal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: actionModal.action, comments }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Expense ${actionModal.action.toLowerCase()}d successfully`, 'success');
        setActionModal(null);
        setComments('');
        fetchExpenses();
      } else {
        showToast(data.error || 'Failed to process', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
    setProcessing(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>
        Pending Approvals
      </h1>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="page-loader"><div className="spinner" /><p>Loading...</p></div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>All caught up!</h3>
              <p>No expenses waiting for your approval</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Submitted By</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount (Company)</th>
                    <th>Original</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #714b67, #8e6585)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700,
                          }}>
                            {exp.submitter.firstName[0]}{exp.submitter.lastName[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{exp.submitter.firstName} {exp.submitter.lastName}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</td>
                      <td>{exp.category}</td>
                      <td style={{ fontWeight: 600, color: '#1f2937' }}>{exp.convertedAmount.toFixed(2)} {exp.companyCurrency}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{exp.amount} {exp.originalCurrency}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{new Date(exp.expenseDate).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-success btn-sm" onClick={() => setActionModal({ id: exp.id, action: 'APPROVE' })}>
                            ✓ Approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setActionModal({ id: exp.id, action: 'REJECT' })}>
                            ✕ Reject
                          </button>
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

      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{actionModal.action === 'APPROVE' ? '✅ Approve' : '❌ Reject'} Expense</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setActionModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Comments (optional)</label>
                <textarea className="form-textarea" placeholder="Add a comment..." value={comments}
                  onChange={e => setComments(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button className={`btn ${actionModal.action === 'APPROVE' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleAction} disabled={processing}>
                {processing ? <span className="spinner" /> : null}
                {actionModal.action === 'APPROVE' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
