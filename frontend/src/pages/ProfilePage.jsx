import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { extractError } from '../utils/helpers';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Save, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    currency_symbol: user?.currency_symbol || '₹',
  });
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPass, setShowPass] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name.trim()) { toast.error('Name is required'); return; }
    setProfileLoading(true);
    try {
      const res = await authService.updateProfile(profileForm);
      updateUser(res.data);
      toast.success('Profile updated!');
    } catch (err) { toast.error(extractError(err)); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passForm.current_password || !passForm.new_password) { toast.error('All fields required'); return; }
    if (passForm.new_password.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (passForm.new_password !== passForm.confirm_password) { toast.error('Passwords do not match'); return; }
    setPassLoading(true);
    try {
      await authService.updateProfile({ current_password: passForm.current_password, new_password: passForm.new_password });
      toast.success('Password changed!');
      setPassForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { toast.error(extractError(err)); }
    finally { setPassLoading(false); }
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Profile Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Manage your account information and security</p>
      </div>

      {/* Avatar Card */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'white', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.full_name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span className="badge badge-success" style={{ fontSize: 10 }}>✅ Verified</span>
            <span className="ai-badge" style={{ fontSize: 10 }}>FinanceAI Member</span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <User size={18} color="var(--accent-blue)" />
          <div className="card-title">Personal Information</div>
        </div>
        <form onSubmit={handleProfileSave}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" value={profileForm.full_name}
              onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={profileForm.email}
              onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Currency Symbol</label>
            <select className="form-select" value={profileForm.currency_symbol} onChange={e => setProfileForm(f => ({ ...f, currency_symbol: e.target.value }))}>
              <option value="₹">₹ Indian Rupee (INR)</option>
              <option value="$">$ US Dollar (USD)</option>
              <option value="€">€ Euro (EUR)</option>
              <option value="£">£ British Pound (GBP)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={profileLoading}>
            <Save size={15} /> {profileLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password Form */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={18} color="var(--accent-purple)" />
          <div className="card-title">Change Password</div>
        </div>
        <form onSubmit={handlePasswordChange}>
          {['current_password', 'new_password', 'confirm_password'].map(field => (
            <div key={field} className="form-group">
              <label className="form-label" style={{ textTransform: 'capitalize' }}>
                {field.replace(/_/g, ' ')}
              </label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass ? 'text' : 'password'}
                  value={passForm[field]} onChange={e => setPassForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={field === 'current_password' ? 'Current password' : field === 'new_password' ? 'Min. 6 characters' : 'Repeat new password'}
                  style={{ paddingRight: 40 }} autoComplete={field === 'current_password' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" className="btn btn-primary" disabled={passLoading}>
            <Shield size={15} /> {passLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
        FinanceAI · Personal Finance Advisor · All data stored locally and securely
      </p>
    </div>
  );
}
