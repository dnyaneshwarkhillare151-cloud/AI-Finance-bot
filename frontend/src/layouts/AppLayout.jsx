import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useState } from 'react';
import QuickExpenseModal from '../components/QuickExpenseModal';
import {
  LayoutDashboard, CreditCard, Target, Wallet, Bot,
  BarChart3, Bell, User, LogOut, TrendingUp, Settings,
  ChevronLeft, Menu, Sparkles, Plus, Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: CreditCard, label: 'Transactions' },
  { to: '/budgets', icon: Wallet, label: 'Budgets' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/ai-advisor', icon: Bot, label: 'AI Advisor', ai: true },
  { to: '/ai-insights', icon: Sparkles, label: 'AI Insights', ai: true },
  { to: '/reports', icon: BarChart3, label: 'Statement & Reports' },
  { to: '/notifications', icon: Bell, label: 'Notifications', badge: true },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showQuickExpense, setShowQuickExpense] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} style={{ width: collapsed ? 72 : 260 }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!collapsed && (
            <div>
              <div className="logo-text">FinAdvisor <span style={{ color: '#06b6d4' }}>AI</span></div>
              <div className="logo-sub">Personal Wealth Platform</div>
            </div>
          )}
          {collapsed && <TrendingUp size={24} color="#3b82f6" style={{ margin: '0 auto' }} />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn-icon btn"
            style={{ marginLeft: 'auto', padding: 4, display: 'none' }}
            title="Toggle sidebar"
          >
            <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-section-title">Navigation</div>}
          {NAV_ITEMS.map(({ to, icon: Icon, label, ai, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{label}</span>
                  {ai && <span className="ai-badge">AI</span>}
                  {badge && unreadCount > 0 && (
                    <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </>
              )}
              {collapsed && badge && unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="user-info">
              <div className="user-avatar">{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name || 'User'}
                </div>
                <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
            </div>
          )}
          <button
            className="nav-item btn"
            style={{ width: '100%', color: '#ef4444', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-content" style={{ marginLeft: collapsed ? 72 : 260 }}>
        {/* Topbar */}
        <header className="topbar">
          <button className="btn btn-icon" style={{ display: 'none' }} onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="ai-badge" style={{ fontSize: 10 }}>
              <span>🤖</span> GEMINI & RAG
            </div>
            <div className="ai-badge" style={{ fontSize: 10, borderColor: 'rgba(16,185,129,0.3)', color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
              <span>🛡️</span> LOCAL PRIVACY
            </div>
          </div>

          <div className="topbar-actions">
            {/* Quick Expense CTA */}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowQuickExpense(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Zap size={14} /> Quick Expense
            </button>

            <NavLink
              to="/notifications"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: 8,
                borderRadius: 8,
                color: 'var(--text-secondary)',
                transition: 'color 0.2s'
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 16,
                  height: 16,
                  background: '#ef4444',
                  borderRadius: '50%',
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div
              className="user-avatar"
              style={{ width: 34, height: 34, fontSize: 12, cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
              title="View Profile"
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {/* Global Quick Expense Modal */}
      <QuickExpenseModal
        isOpen={showQuickExpense}
        onClose={() => setShowQuickExpense(false)}
        onSuccess={() => {
          refreshNotifications();
          // Broadcast custom event so active pages like Dashboard/Transactions refresh their data
          window.dispatchEvent(new Event('transaction-updated'));
        }}
      />
    </div>
  );
}
