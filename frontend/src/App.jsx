import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './layouts/AppLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetsPage from './pages/BudgetsPage';
import GoalsPage from './pages/GoalsPage';
import AIAdvisorPage from './pages/AIAdvisorPage';
import AIInsightsPage from './pages/AIInsightsPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function LoadingScreen({ message = 'Loading FinAdvisor AI...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(30, 64, 175, 0.15) 0%, transparent 70%), #0a0f1e',
      color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: 24,
      textAlign: 'center'
    }}>
      <div style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
      }}>
        <span style={{ fontSize: 24 }}>📈</span>
      </div>

      <div style={{
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: '-0.5px',
        marginBottom: 8,
        background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        FinAdvisor AI
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#94a3b8',
        fontSize: 13,
        marginTop: 8
      }}>
        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
        <span>{message}</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <LoadingScreen message="Checking authentication session..." />;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <LoadingScreen message="Loading page..." />;
  }
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function RootRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <LoadingScreen message="Initializing financial workspace..." />;
  }
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#111827', color: '#f1f5f9', border: '1px solid #1e2d42', fontSize: 13 },
                success: { iconTheme: { primary: '#10b981', secondary: '#111827' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#111827' } },
              }}
            />
            <Routes>
              {/* Unauthenticated Landing & Auth */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

              {/* Protected Application Space */}
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="ai-advisor" element={<AIAdvisorPage />} />
                <Route path="ai-insights" element={<AIInsightsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
