'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string };
}

interface Company {
  id: string;
  name: string;
  country: string;
  currency: string;
}

interface AuthCtx {
  user: User | null;
  company: Company | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; errors?: Record<string, string> }>;
  signup: (data: Record<string, string>) => Promise<{ success: boolean; errors?: Record<string, string> }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setCompany(data.company);
        setToken(savedToken);
      } else {
        localStorage.removeItem('token');
        setUser(null);
        setCompany(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem('token');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setCompany(data.company);
        setToken(data.token);
        localStorage.setItem('token', data.token);
        return { success: true };
      }
      return { success: false, errors: data.details || { general: data.error } };
    } catch {
      return { success: false, errors: { general: 'Network error. Please try again.' } };
    }
  };

  const signup = async (formData: Record<string, string>) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setCompany(data.company);
        setToken(data.token);
        localStorage.setItem('token', data.token);
        return { success: true };
      }
      return { success: false, errors: data.details || { general: data.error } };
    } catch {
      return { success: false, errors: { general: 'Network error. Please try again.' } };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* ignore */ }
    localStorage.removeItem('token');
    setUser(null);
    setCompany(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, company, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
