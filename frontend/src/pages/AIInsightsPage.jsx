import { useState, useEffect } from 'react';
import { aiService, dashboardService, miscService } from '../services/api';
import { formatCurrency, getCategoryEmoji, getCategoryColor, getHealthColor, getHealthLabel } from '../utils/helpers';
import DisclaimerBanner from '../components/DisclaimerBanner';
import toast from 'react-hot-toast';
import {
  Sparkles, AlertTriangle, TrendingUp, TrendingDown, Target,
  ShieldCheck, ArrowRight, RefreshCw, Database, Bot, Zap, CheckCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

export default function AIInsightsPage() {
  const [insights, setInsights] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [health, setHealth] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchInsightsData = async () => {
    setLoading(true);
    try {
      const [insightsRes, healthRes, dashRes] = await Promise.allSettled([
        aiService.getInsights(),
        aiService.getFinancialHealth(),
        dashboardService.get(),
      ]);
      if (insightsRes.status === 'fulfilled') {
        setInsights(insightsRes.value.data.insights || []);
        setAnomalies(insightsRes.value.data.anomalies || []);
      }
      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value.data);
      }
      if (dashRes.status === 'fulfilled') {
        setDashData(dashRes.value.data);
      }
    } catch {
      toast.error('Failed to load AI Insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightsData();
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await miscService.seedDemo();
      toast.success('Demo data loaded! Analyzing patterns...');
      await fetchInsightsData();
    } catch {
      toast.error('Failed to load demo data');
    } finally {
      setSeeding(false);
    }
  };

  const curr = dashData?.current_month || {};
  const healthScore = health?.health_score || 0;
  const factors = health?.factors || {};
  const hasData = (curr.total_income > 0 || curr.total_expense > 0);

  return (
    <div className="fade-in">
      <DisclaimerBanner />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={22} color="#06b6d4" /> AI Financial Insights & Diagnostics
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Automated anomaly detection, spending trend projections, and health diagnostics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchInsightsData} disabled={loading}>
            <RefreshCw size={14} /> Refresh Analysis
          </button>
          {!hasData && (
            <button className="btn btn-primary btn-sm" onClick={handleSeedDemo} disabled={seeding}>
              <Database size={14} /> {seeding ? 'Seeding...' : 'Load Sample Data'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <span>Running AI financial diagnostic algorithms...</span>
        </div>
      ) : !hasData ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>More Transaction Data Needed</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 20px auto', fontSize: 13, lineHeight: 1.6 }}>
            AI insights and anomaly detection require at least a few recorded transactions to discover spending patterns, calculate budget adherence, and evaluate risk.
          </p>
          <button className="btn btn-primary" onClick={handleSeedDemo} disabled={seeding}>
            <Database size={15} /> {seeding ? 'Generating...' : 'Load Demo Financial Profile'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Health Diagnostic Card */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(15,26,46,0.9) 0%, rgba(13,21,38,0.95) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${getHealthColor(healthScore)}15`,
                  border: `1px solid ${getHealthColor(healthScore)}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 900,
                  color: getHealthColor(healthScore)
                }}>
                  {healthScore.toFixed(0)}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Financial Health Score: <span style={{ color: getHealthColor(healthScore) }}>{getHealthLabel(healthScore)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Transparent 0–100 Weighted Mathematical Model</div>
                </div>
              </div>
              <span className="badge badge-info" style={{ fontSize: 11 }}>
                <ShieldCheck size={12} /> Traceable to Real Financial Data
              </span>
            </div>

            {health?.ai_narrative && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: 16,
                borderLeft: `3px solid ${getHealthColor(healthScore)}`
              }}>
                {health.ai_narrative}
              </div>
            )}

            {/* Health Factor Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                {
                  label: 'Savings Rate',
                  weight: '35%',
                  val: `${factors.savings_rate?.value || 0}%`,
                  status: factors.savings_rate?.status || 'normal',
                  bench: 'Target: >20%'
                },
                {
                  label: 'Expense Ratio',
                  weight: '30%',
                  val: `${factors.expense_ratio?.value || 0}%`,
                  status: factors.expense_ratio?.status || 'normal',
                  bench: 'Target: <70%'
                },
                {
                  label: 'Budget Adherence',
                  weight: '20%',
                  val: `${factors.budget_adherence?.value || 0}%`,
                  status: factors.budget_adherence?.status || 'normal',
                  bench: 'Target: >80%'
                },
                {
                  label: 'Goal Progress',
                  weight: '15%',
                  val: `${factors.goal_progress?.value || 0}%`,
                  status: factors.goal_progress?.status || 'normal',
                  bench: 'Target: Steady'
                },
              ].map(f => (
                <div key={f.label} style={{
                  padding: 12,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 8,
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>{f.label}</span>
                    <span style={{ fontWeight: 600 }}>{f.weight}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: f.status === 'good' ? 'var(--accent-green)' : f.status === 'warning' ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                    {f.val}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{f.bench}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Anomaly Detection Section */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color={anomalies.length > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)'} />
                <div className="card-title">Spending Anomaly Detection</div>
              </div>
              <span className={`badge badge-${anomalies.length > 0 ? 'warning' : 'success'}`}>
                {anomalies.length > 0 ? `${anomalies.length} Flagged` : '0 Anomalies Detected'}
              </span>
            </div>

            {anomalies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {anomalies.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(245, 158, 11, 0.06)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: 8,
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 22 }}>{getCategoryEmoji(a.category)}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {a.description} — <span style={{ color: 'var(--accent-red)' }}>{formatCurrency(a.amount)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {a.multiplier}x higher than your 3-month average of {formatCurrency(a.average_amount)}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-danger" style={{ textTransform: 'capitalize' }}>
                      {a.severity} Spike
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} color="var(--accent-green)" />
                All recent spending aligns within your regular 3-month statistical standard deviation.
              </div>
            )}
          </div>

          {/* AI Pattern Insights List */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Actionable AI Observations & Patterns</div>
              <span className="badge badge-purple"><Bot size={12} /> Live Engine</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {insights.map((item, idx) => (
                <div key={idx} style={{
                  padding: 14,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{item.icon || '💡'}</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                    {item.message}
                  </p>
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <span className="badge" style={{ fontSize: 10, textTransform: 'uppercase', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}>
                      {item.category || 'General'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
