'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Chatbot from '@/components/Chatbot';

const navItems = {
  ADMIN: [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/users', label: 'Users', icon: '👥' },
    { href: '/dashboard/rules', label: 'Approval Rules', icon: '⚙️' },
    { href: '/dashboard/all-expenses', label: 'All Expenses', icon: '📋' },
    { href: '/dashboard/expenses/new', label: 'Submit Expense', icon: '➕' },
    { href: '/dashboard/settings', label: 'Settings', icon: '🔒' },
  ],
  MANAGER: [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/approvals', label: 'Approvals', icon: '✅' },
    { href: '/dashboard/expenses', label: 'My Expenses', icon: '💰' },
    { href: '/dashboard/expenses/new', label: 'Submit Expense', icon: '➕' },
    { href: '/dashboard/settings', label: 'Settings', icon: '🔒' },
  ],
  EMPLOYEE: [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/expenses', label: 'My Expenses', icon: '💰' },
    { href: '/dashboard/expenses/new', label: 'Submit Expense', icon: '➕' },
    { href: '/dashboard/settings', label: 'Settings', icon: '🔒' },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, company, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="page-loader"><div className="spinner" style={{ width: 40, height: 40 }} /><p>Loading...</p></div>;
  }

  const items = navItems[user.role] || navItems.EMPLOYEE;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.sidebarLogo}>
            <span style={{ fontSize: '1.5rem' }}>💼</span>
            <span style={styles.logoText}>ReimburseFlow</span>
          </div>
          <div style={styles.companyBadge}>
            {company?.name}
            <span style={styles.currencyTag}>{company?.currency}</span>
          </div>
        </div>

        <nav style={styles.nav}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navItem,
                ...(pathname === item.href ? styles.navItemActive : {}),
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <div style={styles.userName}>{user.firstName} {user.lastName}</div>
              <div style={styles.userRole}>{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12, justifyContent: 'flex-start' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        <div style={styles.content}>
          {children}
        </div>
      </main>
      <Chatbot />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: 260,
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  sidebarTop: {
    padding: '24px 20px 16px',
    borderBottom: '1px solid #f3f4f6',
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  logoText: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#714b67',
  },
  companyBadge: {
    padding: '8px 12px',
    background: '#f5f0f4',
    borderRadius: 8,
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#714b67',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyTag: {
    padding: '2px 8px',
    background: '#714b67',
    color: '#fff',
    borderRadius: 12,
    fontSize: '0.6875rem',
    fontWeight: 700,
  },
  nav: {
    flex: 1,
    padding: '12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#4b5563',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  navItemActive: {
    background: '#f5f0f4',
    color: '#714b67',
    fontWeight: 600,
  },
  sidebarBottom: {
    padding: '16px 20px 20px',
    borderTop: '1px solid #f3f4f6',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #714b67, #8e6585)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  userRole: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    textTransform: 'capitalize' as const,
  },
  main: {
    flex: 1,
    marginLeft: 260,
    background: '#f9fafb',
    minHeight: '100vh',
  },
  content: {
    padding: '32px',
    maxWidth: 1200,
    margin: '0 auto',
  },
};
