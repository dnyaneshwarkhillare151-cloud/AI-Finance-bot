import { useState, useEffect } from 'react';
import { goalService } from '../services/api';
import { formatCurrency, formatDate, getPriorityColor, extractError, PRIORITIES } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Target, TrendingUp, Sparkles } from 'lucide-react';

const EMPTY_GOAL = {
  name: '', target_amount: '', current_amount: '0', description: '',
  target_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  priority: 'Medium',
};

function GoalModal({ goal, onClose, onSave }) {
  const [form, setForm] = useState(goal || EMPTY_GOAL);
  const [loading, setLoading] = useState(false);
  const isEdit = !!goal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.target_amount) { toast.error('Name and target amount required'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount || 0),
        target_date: new Date(form.target_date).toISOString(),
      };
      if (isEdit) { await goalService.update(goal.id, payload); toast.success('Goal updated!'); }
      else { await goalService.create(payload); toast.success('Goal created! 🎯'); }
      onSave();
    } catch (err) { toast.error(extractError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Goal' : 'Create Financial Goal'}</div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Goal Name</label>
            <input className="form-input" type="text" placeholder="e.g. Emergency Fund, Vacation, Laptop"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Target Amount (₹)</label>
              <input className="form-input" type="number" step="100" min="0" placeholder="100000"
                value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Already Saved (₹)</label>
              <input className="form-input" type="number" step="100" min="0" placeholder="0"
                value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Target Date</label>
              <input className="form-input" type="date" value={form.target_date}
                onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-textarea" placeholder="Why is this goal important to you?"
              value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Update Goal' : 'Create Goal'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoalAnalysisModal({ goal, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    goalService.getAnalysis(goal.id)
      .then(r => setAnalysis(r.data.analysis))
      .catch(() => toast.error('Failed to load analysis'))
      .finally(() => setLoading(false));
  }, [goal.id]);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">🤖 AI Goal Analysis</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{goal.name}</div>
          </div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>
        {loading ? <div className="loading-overlay"><div className="spinner" /></div> : analysis && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Time Remaining', value: `${analysis.months_remaining} months` },
                { label: 'Required Monthly', value: formatCurrency(analysis.required_monthly_saving), color: analysis.on_track ? 'var(--accent-green)' : 'var(--accent-red)' },
                { label: 'Est. Completion', value: analysis.estimated_completion || 'N/A' },
                { label: 'Status', value: analysis.on_track ? '✅ On Track' : '⚠️ Behind', color: analysis.on_track ? 'var(--accent-green)' : 'var(--accent-yellow)' },
              ].map(item => (
                <div key={item.label} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: item.color || 'var(--text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {analysis.shortfall > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--accent-yellow)' }}>
                ⚠️ You need {formatCurrency(analysis.shortfall)} more per month to stay on track.
              </div>
            )}
            {analysis.suggestion && (
              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: 6, fontSize: 12 }}>🤖 AI Suggestion</div>
                {analysis.suggestion}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [analysisGoal, setAnalysisGoal] = useState(null);

  const fetchGoals = async () => {
    setLoading(true);
    try { const res = await goalService.getAll(); setGoals(res.data.goals || []); }
    catch { toast.error('Failed to load goals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try { await goalService.delete(id); toast.success('Goal deleted'); fetchGoals(); }
    catch { toast.error('Failed to delete'); }
  };

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const completed = goals.filter(g => g.is_completed).length;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Financial Goals</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{goals.length} goals · {completed} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditGoal(null); setShowModal(true); }}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Target', value: formatCurrency(totalTarget), color: 'var(--accent-purple)' },
          { label: 'Total Saved', value: formatCurrency(totalSaved), color: 'var(--accent-green)' },
          { label: 'Remaining', value: formatCurrency(totalTarget - totalSaved), color: 'var(--accent-blue)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : goals.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">No goals yet</div>
          <div className="empty-state-desc">Create your first financial goal to start tracking progress</div>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {goals.map(g => {
            const progressPct = g.progress_percentage;
            const daysLeft = Math.ceil((new Date(g.target_date) - new Date()) / 86400000);
            return (
              <div key={g.id} className="card" style={{ opacity: g.is_completed ? 0.8 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {g.is_completed && '✅ '}{g.name}
                    </div>
                    {g.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{g.description}</div>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="badge" style={{ fontSize: 10, background: `${getPriorityColor(g.priority)}20`, color: getPriorityColor(g.priority) }}>
                        {g.priority} Priority
                      </span>
                      <span className="badge badge-info" style={{ fontSize: 10 }}>
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setAnalysisGoal(g)} title="AI Analysis"><Sparkles size={13} /></button>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setEditGoal({ ...g, target_date: g.target_date?.split('T')[0] }); setShowModal(true); }}><Edit2 size={13} /></button>
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(g.id)}><Trash2 size={13} /></button>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                    <span style={{ fontWeight: 700, color: progressPct >= 100 ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                      {progressPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div className="progress-fill progress-normal" style={{ width: `${Math.min(100, progressPct)}%`, background: progressPct >= 100 ? 'var(--gradient-green)' : undefined }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Saved</div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(g.current_amount)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Target</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(g.target_amount)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>By</div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{formatDate(g.target_date)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <GoalModal
          goal={editGoal}
          onClose={() => { setShowModal(false); setEditGoal(null); }}
          onSave={() => { setShowModal(false); setEditGoal(null); fetchGoals(); }}
        />
      )}
      {analysisGoal && <GoalAnalysisModal goal={analysisGoal} onClose={() => setAnalysisGoal(null)} />}
    </div>
  );
}
