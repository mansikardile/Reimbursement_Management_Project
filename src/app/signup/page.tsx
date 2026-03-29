'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

interface Country {
  name: string;
  currencies: { code: string; name: string; symbol: string }[];
}

function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => {
    return {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };
  }, [password]);

  const score = Object.values(checks).filter(Boolean).length;
  const strengthLabel = score <= 1 ? 'Very Weak' : score === 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Strong' : 'Very Strong';
  const strengthColor = score <= 1 ? '#e74c3c' : score === 2 ? '#e67e22' : score === 3 ? '#f1c40f' : score === 4 ? '#2ecc71' : '#27ae60';

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= score ? strengthColor : '#e5e7eb',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strengthColor }}>{strengthLabel}</span>
      </div>
      {/* Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
        {[
          { key: 'length', label: '6+ characters' },
          { key: 'uppercase', label: 'Uppercase (A-Z)' },
          { key: 'lowercase', label: 'Lowercase (a-z)' },
          { key: 'number', label: 'Number (0-9)' },
          { key: 'special', label: 'Special (!@#$)' },
        ].map(item => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.6875rem', color: checks[item.key as keyof typeof checks] ? '#2ecc71' : '#9ca3af',
            transition: 'color 0.2s',
          }}>
            <span style={{ fontSize: '0.625rem' }}>{checks[item.key as keyof typeof checks] ? '✅' : '○'}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const { user, signup, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    companyName: '', country: '', currency: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);

  // Email verification state
  const [emailStep, setEmailStep] = useState<'input' | 'otp-sent' | 'verified'>('input');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    fetch('/api/currencies')
      .then(r => r.json())
      .then(data => { setCountries(data.countries || []); setLoadingCountries(false); })
      .catch(() => setLoadingCountries(false));
  }, []);

  const selectedCountry = countries.find(c => c.name === form.country);

  const handleCountryChange = (countryName: string) => {
    const c = countries.find(ct => ct.name === countryName);
    setForm({
      ...form,
      country: countryName,
      currency: c?.currencies[0]?.code || '',
    });
    setErrors({ ...errors, country: '', currency: '' });
  };

  const handleSendOTP = async () => {
    if (!form.email || !form.email.includes('@')) {
      setErrors({ ...errors, email: 'Please enter a valid email address' });
      return;
    }
    setSendingOTP(true);
    setOtpError('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email: form.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailStep('otp-sent');
        setPreviewUrl(data.previewUrl || null);
        showToast('Verification code sent! Check your email.', 'success');
      } else {
        setOtpError(data.error || 'Failed to send code');
      }
    } catch {
      setOtpError('Network error. Please try again.');
    }
    setSendingOTP(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter the 6-digit code');
      return;
    }
    setVerifyingOTP(true);
    setOtpError('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email: form.email, otp }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setEmailStep('verified');
        showToast('Email verified! ✅', 'success');
      } else {
        setOtpError(data.error || 'Invalid code');
      }
    } catch {
      setOtpError('Network error. Please try again.');
    }
    setVerifyingOTP(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validations
    const newErrors: Record<string, string> = {};
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (emailStep !== 'verified') {
      newErrors.email = 'Please verify your email first';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    const { confirmPassword, ...submitData } = form;
    void confirmPassword;
    const result = await signup(submitData);
    if (result.success) {
      showToast('Account created! Welcome to ReimburseFlow.', 'success');
      router.push('/dashboard');
    } else {
      setErrors(result.errors || {});
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="page-loader"><div className="spinner" style={{ width: 40, height: 40 }} /><p>Loading...</p></div>;
  }
  if (user) return null;

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <div style={styles.branding}>
          <div style={styles.logo}>💼</div>
          <h1 style={styles.brandName}>ReimburseFlow</h1>
          <p style={styles.tagline}>Create your company account and start managing expenses efficiently</p>
          <div style={styles.steps}>
            <div style={styles.step}><span style={styles.stepNum}>1</span> Verify your email</div>
            <div style={styles.step}><span style={styles.stepNum}>2</span> Create your account</div>
            <div style={styles.step}><span style={styles.stepNum}>3</span> Add team members</div>
            <div style={styles.step}><span style={styles.stepNum}>4</span> Start managing expenses</div>
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Create Account</h2>
          <p style={styles.formSubtitle}>Set up your company in minutes</p>

          {errors.general && <div style={styles.alert}>{errors.general}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className={`form-input ${errors.firstName ? 'error' : ''}`} placeholder="John" value={form.firstName}
                  onChange={e => { setForm({ ...form, firstName: e.target.value }); setErrors({ ...errors, firstName: '' }); }} id="signup-firstname" />
                {errors.firstName && <span className="form-error">{errors.firstName}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className={`form-input ${errors.lastName ? 'error' : ''}`} placeholder="Doe" value={form.lastName}
                  onChange={e => { setForm({ ...form, lastName: e.target.value }); setErrors({ ...errors, lastName: '' }); }} id="signup-lastname" />
                {errors.lastName && <span className="form-error">{errors.lastName}</span>}
              </div>
            </div>

            {/* Email with OTP verification */}
            <div className="form-group">
              <label className="form-label">
                Email Address
                {emailStep === 'verified' && (
                  <span style={{ color: '#2ecc71', fontWeight: 600, marginLeft: 8, fontSize: '0.75rem' }}>✅ Verified</span>
                )}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@company.com" value={form.email}
                  onChange={e => {
                    setForm({ ...form, email: e.target.value });
                    setErrors({ ...errors, email: '' });
                    if (emailStep !== 'input') setEmailStep('input');
                  }}
                  disabled={emailStep === 'verified'}
                  id="signup-email"
                  style={{ flex: 1 }}
                />
                {emailStep !== 'verified' && (
                  <button type="button" className="btn btn-secondary" onClick={handleSendOTP}
                    disabled={sendingOTP || !form.email} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {sendingOTP ? <span className="spinner" /> : null}
                    {emailStep === 'otp-sent' ? 'Resend' : 'Verify'}
                  </button>
                )}
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}

              {/* OTP Input */}
              {emailStep === 'otp-sent' && (
                <div style={{
                  marginTop: 12, padding: 16, background: '#f5f0f4', borderRadius: 8,
                  animation: 'slideDown 0.2s ease',
                }}>
                  <p style={{ fontSize: '0.8125rem', color: '#374151', marginBottom: 8 }}>
                    Enter the 6-digit code sent to <strong>{form.email}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" placeholder="000000" value={otp}
                      onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                      style={{ flex: 1, letterSpacing: 4, textAlign: 'center', fontWeight: 700, fontSize: '1.125rem' }}
                      maxLength={6}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleVerifyOTP} disabled={verifyingOTP}>
                      {verifyingOTP ? <span className="spinner" /> : '→'}
                    </button>
                  </div>
                  {otpError && <span className="form-error" style={{ marginTop: 4 }}>{otpError}</span>}
                  {previewUrl && (
                    <p style={{ fontSize: '0.6875rem', color: '#714b67', marginTop: 8 }}>
                      🧪 Dev mode: <a href={previewUrl} target="_blank" rel="noopener" style={{ color: '#714b67', textDecoration: 'underline' }}>View email in browser</a>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Password with strength meter */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className={`form-input ${errors.password ? 'error' : ''}`} placeholder="Min 6 characters" value={form.password}
                onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }} id="signup-password" />
              {errors.password && <span className="form-error">{errors.password}</span>}
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password"
                className={`form-input ${errors.confirmPassword || (form.confirmPassword && form.password !== form.confirmPassword) ? 'error' : ''}`}
                placeholder="Re-enter your password" value={form.confirmPassword}
                onChange={e => { setForm({ ...form, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: '' }); }}
                id="signup-confirm-password" />
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              {form.confirmPassword && form.password !== form.confirmPassword && !errors.confirmPassword && (
                <span className="form-error">Passwords do not match</span>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length > 0 && (
                <span style={{ display: 'block', marginTop: 4, fontSize: '0.8125rem', color: '#2ecc71' }}>✅ Passwords match</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className={`form-input ${errors.companyName ? 'error' : ''}`} placeholder="Acme Corp" value={form.companyName}
                onChange={e => { setForm({ ...form, companyName: e.target.value }); setErrors({ ...errors, companyName: '' }); }} id="signup-company" />
              {errors.companyName && <span className="form-error">{errors.companyName}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Country</label>
                <select className={`form-select ${errors.country ? 'error' : ''}`} value={form.country}
                  onChange={e => handleCountryChange(e.target.value)} id="signup-country" disabled={loadingCountries}>
                  <option value="">{loadingCountries ? 'Loading...' : 'Select country'}</option>
                  {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                {errors.country && <span className="form-error">{errors.country}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Company Currency</label>
                <select className={`form-select ${errors.currency ? 'error' : ''}`} value={form.currency}
                  onChange={e => { setForm({ ...form, currency: e.target.value }); setErrors({ ...errors, currency: '' }); }} id="signup-currency">
                  <option value="">Select currency</option>
                  {selectedCountry?.currencies.map(cur => (
                    <option key={cur.code} value={cur.code}>{cur.code} — {cur.name} ({cur.symbol})</option>
                  ))}
                </select>
                {errors.currency && <span className="form-error">{errors.currency}</span>}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg"
              disabled={submitting || emailStep !== 'verified'} id="signup-submit"
              style={{ width: '100%', marginTop: 8 }}>
              {submitting ? <span className="spinner" /> : null}
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={styles.switchText}>
            Already have an account? <a href="/" style={styles.link}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', minHeight: '100vh' },
  left: {
    flex: '0 0 420px', background: 'linear-gradient(135deg, #714b67 0%, #5a3a52 50%, #462e40 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  branding: { color: '#fff', maxWidth: 340 },
  logo: { fontSize: '3rem', marginBottom: 16 },
  brandName: { fontSize: '2rem', fontWeight: 800, marginBottom: 12 },
  tagline: { fontSize: '1rem', opacity: 0.9, marginBottom: 32, lineHeight: 1.6 },
  steps: { display: 'flex', flexDirection: 'column', gap: 16 },
  step: { display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.9375rem' },
  stepNum: {
    width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
  },
  right: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#fff', overflowY: 'auto' },
  formContainer: { width: '100%', maxWidth: 520 },
  formTitle: { fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', marginBottom: 8 },
  formSubtitle: { color: '#6b7280', marginBottom: 32, fontSize: '0.9375rem' },
  alert: { padding: '12px 16px', background: '#fdeaea', color: '#c0392b', borderRadius: 8, marginBottom: 20, fontSize: '0.875rem', fontWeight: 500 },
  switchText: { textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: '0.875rem' },
  link: { color: '#714b67', fontWeight: 600, textDecoration: 'none' },
};
