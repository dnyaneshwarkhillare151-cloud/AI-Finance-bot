import { useState } from 'react';
import { transactionService, aiService } from '../services/api';
import { extractError, CATEGORIES, PAYMENT_METHODS } from '../utils/helpers';
import toast from 'react-hot-toast';
import { X, Sparkles, Plus, Zap } from 'lucide-react';

export default function QuickExpenseModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount: '',
    type: 'expense',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  if (!isOpen) return null;

  const handleAICategorize = async () => {
    if (!form.description.trim()) {
      toast.error('Enter description first to categorize');
      return;
    }
    setAiLoading(true);
    try {
      const res = await aiService.categorize(form.description);
      if (res.data?.category) {
        setForm(f => ({ ...f, category: res.data.category }));
        toast.success(`Categorized as ${res.data.category}!`);
      }
    } catch {
      toast.error('AI categorization failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }

    setLoading(true);
    try {
      await transactionService.create({
        ...form,
        amount: parseFloat(form.amount),
        date: new Date(form.date).toISOString(),
      });
      toast.success('Quick expense recorded! 💸');
      setForm({
        amount: '',
        type: 'expense',
        category: 'Food',
        description: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI',
        notes: '',
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={18} color="#ef4444" />
            </div>
            <div>
              <div className="modal-title">Quick Add Expense</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fast record with smart categorization</div>
            </div>
          </div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              autoFocus
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Swiggy lunch, Metro recharge, Coffee"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAICategorize}
                disabled={aiLoading}
                title="Auto-categorize with AI"
              >
                <Sparkles size={14} color="#06b6d4" />
                {aiLoading ? '...' : 'AI'}
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.filter(c => c !== 'Salary').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={form.payment_method}
                onChange={e => setForm({ ...form, payment_method: e.target.value })}
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={15} /> {loading ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
