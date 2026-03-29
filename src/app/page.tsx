'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotPreviewUrl, setForgotPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const result = await login(form.email, form.password);
    if (result.success) {
      showToast('Welcome back!', 'success');
      router.push('/dashboard');
    } else {
      setErrors(result.errors || {});
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address');
      return;
    }
    setForgotSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setForgotSuccess(true);
        setForgotPreviewUrl(data.previewUrl || null);
        showToast('New password sent to your email!', 'success');
      } else {
        setForgotError(data.error || 'Something went wrong');
      }
    } catch {
      setForgotError('Network error. Please try again.');
    }
    setForgotSubmitting(false);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <p>Loading...</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <div style={styles.branding}>
          <div style={styles.logo}>💼</div>
          <h1 style={styles.brandName}>ReimburseFlow</h1>
          <p style={styles.tagline}>Streamline expense management with intelligent approval workflows</p>
          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>⚡</span>
              <div>
                <strong>Multi-Level Approvals</strong>
                <p>Configure sequential, percentage-based, or hybrid approval chains</p>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🌍</span>
              <div>
                <strong>Multi-Currency</strong>
                <p>Submit expenses in any currency with automatic conversion</p>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>📸</span>
              <div>
                <strong>OCR Receipt Scan</strong>
                <p>Auto-fill expense details by scanning your receipts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Welcome Back</h2>
          <p style={styles.formSubtitle}>Sign in to your account to continue</p>

          {errors.general && (
            <div style={styles.alert}>{errors.general}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                id="login-email"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(form.email); setForgotSuccess(false); setForgotError(''); setForgotPreviewUrl(null); }}
                  style={styles.forgotLink}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                id="login-password"
                style={{ marginTop: 6 }}
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting}
              id="login-submit"
              style={{ width: '100%', marginTop: 8 }}
            >
              {submitting ? <span className="spinner" /> : null}
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={styles.switchText}>
            Don&apos;t have an account?{' '}
            <a href="/signup" style={styles.link}>Create one</a>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="modal-overlay" onClick={() => setShowForgot(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Reset Your Password</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForgot(false)}>✕</button>
            </div>
            <div className="modal-body">
              {!forgotSuccess ? (
                <>
                  <p style={{ color: '#6b7280', fontSize: '0.9375rem', marginBottom: 20 }}>
                    Enter your email address and we&apos;ll send you a new temporary password.
                  </p>
                  {forgotError && <div style={styles.alert}>{forgotError}</div>}
                  <form onSubmit={handleForgotPassword}>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-input" placeholder="you@company.com"
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}
                      disabled={forgotSubmitting}>
                      {forgotSubmitting ? <span className="spinner" /> : null}
                      {forgotSubmitting ? 'Sending...' : 'Send New Password'}
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>📧</div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 8, color: '#1f2937' }}>
                    Check Your Email
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9375rem', marginBottom: 16 }}>
                    If an account exists for <strong>{forgotEmail}</strong>, a new temporary password has been sent.
                  </p>
                  <p style={{ color: '#e67e22', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 16 }}>
                    ⚠️ Please change your password after logging in via Dashboard → Settings.
                  </p>
                  {forgotPreviewUrl && (
                    <p style={{ fontSize: '0.75rem', color: '#714b67' }}>
                      🧪 Dev mode:{' '}
                      <a href={forgotPreviewUrl} target="_blank" rel="noopener" style={{ color: '#714b67', textDecoration: 'underline' }}>
                        View email in browser
                      </a>
                    </p>
                  )}
                  <button className="btn btn-primary" onClick={() => setShowForgot(false)} style={{ marginTop: 16 }}>
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  left: {
    flex: 1,
    background: 'linear-gradient(135deg, #714b67 0%, #5a3a52 50%, #462e40 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    position: 'relative',
    overflow: 'hidden',
  },
  branding: {
    color: '#fff',
    maxWidth: 480,
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    fontSize: '3rem',
    marginBottom: 16,
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
  },
  brandName: {
    fontSize: '2.5rem',
    fontWeight: 800,
    marginBottom: 12,
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: '1.125rem',
    opacity: 0.9,
    marginBottom: 40,
    lineHeight: 1.6,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  feature: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: '1.5rem',
    padding: '10px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: '#fff',
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
  },
  formTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 8,
  },
  formSubtitle: {
    color: '#6b7280',
    marginBottom: 32,
    fontSize: '0.9375rem',
  },
  alert: {
    padding: '12px 16px',
    background: '#fdeaea',
    color: '#c0392b',
    borderRadius: '8px',
    marginBottom: 20,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: '#714b67',
    fontWeight: 600,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'none',
  },
  switchText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  link: {
    color: '#714b67',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
