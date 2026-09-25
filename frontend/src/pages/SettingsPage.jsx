import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService, aiService, miscService } from '../services/api';
import { extractError } from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  Settings, Bot, Bell, Database, RefreshCw,
  Save, Check, AlertTriangle, Shield, HardDrive
} from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [aiStatus, setAiStatus] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [form, setForm] = useState({
    currency: user?.currency || 'INR',
    monthly_income_target: user?.monthly_income_target || 75000,
  });

  const [notifPref, setNotifPref] = useState({
    budgetAlerts: true,
    goalReminders: true,
    unusualSpending: true,
    aiWeeklyBrief: true,
  });

  const fetchAiStatus = async () => {
    setLoadingAi(true);
    try {
      const res = await aiService.getStatus();
      setAiStatus(res.data);
    } catch {
      setAiStatus({ gemini_available: false, api_key_configured: false });
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchAiStatus();
  }, []);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPref(true);
    try {
      const res = await authService.updateProfile({
        currency: form.currency,
        monthly_income_target: parseFloat(form.monthly_income_target || 0),
      });
      updateUser(res.data);
      toast.success('Preferences saved!');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSavingPref(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await miscService.seedDemo();
      toast.success('Demo data refreshed successfully! 🚀');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 740, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={22} color="var(--accent-blue)" /> Platform Settings & Preferences
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
          Manage AI configuration, notification policies, and database preferences
        </p>
      </div>

      {/* Financial Preferences */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={18} color="var(--accent-blue)" />
          <div className="card-title">Financial Preferences</div>
        </div>
        <form onSubmit={handleSavePreferences}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Default Currency</label>
              <select
                className="form-select"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              >
                <option value="INR">₹ INR (Indian Rupee)</option>
                <option value="USD">$ USD (US Dollar)</option>
                <option value="EUR">€ EUR (Euro)</option>
                <option value="GBP">£ GBP (British Pound)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Income Target (₹)</label>
              <input
                className="form-input"
                type="number"
                step="500"
                min="0"
                placeholder="75000"
                value={form.monthly_income_target}
                onChange={e => setForm(f => ({ ...f, monthly_income_target: e.target.value }))}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={savingPref}>
            <Save size={15} /> {savingPref ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      </div>

      {/* AI & Engine Status */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={18} color="var(--accent-cyan)" />
            <div className="card-title">AI Engine Configuration</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchAiStatus} disabled={loadingAi}>
            <RefreshCw size={13} /> {loadingAi ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Google Gemini LLM Status</span>
            <span className={`badge badge-${aiStatus?.gemini_available ? 'success' : 'warning'}`}>
              {aiStatus?.gemini_available ? '🟢 Online & Connected' : '🟠 Fallback Rule-Engine Active'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {aiStatus?.gemini_available
              ? 'Gemini API is active. Conversational questions and insights use full LLM intelligence.'
              : 'The built-in rule-based expert engine is active. Chat responses, budgets, and health scoring work completely without external keys.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
          {[
            { label: 'Rule-Based Categorization', status: 'Active (Built-in)' },
            { label: 'RAG Knowledge Base', status: 'Active (12 Articles)' },
            { label: 'Statistical Anomaly Detection', status: 'Active' },
            { label: 'Health Score Engine', status: 'Active (100-pt model)' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 6,
              border: '1px solid var(--border)'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Bell size={18} color="var(--accent-yellow)" />
          <div className="card-title">Alert & Notification Policies</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'budgetAlerts', label: 'Budget Overspending Warnings', desc: 'Notify when category spending exceeds 75% and 95% of limit.' },
            { key: 'unusualSpending', label: 'Unusual Spending & Anomaly Alerts', desc: 'Alert when a single purchase exceeds 2.5x your 3-month average.' },
            { key: 'goalReminders', label: 'Goal Milestone Notifications', desc: 'Celebrate goal achievements and send monthly contribution reminders.' },
            { key: 'aiWeeklyBrief', label: 'Monthly Financial Statement Summaries', desc: 'Automated notification when monthly statement is ready for review.' },
          ].map(item => (
            <div key={item.key} style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={notifPref[item.key]}
                onChange={e => setNotifPref(p => ({ ...p, [item.key]: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <HardDrive size={18} color="var(--accent-red)" />
          <div className="card-title">Demo & Test Data Management</div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Reload Sample Financial Dataset</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Loads 6 months of realistic transactions, budgets, goals, and notifications.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleSeedData} disabled={seeding}>
            <Database size={14} /> {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
