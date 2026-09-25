import { useState, useEffect } from 'react';
import { budgetService } from '../services/api';
import { formatCurrency, getCategoryEmoji, extractError, CATEGORIES } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Sparkles, TrendingUp } from 'lucide-react';

function BudgetModal({ budget, onClose, onSave }) {
  const now = new Date();
  const [form, setForm] = useState(budget || {
    category: 'Food', limit_amount: '', month: now.getMonth() + 1, year: now.getFullYear(),
  });
  const [loading, setLoading] = useState(false);
  const isEdit = !!budget;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.limit_amount || parseFloat(form.limit_amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    try {
      const payload = { ...form, limit_amount: parseFloat(form.limit_amount), month: parseInt(form.month), year: parseInt(form.year) };
      if (isEdit) { await budgetService.update(budget.id, { limit_amount: payload.limit_amount }); toast.success('Budget updated!'); }
      else { await budgetService.create(payload); toast.success('Budget created!'); }
      onSave();
    } catch (err) { toast.error(extractError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Budget' : 'Create Budget'}</div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          {!isEdit && (
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(c => !['Salary', 'Investment'].includes(c)).map(c => (
                  <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Monthly Budget Limit (₹)</label>
            <input className="form-input" type="number" step="100" min="0" placeholder="e.g. 5000"
              value={form.limit_amount} onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))} />
          </div>
          {!isEdit && (
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Month</label>
                <select className="form-select" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input className="form-input" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Update' : 'Create Budget'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const now = new Date();
  const [budgets, setBudgets] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [showRec, setShowRec] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await budgetService.getAll({ month, year });
      setBudgets(res.data.budgets || []);
    } catch { toast.error('Failed to load budgets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBudgets(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget?')) return;
    try { await budgetService.delete(id); toast.success('Budget deleted'); fetchBudgets(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleGetRecommendations = async () => {
    setRecLoading(true);
    try {
      const res = await budgetService.getRecommendations();
      setRecommendations(res.data.recommendations);
      setShowRec(true);
    } catch { toast.error('Failed to get recommendations'); }
    finally { setRecLoading(false); }
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.limit_amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Budget Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleGetRecommendations} disabled={recLoading}>
            <Sparkles size={15} /> {recLoading ? 'Loading...' : 'AI Suggestions'}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditBudget(null); setShowModal(true); }}>
            <Plus size={16} /> Add Budget
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Budgeted', value: formatCurrency(totalBudgeted), color: 'var(--accent-blue)' },
          { label: 'Total Spent', value: formatCurrency(totalSpent), color: 'var(--accent-red)' },
          { label: 'Remaining', value: formatCurrency(totalBudgeted - totalSpent), color: 'var(--accent-green)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      {totalBudgeted > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>Overall Budget Usage</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: overallPct > 90 ? 'var(--accent-red)' : overallPct > 70 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
              {overallPct.toFixed(0)}%
            </span>
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div className={`progress-fill progress-${overallPct > 90 ? 'danger' : overallPct > 70 ? 'warning' : 'normal'}`}
              style={{ width: `${Math.min(100, overallPct)}%` }} />
          </div>
        </div>
      )}

      {/* Budget Cards */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-title">No budgets yet</div>
            <div className="empty-state-desc">Create budgets to track your spending limits</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {budgets.map(b => (
            <div key={b.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>{getCategoryEmoji(b.category)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{b.category}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monthly Budget</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`badge badge-${b.status === 'critical' ? 'danger' : b.status === 'warning' ? 'warning' : 'success'}`}>
                    {b.status === 'critical' ? '🚨 Critical' : b.status === 'warning' ? '⚠️ Warning' : '✅ Normal'}
                  </span>
                </div>
              </div>

              <div className="progress-bar" style={{ marginBottom: 8 }}>
                <div className={`progress-fill progress-${b.status === 'critical' ? 'danger' : b.status === 'warning' ? 'warning' : 'normal'}`}
                  style={{ width: `${Math.min(100, b.percentage_used)}%` }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Spent</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{formatCurrency(b.spent)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Used</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: b.status === 'critical' ? 'var(--accent-red)' : b.status === 'warning' ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
                    {b.percentage_used.toFixed(0)}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Remaining</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(b.remaining)}</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Limit: {formatCurrency(b.limit_amount)}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setEditBudget(b); setShowModal(true); }}><Edit2 size={13} /></button>
                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(b.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Recommendations */}
      {showRec && recommendations && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowRec(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">🤖 AI Budget Recommendations</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{recommendations.method} · {recommendations.is_ai ? 'AI-powered' : 'Rule-based'}</div>
              </div>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowRec(false)}><X size={16} /></button>
            </div>
            {recommendations.summary && (
              <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {recommendations.summary}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(recommendations).filter(([k]) => !['method', 'summary', 'is_ai', 'error'].includes(k)).map(([cat, amt]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 600 }}>{getCategoryEmoji(cat)} {cat}</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{formatCurrency(amt)}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center', fontStyle: 'italic' }}>
              These are AI-generated suggestions based on your spending history. Adjust as needed.
            </p>
          </div>
        </div>
      )}

      {showModal && (
        <BudgetModal
          budget={editBudget}
          onClose={() => { setShowModal(false); setEditBudget(null); }}
          onSave={() => { setShowModal(false); setEditBudget(null); fetchBudgets(); }}
        />
      )}
    </div>
  );
}
