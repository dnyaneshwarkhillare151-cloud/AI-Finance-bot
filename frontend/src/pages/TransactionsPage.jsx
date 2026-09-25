import { useState, useEffect, useCallback } from 'react';
import { transactionService, aiService } from '../services/api';
import { formatCurrency, formatDate, getCategoryColor, getCategoryEmoji, extractError, CATEGORIES, PAYMENT_METHODS } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, Sparkles, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const EMPTY_FORM = {
  amount: '', type: 'expense', category: 'Food', description: '', date: new Date().toISOString().split('T')[0],
  payment_method: 'UPI', notes: '', is_recurring: false,
};

function TransactionModal({ transaction, onClose, onSave }) {
  const [form, setForm] = useState(transaction || EMPTY_FORM);
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
    if (!form.description.trim()) { toast.error('Enter description first'); return; }
    setAiLoading(true);
    try {
      const res = await aiService.categorize(form.description);
      setAiSuggestion(res.data);
    } catch { toast.error('AI categorization failed'); }
    finally { setAiLoading(false); }
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
        ...form,
        amount: parseFloat(form.amount),
        date: new Date(form.date).toISOString(),
        ai_categorized: !!aiSuggestion,
      };
      if (isEdit) {
        await transactionService.update(transaction.id, payload);
        toast.success('Transaction updated!');
      } else {
        await transactionService.create(payload);
        toast.success('Transaction added!');
      }
      onSave();
    } catch (err) { toast.error(extractError(err)); }
    finally { setLoading(false); }
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
              <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
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
              <input className="form-input" type="text" placeholder="e.g. Swiggy order, Salary..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary" onClick={handleAICateg} disabled={aiLoading} title="AI Categorize" style={{ whiteSpace: 'nowrap' }}>
                {aiLoading ? '...' : <><Sparkles size={14} /> AI</>}
              </button>
            </div>
            {errors.description && <div className="form-error">{errors.description}</div>}
          </div>

          {aiSuggestion && (
            <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: 6 }}>🤖 AI Suggestion</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{getCategoryEmoji(aiSuggestion.category)} {aiSuggestion.category}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>Confidence: {aiSuggestion.confidence}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }} onClick={acceptSuggestion}>Accept</button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAiSuggestion(null)}>Dismiss</button>
                </div>
              </div>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              {errors.date && <div className="form-error">{errors.date}</div>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                  style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13 }}>Recurring expense</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" placeholder="Additional notes..." value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTxn, setEditTxn] = useState(null);
  const [filters, setFilters] = useState({ search: '', type: '', category: '', sort_by: 'date', sort_order: 'desc' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 15, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await transactionService.getAll(params);
      setTransactions(res.data.transactions || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionService.delete(id);
      toast.success('Transaction deleted');
      fetchTransactions();
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = () => {
    setShowModal(false);
    setEditTxn(null);
    fetchTransactions();
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Transactions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{total} total transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTxn(null); setShowModal(true); }}>
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search transactions..." style={{ paddingLeft: 36 }}
              value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
          </div>
          <select className="form-select" style={{ flex: '0 1 130px' }} value={filters.type}
            onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select className="form-select" style={{ flex: '0 1 150px' }} value={filters.category}
            onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>)}
          </select>
          <select className="form-select" style={{ flex: '0 1 160px' }} value={`${filters.sort_by}_${filters.sort_order}`}
            onChange={e => { const [by, order] = e.target.value.split('_'); setFilters(f => ({ ...f, sort_by: by, sort_order: order })); }}>
            <option value="date_desc">Date (Newest)</option>
            <option value="date_asc">Date (Oldest)</option>
            <option value="amount_desc">Amount (High)</option>
            <option value="amount_asc">Amount (Low)</option>
          </select>
          {(filters.search || filters.type || filters.category) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ search: '', type: '', category: '', sort_by: 'date', sort_order: 'desc' }); setPage(1); }}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <div className="empty-state-title">No transactions found</div>
            <div className="empty-state-desc">Try adjusting filters or add your first transaction</div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Payment</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${getCategoryColor(t.category)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                            {getCategoryEmoji(t.category)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</div>
                            {t.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.notes.slice(0, 40)}</div>}
                            {t.ai_categorized && <span className="badge badge-ai" style={{ fontSize: 9, padding: '1px 5px' }}>AI</span>}
                            {t.is_recurring && <span className="badge badge-info" style={{ fontSize: 9, padding: '1px 5px', marginLeft: 2 }}>🔁 Recurring</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: `${getCategoryColor(t.category)}20`, color: getCategoryColor(t.category) }}>
                          {getCategoryEmoji(t.category)} {t.category}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatDate(t.date)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t.payment_method}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)', whiteSpace: 'nowrap' }}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setEditTxn(t); setShowModal(true); }} title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(t.id)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = Math.max(1, page - 2) + i;
                if (p > totalPages) return null;
                return <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                {total} total
              </span>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <TransactionModal
          transaction={editTxn ? { ...editTxn, date: editTxn.date ? editTxn.date.split('T')[0] : new Date().toISOString().split('T')[0] } : null}
          onClose={() => { setShowModal(false); setEditTxn(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
