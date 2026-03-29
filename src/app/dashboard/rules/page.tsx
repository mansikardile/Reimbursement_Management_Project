'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ApprovalRulesPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rules, setRules] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', ruleType: 'SEQUENTIAL' as string, percentThreshold: '', minAmount: '', maxAmount: '',
    isManagerFirst: true, specificApproverId: '',
    steps: [{ approverId: '', roleLabel: '', stepOrder: 1 }],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [rulesRes, usersRes] = await Promise.all([
        fetch('/api/approval-rules', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const rulesData = await rulesRes.json();
      const usersData = await usersRes.json();
      setRules(rulesData.rules || []);
      setUsers(usersData.users || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...f.steps, { approverId: '', roleLabel: '', stepOrder: f.steps.length + 1 }],
    }));
  };

  const removeStep = (idx: number) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepOrder: i + 1 })),
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateStep = (idx: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      steps: f.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const body = {
        ...form,
        percentThreshold: form.percentThreshold ? parseFloat(form.percentThreshold) : undefined,
        minAmount: form.minAmount ? parseFloat(form.minAmount) : undefined,
        maxAmount: form.maxAmount ? parseFloat(form.maxAmount) : undefined,
        specificApproverId: form.specificApproverId || undefined,
      };
      const res = await fetch('/api/approval-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Approval rule created!', 'success');
        setShowModal(false);
        setForm({ name: '', ruleType: 'SEQUENTIAL', percentThreshold: '', minAmount: '', maxAmount: '', isManagerFirst: true, specificApproverId: '', steps: [{ approverId: '', roleLabel: '', stepOrder: 1 }] });
        fetchData();
      } else {
        setErrors(data.details || { general: data.error });
      }
    } catch { setErrors({ general: 'Network error' }); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    try {
      const res = await fetch(`/api/approval-rules?id=${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { showToast('Rule deleted', 'success'); fetchData(); }
    } catch { /* ignore */ }
  };

  const ruleTypeLabels: Record<string, string> = {
    SEQUENTIAL: '📋 Sequential', PERCENTAGE: '📊 Percentage', SPECIFIC_APPROVER: '👤 Specific Approver', HYBRID: '🔀 Hybrid',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>Approval Rules</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Rule</button>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /><p>Loading rules...</p></div>
      ) : rules.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⚙️</div>
            <h3>No approval rules defined</h3>
            <p>Create an approval rule to define how expenses are approved</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {rules.map(rule => (
            <div className="card" key={rule.id}>
              <div className="card-header">
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{rule.name}</h3>
                  <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                    {ruleTypeLabels[rule.ruleType] || rule.ruleType}
                    {rule.percentThreshold && ` • ${rule.percentThreshold}% threshold`}
                    {rule.minAmount != null && ` • Min: ${rule.minAmount}`}
                    {rule.maxAmount != null && ` • Max: ${rule.maxAmount}`}
                    {rule.isManagerFirst && ' • Manager First'}
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: '#e74c3c' }} onClick={() => handleDelete(rule.id)}>🗑 Delete</button>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {rule.steps.map((step: { stepOrder: number; roleLabel: string; approver: { firstName: string; lastName: string } }, i: number) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                      background: '#f5f0f4', borderRadius: 8, fontSize: '0.8125rem',
                    }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%', background: '#714b67', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700,
                      }}>{step.stepOrder}</span>
                      <span style={{ fontWeight: 500 }}>{step.roleLabel}</span>
                      <span style={{ color: '#9ca3af' }}>→ {step.approver.firstName} {step.approver.lastName}</span>
                    </div>
                  ))}
                </div>
                {rule.specificApprover && (
                  <p style={{ marginTop: 12, fontSize: '0.8125rem', color: '#6b7280' }}>
                    🔑 Specific approver override: <strong>{rule.specificApprover.firstName} {rule.specificApprover.lastName}</strong>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Rule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Approval Rule</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {errors.general && <div style={{ padding: '12px 16px', background: '#fdeaea', color: '#c0392b', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>{errors.general}</div>}
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Rule Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Standard Approval" />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Rule Type *</label>
                    <select className="form-select" value={form.ruleType} onChange={e => setForm({ ...form, ruleType: e.target.value })}>
                      <option value="SEQUENTIAL">Sequential</option>
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="SPECIFIC_APPROVER">Specific Approver</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                  {(form.ruleType === 'PERCENTAGE' || form.ruleType === 'HYBRID') && (
                    <div className="form-group">
                      <label className="form-label">Threshold %</label>
                      <input type="number" className="form-input" value={form.percentThreshold} placeholder="e.g., 60"
                        onChange={e => setForm({ ...form, percentThreshold: e.target.value })} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Min Amount</label>
                    <input type="number" className="form-input" value={form.minAmount} placeholder="Optional"
                      onChange={e => setForm({ ...form, minAmount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Amount</label>
                    <input type="number" className="form-input" value={form.maxAmount} placeholder="Optional"
                      onChange={e => setForm({ ...form, maxAmount: e.target.value })} />
                  </div>
                </div>

                {(form.ruleType === 'SPECIFIC_APPROVER' || form.ruleType === 'HYBRID') && (
                  <div className="form-group">
                    <label className="form-label">Specific Approver (auto-approves)</label>
                    <select className="form-select" value={form.specificApproverId} onChange={e => setForm({ ...form, specificApproverId: e.target.value })}>
                      <option value="">Select user</option>
                      {users.filter(u => u.role !== 'EMPLOYEE').map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isManagerFirst}
                      onChange={e => setForm({ ...form, isManagerFirst: e.target.checked })} />
                    <span className="form-label" style={{ marginBottom: 0 }}>Manager approves first (IS_MANAGER_APPROVER)</span>
                  </label>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Approval Steps *</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addStep}>+ Add Step</button>
                  </div>
                  {form.steps.map((step, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#714b67', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                      }}>{step.stepOrder}</span>
                      <select className="form-select" value={step.approverId} onChange={e => updateStep(idx, 'approverId', e.target.value)} style={{ fontSize: '0.8125rem' }}>
                        <option value="">Select approver</option>
                        {users.filter(u => u.role !== 'EMPLOYEE').map(u => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                      </select>
                      <input className="form-input" placeholder="Role label (e.g., Manager)" value={step.roleLabel}
                        onChange={e => updateStep(idx, 'roleLabel', e.target.value)} style={{ fontSize: '0.8125rem' }} />
                      {form.steps.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-icon" style={{ color: '#e74c3c' }} onClick={() => removeStep(idx)}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                  {submitting ? <span className="spinner" /> : null}
                  {submitting ? 'Creating...' : 'Create Rule'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
