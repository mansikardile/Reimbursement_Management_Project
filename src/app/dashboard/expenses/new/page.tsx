'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Travel', 'Meals & Entertainment', 'Office Supplies', 'Software', 'Equipment', 'Training', 'Transportation', 'Accommodation', 'Communication', 'Other'];

export default function NewExpensePage() {
  const { token, company } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    amount: '', originalCurrency: '', category: '', description: '', expenseDate: '', receiptUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currencies, setCurrencies] = useState<{ code: string; name: string; symbol: string }[]>([]);
  const [ocrProcessing, setOcrProcessing] = useState(false);

  const loadCurrencies = useCallback(async () => {
    try {
      const res = await fetch('/api/currencies');
      const data = await res.json();
      const allCurrencies: { code: string; name: string; symbol: string }[] = [];
      const seen = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data.countries || []).forEach((c: any) => {
        c.currencies.forEach((cur: { code: string; name: string; symbol: string }) => {
          if (!seen.has(cur.code)) { seen.add(cur.code); allCurrencies.push(cur); }
        });
      });
      allCurrencies.sort((a, b) => a.code.localeCompare(b.code));
      setCurrencies(allCurrencies);
      setForm(f => ({ ...f, originalCurrency: company?.currency || 'USD' }));
    } catch { /* ignore */ }
  }, [company]);

  useEffect(() => { loadCurrencies(); }, [loadCurrencies]);

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrProcessing(true);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Parse OCR text for common patterns
      const amountMatch = text.match(/(?:total|amount|grand\s*total|sum)[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i)
        || text.match(/[\$€£₹]\s*([\d,]+\.?\d*)/);
      const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

      setForm(f => ({
        ...f,
        amount: amountMatch ? amountMatch[1].replace(/,/g, '') : f.amount,
        expenseDate: dateMatch ? formatDate(dateMatch[1]) : f.expenseDate,
        description: text.substring(0, 200).replace(/\n/g, ' ').trim() || f.description,
      }));
      showToast('Receipt scanned! Please review the auto-filled fields.', 'success');
    } catch {
      showToast('Could not process receipt. Please fill in manually.', 'error');
    }
    setOcrProcessing(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    } catch { /* ignore */ }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Expense submitted successfully!', 'success');
        router.push('/dashboard/expenses');
      } else {
        setErrors(data.details || { general: data.error });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>Submit New Expense</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div className="card">
          <div className="card-body">
            {errors.general && <div style={{ padding: '12px 16px', background: '#fdeaea', color: '#c0392b', borderRadius: 8, marginBottom: 20, fontSize: '0.875rem' }}>{errors.general}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Amount *</label>
                  <input type="number" step="0.01" className={`form-input ${errors.amount ? 'error' : ''}`}
                    placeholder="0.00" value={form.amount}
                    onChange={e => { setForm({ ...form, amount: e.target.value }); setErrors({ ...errors, amount: '' }); }} />
                  {errors.amount && <span className="form-error">{errors.amount}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Currency *</label>
                  <select className={`form-select ${errors.originalCurrency ? 'error' : ''}`}
                    value={form.originalCurrency}
                    onChange={e => { setForm({ ...form, originalCurrency: e.target.value }); setErrors({ ...errors, originalCurrency: '' }); }}>
                    <option value="">Select currency</option>
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                  {errors.originalCurrency && <span className="form-error">{errors.originalCurrency}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className={`form-select ${errors.category ? 'error' : ''}`} value={form.category}
                  onChange={e => { setForm({ ...form, category: e.target.value }); setErrors({ ...errors, category: '' }); }}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <span className="form-error">{errors.category}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className={`form-textarea ${errors.description ? 'error' : ''}`} placeholder="Brief description of the expense"
                  value={form.description} rows={3}
                  onChange={e => { setForm({ ...form, description: e.target.value }); setErrors({ ...errors, description: '' }); }} />
                {errors.description && <span className="form-error">{errors.description}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Expense Date *</label>
                <input type="date" className={`form-input ${errors.expenseDate ? 'error' : ''}`}
                  value={form.expenseDate}
                  onChange={e => { setForm({ ...form, expenseDate: e.target.value }); setErrors({ ...errors, expenseDate: '' }); }} />
                {errors.expenseDate && <span className="form-error">{errors.expenseDate}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? <span className="spinner" /> : null}
                {submitting ? 'Submitting...' : 'Submit Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* OCR Panel */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>📸 Scan Receipt (OCR)</h3>
          </div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{
              border: '2px dashed #d1d5db', borderRadius: 12, padding: '32px 16px',
              background: '#f9fafb', marginBottom: 16, cursor: 'pointer',
            }}>
              <input type="file" accept="image/*" onChange={handleOCR} id="ocr-input"
                style={{ display: 'none' }} />
              <label htmlFor="ocr-input" style={{ cursor: 'pointer' }}>
                {ocrProcessing ? (
                  <>
                    <div className="spinner" style={{ margin: '0 auto 12px', width: 32, height: 32 }} />
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Processing receipt...</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📷</div>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
                      Click to upload receipt image
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: 4 }}>
                      Auto-detects amount, date & description
                    </p>
                  </>
                )}
              </label>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Powered by Tesseract.js OCR
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
