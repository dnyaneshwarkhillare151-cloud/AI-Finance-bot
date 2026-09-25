import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService, miscService } from '../services/api';
import toast from 'react-hot-toast';
import {
  TrendingUp, Bot, Shield, Target, PieChart, Sparkles,
  ArrowRight, CheckCircle2, Zap, BarChart3, Database
} from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleQuickDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await authService.login({ email: 'demo@financeai.in', password: 'demo1234' });
      login(res.data.access_token, res.data.user);
      toast.success('Logged in to demo account!');
      navigate('/dashboard');
    } catch {
      try {
        const reg = await authService.register({
          full_name: 'Demo User',
          email: 'demo@financeai.in',
          password: 'demo1234',
          confirm_password: 'demo1234',
        });
        login(reg.data.access_token, reg.data.user);
        await miscService.seedDemo();
        toast.success('Demo account ready with sample transactions! 🎉');
        navigate('/dashboard');
      } catch (e) {
        toast.error('Could not start demo session');
      }
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Navigation */}
      <nav style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg,#1e40af,#7c3aed)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={20} color="white" />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>FinAdvisor <span style={{ color: '#06b6d4' }}>AI</span></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px 40px 24px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: 20,
          padding: '6px 16px',
          fontSize: 12,
          color: '#06b6d4',
          fontWeight: 600,
          marginBottom: 24
        }}>
          <Sparkles size={14} /> Powered by Google Gemini & Financial RAG Intelligence
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 54px)',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: -1,
          marginBottom: 20
        }}>
          Master Your Wealth with <br />
          <span style={{
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            AI-Driven Financial Intelligence
          </span>
        </h1>

        <p style={{
          maxWidth: 680,
          margin: '0 auto 32px auto',
          fontSize: 16,
          color: 'var(--text-secondary)',
          lineHeight: 1.6
        }}>
          Track expenses, enforce smart budgets, forecast savings goals, and chat with an AI advisor grounded in your actual financial numbers.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg" style={{ padding: '14px 28px', fontSize: 15 }}>
            Create Free Account <ArrowRight size={18} />
          </Link>
          <button
            onClick={handleQuickDemo}
            disabled={demoLoading}
            className="btn btn-secondary btn-lg"
            style={{ padding: '14px 24px', fontSize: 15 }}
          >
            <Database size={16} /> {demoLoading ? 'Starting Demo...' : 'Instant Demo Mode'}
          </button>
        </div>

        {/* Feature Pill Highlights */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          flexWrap: 'wrap',
          marginTop: 40,
          fontSize: 13,
          color: 'var(--text-secondary)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="var(--accent-green)" /> 100% Local Privacy & Secure Storage
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="var(--accent-green)" /> Indian Financial Context & UPI Ready
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="var(--accent-green)" /> Robust Fallback Engine (Works Offline)
          </span>
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ maxWidth: 1150, margin: '40px auto 80px auto', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
          Complete Financial Mastery in One Platform
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginBottom: 40 }}>
          Engineered for real-world personal finance planning and transparent analytics.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {[
            {
              icon: Bot,
              color: '#06b6d4',
              title: 'Conversational AI Advisor',
              desc: 'Ask questions about your finances, analyze spending patterns, and get personalized budgeting strategies with citations from the RAG knowledge base.'
            },
            {
              icon: Shield,
              color: '#10b981',
              title: 'Financial Health Score (0–100)',
              desc: 'Transparent, traceable health rating based on savings rate (35%), expense control (30%), budget adherence (20%), and goal progress (15%).'
            },
            {
              icon: PieChart,
              color: '#f59e0b',
              title: 'Smart Budgets & Overspending Alerts',
              desc: 'Set category thresholds with automatic warnings at 75% usage and critical alerts at 95% to keep spending within safe boundaries.'
            },
            {
              icon: Target,
              color: '#8b5cf6',
              title: 'Goal Milestones & Forecasting',
              desc: 'Track emergency funds, vacation funds, and major purchases with realistic AI completion forecasts based on monthly savings velocity.'
            },
            {
              icon: BarChart3,
              color: '#3b82f6',
              title: 'Dynamic Financial Statement',
              desc: 'Generate monthly/yearly statements with income breakdown, expense distributions, budget variance matrices, and one-click CSV export.'
            },
            {
              icon: Zap,
              color: '#ec4899',
              title: 'Automatic Categorization & Anomalies',
              desc: 'Instantly categorizes transactions via Gemini or local rules, and alerts you to unusual spending spikes that deviate from your 3-month baseline.'
            }
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="card" style={{ padding: 24, transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `${card.color}15`,
                  border: `1px solid ${card.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <Icon size={22} color={card.color} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{card.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>{card.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '32px 24px',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--text-muted)'
      }}>
        <p>FinAdvisor AI · NASSCOM Personal Finance Platform · Built with FastAPI, React 19, Tailwind CSS & Google Gemini</p>
        <p style={{ marginTop: 6 }}>All financial data processed securely. Educational platform disclaimer applies.</p>
      </footer>
    </div>
  );
}
