import { useState } from 'react';
import { transactionService, aiService } from '../services/api';
import { extractError, CATEGORIES, PAYMENT_METHODS } from '../utils/helpers';
import toast from 'react-hot-toast';
import { X, Sparkles } from 'lucide-react';

const EMPTY_FORM = {
  amount: '',
  type: 'expense',
  category: 'Food',
  description: '',
  date: new Date().toISOString().split('T')[0],
  payment_method: 'UPI',
  notes: '',
  is_recurring: false,
};

export default function TransactionModal({ transaction, onClose, onSave }) {
  const [form, setForm] = useState(
    transaction
      ? {
          ...transaction,
          date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const isEdit = !!transaction;

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Amount must be positive';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAICateg = async () => {
    if (!form.description.trim()) {
      toast.error('Enter description first');
      return;
    }
    setAiLoading(true);
    try {
      const res = await aiService.categorize(form.description);
      setAiSuggestion(res.data);
      if (res.data?.category) {
        toast.success(`AI suggested: ${res.data.category}`);
      }
    } catch {
      toast.error('AI categorization failed');
    } finally {
      setAiLoading(false);
    }
  };

  const acceptSuggestion = () => {
    if (aiSuggestion?.category) {
      setForm(f => ({ ...f, category: aiSuggestion.category }));
      setAiSuggestion(null);
      toast.success('Category applied!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category,
        description: form.description.trim(),
        date: new Date(form.date).toISOString(),
        payment_method: form.payment_method,
        notes: form.notes || null,
        is_recurring: !!form.is_recurring,
      };
      if (isEdit) {
        await transactionService.update(transaction.id, payload);
        toast.success('Transaction updated!');
      } else {
        await transactionService.create(payload);
        toast.success('Transaction added!');
      }
      onSave();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Transaction' : 'Add Transaction'}</div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
              {errors.amount && <div className="form-error">{errors.amount}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="expense">💸 Expense</option>
                <option value="income">💰 Income</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Swiggy order, Monthly Salary, Rent..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAICateg}
                disabled={aiLoading}
                title="AI Categorize"
                style={{ whiteSpace: 'nowrap' }}
              >
                <Sparkles size={14} color="#06b6d4" />
                {aiLoading ? 'Analyzing...' : 'AI Categorize'}
              </button>
            </div>
            {errors.description && <div className="form-error">{errors.description}</div>}
          </div>

          {aiSuggestion && (
            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600 }}>🤖 AI Suggestion: </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{aiSuggestion.category}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                  ({aiSuggestion.confidence} confidence)
                </span>
              </div>
              <button type="button" className="btn btn-sm btn-primary" onClick={acceptSuggestion}>
                Apply
              </button>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
              {errors.date && <div className="form-error">{errors.date}</div>}
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
              <input
                type="checkbox"
                id="is_recurring"
                checked={form.is_recurring}
                onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="is_recurring" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                Recurring Monthly
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Add optional notes or tags..."
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Transaction' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
