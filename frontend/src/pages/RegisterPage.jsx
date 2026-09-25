import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { extractError } from '../utils/helpers';
import toast from 'react-hot-toast';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authService.register(form);
      login(res.data.access_token, res.data.user);
      toast.success(`Account created! Welcome, ${res.data.user.full_name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#1e40af,#7c3aed)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} color="white" />
            </div>
          </div>
          <div className="auth-title">Create Account</div>
          <div className="auth-subtitle">Start your journey to financial freedom</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="Rahul Sharma" value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })} autoComplete="name" />
            {errors.full_name && <div className="form-error">{errors.full_name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="rahul@example.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ paddingRight: 40 }} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Re-enter password"
                value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                autoComplete="new-password" />
              {errors.confirm_password && <div className="form-error">{errors.confirm_password}</div>}
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Free Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          By creating an account, you agree to use this platform for personal finance management.
          This is an educational tool, not a substitute for professional financial advice.
        </p>
      </div>
    </div>
  );
}
