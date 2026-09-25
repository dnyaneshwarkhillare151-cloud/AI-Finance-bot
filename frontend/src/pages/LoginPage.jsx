import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService, miscService } from '../services/api';
import { extractError } from '../utils/helpers';
import toast from 'react-hot-toast';
import { TrendingUp, Eye, EyeOff, Loader } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authService.login(form);
      login(res.data.access_token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.full_name}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setForm({ email: 'demo@financeai.in', password: 'demo1234' });
    setLoading(true);
    try {
      const res = await authService.login({ email: 'demo@financeai.in', password: 'demo1234' });
      login(res.data.access_token, res.data.user);
      toast.success('Logged in as demo user!');
      navigate('/dashboard');
    } catch {
      try {
        const reg = await authService.register({
          full_name: 'Demo User',
          email: 'demo@financeai.in',
          password: 'demo1234',
          confirm_password: 'demo1234',
        });
        login(reg.data.access_token, reg.data.user);
        await miscService.seedDemo();
        toast.success('Demo account created with sample data! 🎉');
        navigate('/dashboard');
      } catch (err2) {
        toast.error('Could not create demo account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#1e40af,#7c3aed)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} color="white" />
            </div>
          </div>
          <div className="auth-title">Welcome Back</div>
          <div className="auth-subtitle">Sign in to your Personal Finance Advisor</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
            {loading ? <><Loader size={16} className="spinner" style={{ animation: 'spin 0.8s linear infinite', border: 'none', width: 16, height: 16 }} /> Signing In...</> : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-muted)', fontSize: 12 }}>or</div>

        <button onClick={handleDemo} className="btn btn-secondary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          🚀 Try Demo Account
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
