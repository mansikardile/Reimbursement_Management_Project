'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => ({
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  }), [password]);
  const score = Object.values(checks).filter(Boolean).length;
  const label = score <= 1 ? 'Very Weak' : score === 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Strong' : 'Very Strong';
  const color = score <= 1 ? '#e74c3c' : score === 2 ? '#e67e22' : score === 3 ? '#f1c40f' : score === 4 ? '#2ecc71' : '#27ae60';
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i<=score?color:'#e5e7eb', transition:'all 0.3s' }}/>
        ))}
      </div>
      <span style={{ fontSize:'0.75rem', fontWeight:600, color }}>{label}</span>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px', marginTop:6 }}>
        {[
          {key:'length',label:'6+ characters'},{key:'uppercase',label:'Uppercase (A-Z)'},
          {key:'lowercase',label:'Lowercase (a-z)'},{key:'number',label:'Number (0-9)'},
          {key:'special',label:'Special (!@#$)'},
        ].map(item=>(
          <div key={item.key} style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.6875rem',color:checks[item.key as keyof typeof checks]?'#2ecc71':'#9ca3af'}}>
            <span style={{fontSize:'0.625rem'}}>{checks[item.key as keyof typeof checks]?'✅':'○'}</span>{item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    const newErrors: Record<string, string> = {};
    if (!currentPassword) newErrors.currentPassword = 'Current password is required';
    if (!newPassword || newPassword.length < 6) newErrors.newPassword = 'New password must be at least 6 characters';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (currentPassword === newPassword) newErrors.newPassword = 'New password must be different from current password';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password changed successfully!', 'success');
      } else {
        setErrors(data.details || { general: data.error || 'Failed to change password' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    }
    setSubmitting(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>⚙️ Settings</h1>
        <p style={{ color: '#6b7280' }}>Manage your account settings</p>
      </div>

      {/* Profile Info (read-only) */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16, color: '#1f2937' }}>Profile Info</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="form-label">Name</label>
            <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, color: '#374151' }}>
              {user?.firstName} {user?.lastName}
            </div>
          </div>
          <div>
            <label className="form-label">Email</label>
            <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, color: '#374151' }}>
              {user?.email}
            </div>
          </div>
          <div>
            <label className="form-label">Role</label>
            <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, color: '#374151' }}>
              <span className={`badge badge-${user?.role === 'ADMIN' ? 'danger' : user?.role === 'MANAGER' ? 'warning' : 'info'}`}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16, color: '#1f2937' }}>🔒 Change Password</h3>

        {success && (
          <div style={{ padding: '12px 16px', background: '#d4edda', color: '#155724', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>
            ✅ Password changed successfully!
          </div>
        )}
        {errors.general && (
          <div style={{ padding: '12px 16px', background: '#fdeaea', color: '#c0392b', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ maxWidth: 400 }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className={`form-input ${errors.currentPassword ? 'error' : ''}`}
              placeholder="Enter current password" value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setErrors({ ...errors, currentPassword: '' }); }}
            />
            {errors.currentPassword && <span className="form-error">{errors.currentPassword}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className={`form-input ${errors.newPassword ? 'error' : ''}`}
              placeholder="Min 6 characters" value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setErrors({ ...errors, newPassword: '' }); }}
            />
            {errors.newPassword && <span className="form-error">{errors.newPassword}</span>}
            <PasswordStrength password={newPassword} />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className={`form-input ${errors.confirmPassword || (confirmPassword && newPassword !== confirmPassword) ? 'error' : ''}`}
              placeholder="Re-enter new password" value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: '' }); }}
            />
            {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            {confirmPassword && newPassword !== confirmPassword && !errors.confirmPassword && (
              <span className="form-error">Passwords do not match</span>
            )}
            {confirmPassword && newPassword === confirmPassword && confirmPassword.length > 0 && (
              <span style={{ display: 'block', marginTop: 4, fontSize: '0.8125rem', color: '#2ecc71' }}>✅ Passwords match</span>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <span className="spinner" /> : null}
            {submitting ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
