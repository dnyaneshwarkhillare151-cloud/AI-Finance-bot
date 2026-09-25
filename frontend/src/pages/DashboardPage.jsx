import { useState, useEffect } from 'react';
import { dashboardService, aiService, miscService } from '../services/api';
import { formatCurrency, formatDate, getCategoryColor, getCategoryEmoji, getHealthColor, getHealthLabel } from '../utils/helpers';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Target, Bell, Zap, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#10b981', '#22c55e', '#6366f1', '#94a3b8'];

function StatCard({ label, value, icon: Icon, colorClass, change, changeLabel }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-icon"><Icon size={20} color="currentColor" /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {change !== undefined && (
        <div className="stat-change" style={{ color: change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(change).toFixed(1)}% {changeLabel || 'vs last month'}</span>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a2332', border: '1px solid #243249', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ fontSize: 13, color: entry.color, fontWeight: 600 }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, healthRes, insightsRes] = await Promise.allSettled([
        dashboardService.get(),
        aiService.getFinancialHealth(),
        aiService.getInsights(),
      ]);
      if (dashRes.status === 'fulfilled') setData(dashRes.value.data);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value.data.insights || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleTxnUpdate = () => fetchData();
    window.addEventListener('transaction-updated', handleTxnUpdate);
    return () => window.removeEventListener('transaction-updated', handleTxnUpdate);
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await miscService.seedDemo();
      toast.success('Demo data loaded! Dashboard refreshing...', { duration: 3000 });
      await fetchData();
    } catch {
      toast.error('Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <span>Loading your financial dashboard...</span>
      </div>
    );
  }

  const curr = data?.current_month || {};
  const prev = data?.previous_month || {};
  const allTime = data?.all_time || {};
  const trend = data?.monthly_trend || [];
  const budgets = data?.budgets || [];
  const goals = data?.goals || [];
  const recent = data?.recent_transactions || [];
  const categorySpending = data?.category_spending || {};

  const incomeChange = prev.total_income > 0 ? ((curr.total_income - prev.total_income) / prev.total_income) * 100 : 0;
  const expenseChange = prev.total_expense > 0 ? ((curr.total_expense - prev.total_expense) / prev.total_expense) * 100 : 0;

  // Pie chart data
  const pieData = Object.entries(categorySpending).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const healthScore = health?.health_score || 0;
  const healthColor = getHealthColor(healthScore);

  return (
    <div className="fade-in">
      <DisclaimerBanner />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Financial Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-secondary btn-sm" onClick={handleSeedDemo} disabled={seeding}>
            <Database size={14} /> {seeding ? 'Loading...' : 'Load Demo Data'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stat-grid">
        <StatCard label="Total Income" value={formatCurrency(curr.total_income)} icon={TrendingUp} colorClass="stat-income" change={incomeChange} />
        <StatCard label="Total Expenses" value={formatCurrency(curr.total_expense)} icon={TrendingDown} colorClass="stat-expense" change={expenseChange} />
        <StatCard label="Net Savings" value={formatCurrency(curr.savings)} icon={PiggyBank} colorClass="stat-savings" changeLabel="savings rate" change={curr.savings_rate} />
        <StatCard label="All-Time Balance" value={formatCurrency(allTime.net_savings)} icon={DollarSign} colorClass="stat-balance" />
      </div>

      {/* Second Row: Charts */}
      <div className="charts-grid">
        {/* Income vs Expense Trend */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Income vs Expenses</div>
              <div className="card-subtitle">6-month comparison</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="total_income" name="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="total_expense" name="Expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Spending Pie */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Spending by Category</div>
              <div className="card-subtitle">Current month breakdown</div>
            </div>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={getCategoryColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value), '']} contentStyle={{ background: '#1a2332', border: '1px solid #243249', borderRadius: 8, fontSize: 12 }} />
                <Legend formatter={(value) => `${getCategoryEmoji(value)} ${value}`} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No spending data</div>
              <div className="empty-state-desc">Add transactions to see category breakdown</div>
            </div>
          )}
        </div>
      </div>

      {/* Third Row: Budgets, Goals, Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Budget Progress */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Budget Status</div>
            <span className="badge badge-info">{budgets.length} budgets</span>
          </div>
          {budgets.length > 0 ? budgets.slice(0, 5).map(b => (
            <div key={b.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{getCategoryEmoji(b.category)} {b.category}</span>
                <span style={{ fontSize: 11, color: b.status === 'critical' ? 'var(--accent-red)' : b.status === 'warning' ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                  {b.percentage_used.toFixed(0)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill progress-${b.status === 'critical' ? 'danger' : b.status === 'warning' ? 'warning' : 'normal'}`}
                  style={{ width: `${Math.min(100, b.percentage_used)}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                <span>{formatCurrency(b.spent)} spent</span>
                <span>{formatCurrency(b.remaining)} left</span>
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <div style={{ fontSize: 28 }}>💰</div>
              <div className="empty-state-title" style={{ fontSize: 13 }}>No budgets set</div>
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Financial Goals</div>
            <span className="badge badge-purple"><Target size={10} /> {goals.length} active</span>
          </div>
          {goals.length > 0 ? goals.slice(0, 4).map(g => (
            <div key={g.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{g.name}</span>
                <span style={{ fontSize: 11, color: 'var(--accent-blue)' }}>{g.progress_percentage.toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill progress-normal" style={{ width: `${g.progress_percentage}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                <span>{formatCurrency(g.current_amount)}</span>
                <span>of {formatCurrency(g.target_amount)}</span>
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <div style={{ fontSize: 28 }}>🎯</div>
              <div className="empty-state-title" style={{ fontSize: 13 }}>No goals set</div>
            </div>
          )}
        </div>

        {/* Financial Health */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Financial Health</div>
            <span className="ai-badge">AI Score</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', border: `6px solid ${healthColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: healthColor }}>{healthScore.toFixed(0)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: healthColor }}>{getHealthLabel(healthScore)}</div>
          </div>
          {health?.factors && Object.entries(health.factors).slice(0, 4).map(([key, f]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: f.status === 'good' ? 'var(--accent-green)' : f.status === 'warning' ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                {f.value}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Recent Transactions & Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Transactions</div>
            <a href="/transactions" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none' }}>View all →</a>
          </div>
          {recent.length > 0 ? (
            <div className="table-container">
              <table>
                <tbody>
                  {recent.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${getCategoryColor(t.category)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                            {getCategoryEmoji(t.category)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(t.date)} · {t.category}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)', whiteSpace: 'nowrap' }}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💳</div>
              <div className="empty-state-title">No transactions yet</div>
              <div className="empty-state-desc">Add your first transaction or load demo data</div>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">AI Insights</div>
            <span className="ai-badge"><Zap size={10} /> LIVE</span>
          </div>
          {insights.length > 0 ? insights.slice(0, 4).map((ins, i) => (
            <div key={i} className={`insight-card ${ins.type}`}>
              <div className="insight-icon">{ins.icon}</div>
              <div>
                <div className="insight-title">{ins.title}</div>
                <div className="insight-msg">{ins.message}</div>
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <div style={{ fontSize: 28 }}>🤖</div>
              <div className="empty-state-title" style={{ fontSize: 13 }}>No insights yet</div>
              <div className="empty-state-desc" style={{ fontSize: 11 }}>Add transactions to generate AI insights</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
