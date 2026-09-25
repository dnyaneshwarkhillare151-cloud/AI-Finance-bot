import { useState, useEffect } from 'react';
import { reportService } from '../services/api';
import { formatCurrency, getCategoryEmoji, getCategoryColor } from '../utils/helpers';
import DisclaimerBanner from '../components/DisclaimerBanner';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Download, FileText, Calendar, TrendingUp, TrendingDown,
  PiggyBank, ArrowUpRight, ArrowDownRight, AlertTriangle, ShieldCheck
} from 'lucide-react';

const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/#{1,3} (.*)/g, '<h4 style="margin: 8px 0 4px 0; color: #f1f5f9;">$1</h4>');
};

export default function ReportsPage() {
  const [period, setPeriod] = useState('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await reportService.get({ period, month, year });
      setReport(res.data);
    } catch {
      toast.error('Failed to generate statement');
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    fetchReport();
  }, [period, month, year]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await reportService.exportCsv({ period, month, year });
      toast.success('Financial statement CSV downloaded! 📊');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const r = report?.report;
  const categoryBreakdown = r?.category_breakdown || {};
  const incomeBreakdown = r?.income_breakdown || {};
  const budgetVariance = r?.budget_variance || [];

  const pieData = Object.entries(categoryBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const incomePieData = Object.entries(incomeBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="fade-in">
      <DisclaimerBanner />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={22} color="var(--accent-blue)" /> Financial Statement & Reports
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Comprehensive income summary, expense breakdown, budget variance, and cash flow ledger
          </p>
        </div>
        {report && (
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
            <Download size={15} /> {exporting ? 'Exporting...' : 'Export Statement (CSV)'}
          </button>
        )}
      </div>

      {/* Filters & Control Panel */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Statement Period</label>
            <select className="form-select" value={period} onChange={e => setPeriod(e.target.value)} style={{ minWidth: 150 }}>
              <option value="monthly">Monthly Statement</option>
              <option value="yearly">Yearly Statement</option>
              <option value="all">All-Time Cumulative</option>
            </select>
          </div>
          {period === 'monthly' && (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Month</label>
                <select className="form-select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Year</label>
                <input className="form-input" type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 100 }} />
              </div>
            </>
          )}
          {period === 'yearly' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Year</label>
              <input className="form-input" type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 100 }} />
            </div>
          )}
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
            <FileText size={15} /> {loading ? 'Generating...' : 'Refresh Statement'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Generating financial statement...</span>
        </div>
      )}

      {report && r && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="stat-card stat-income">
              <div className="stat-icon"><ArrowUpRight size={20} color="currentColor" /></div>
              <div className="stat-label">Total Income</div>
              <div className="stat-value">{formatCurrency(r.total_income)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Inflow for period</div>
            </div>

            <div className="stat-card stat-expense">
              <div className="stat-icon"><ArrowDownRight size={20} color="currentColor" /></div>
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value">{formatCurrency(r.total_expense)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Outflow for period</div>
            </div>

            <div className="stat-card stat-savings">
              <div className="stat-icon"><PiggyBank size={20} color="currentColor" /></div>
              <div className="stat-label">Net Cash Flow (Savings)</div>
              <div className="stat-value" style={{ color: r.net_savings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {formatCurrency(r.net_savings)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Income − Expenses</div>
            </div>

            <div className="stat-card stat-balance">
              <div className="stat-icon"><TrendingUp size={20} color="currentColor" /></div>
              <div className="stat-label">Savings Rate</div>
              <div className="stat-value" style={{ color: r.savings_rate >= 20 ? 'var(--accent-green)' : r.savings_rate >= 10 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                {r.savings_rate}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Target: 20%+</div>
            </div>
          </div>

          {/* AI Executive Summary */}
          {report.ai_summary && (
            <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(15,26,46,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="ai-badge">🤖 AI Executive Statement Summary</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(report.ai_summary) }} />
            </div>
          )}

          {/* Income & Expense Breakdown Tables */}
          <div className="charts-grid">
            {/* Income Sources */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Income Sources</div>
                <span className="badge badge-success">{Object.keys(incomeBreakdown).length} sources</span>
              </div>
              {Object.keys(incomeBreakdown).length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Source</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Share</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(incomeBreakdown).map(([src, amt]) => (
                        <tr key={src}>
                          <td style={{ fontWeight: 600 }}>💼 {src}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-green)' }}>{formatCurrency(amt)}</td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                            {((amt / (r.total_income || 1)) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 20 }}>No income recorded for this period</div>
              )}
            </div>

            {/* Expense Distribution */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Expense Distribution</div>
                <span className="badge badge-danger">{pieData.length} categories</span>
              </div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => [formatCurrency(v)]} contentStyle={{ background: '#1a2332', border: '1px solid #243249', borderRadius: 8, fontSize: 12 }} />
                    <Legend formatter={v => `${getCategoryEmoji(v)} ${v}`} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 20 }}>No expenses recorded for this period</div>
              )}
            </div>
          </div>

          {/* Budget Variance Analysis Matrix */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Budget Variance & Adherence Matrix</div>
                <div className="card-subtitle">Comparison between allocated limits and actual expenditures</div>
              </div>
              <span className="badge badge-info">{budgetVariance.length} Budgets Tracked</span>
            </div>

            {budgetVariance.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Budget Limit</th>
                      <th style={{ textAlign: 'right' }}>Actual Spent</th>
                      <th style={{ textAlign: 'right' }}>Variance</th>
                      <th style={{ textAlign: 'center' }}>Usage</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetVariance.map((b, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>
                          {getCategoryEmoji(b.category)} {b.category}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(b.limit)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-red)' }}>{formatCurrency(b.spent)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: b.variance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {b.variance >= 0 ? `+${formatCurrency(b.variance)}` : `-${formatCurrency(Math.abs(b.variance))}`}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{b.percentage_used}%</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge badge-${b.status === 'critical' ? 'danger' : b.status === 'warning' ? 'warning' : 'success'}`}>
                            {b.status === 'critical' ? '🚨 Exceeded' : b.status === 'warning' ? '⚠️ Near Limit' : '✅ Within Budget'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💰</div>
                <div className="empty-state-title" style={{ fontSize: 13 }}>No budget limits configured for this period</div>
                <div className="empty-state-desc">Set up category limits in the Budgets tab to track variance automatically.</div>
              </div>
            )}
          </div>

          {/* Statement Transaction Ledger */}
          {r.transactions?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Statement Transaction Ledger</div>
                  <div className="card-subtitle">{r.transaction_count} total entries for {period} statement</div>
                </div>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Method</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.transactions.slice(0, 30).map(t => (
                      <tr key={t.id}>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {t.date ? t.date.split('T')[0] : ''}
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</td>
                        <td>
                          <span style={{ fontSize: 12 }}>{getCategoryEmoji(t.category)} {t.category}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.payment_method}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${t.type}`}>{t.type}</span>
                        </td>
                        <td style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: t.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
