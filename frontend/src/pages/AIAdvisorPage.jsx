import { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/api';
import { renderMarkdown } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Send, Bot, User, Sparkles, BookOpen, AlertCircle, Zap, RefreshCw } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "Where did I spend the most this month?",
  "How much can I save this month?",
  "How can I reduce my expenses?",
  "Give me a budget plan for next month",
  "What is the 50/30/20 rule?",
  "How should I build an emergency fund?",
  "What are good investment options in India?",
  "How can I improve my financial health score?",
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-message ${isUser ? 'user' : 'ai'}`}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isUser ? 'linear-gradient(135deg,#1e40af,#7c3aed)' : 'rgba(6,182,212,0.15)', border: isUser ? 'none' : '1px solid rgba(6,182,212,0.2)' }}>
        {isUser ? <User size={16} color="white" /> : <Bot size={16} color="#06b6d4" />}
      </div>
      <div className="chat-bubble">
        {isUser ? (
          <p style={{ margin: 0 }}>{msg.content}</p>
        ) : (
          <>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
            {msg.sources?.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BookOpen size={10} /> Sources
                </div>
                {msg.sources.map(s => (
                  <span key={s.id} style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', fontSize: 10, padding: '1px 6px', borderRadius: 4, marginRight: 4, marginBottom: 2 }}>
                    {s.title}
                  </span>
                ))}
              </div>
            )}
            {msg.is_ai && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={10} /> Powered by Gemini AI
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState([{
    role: 'ai',
    content: "👋 Hello! I'm your **AI Financial Advisor**, powered by Google Gemini.\n\nI have access to your actual financial data and can help you with:\n- Analyzing your spending patterns\n- Budget planning and recommendations\n- Goal tracking advice\n- General financial education (Indian context)\n\nWhat would you like to know today?",
    is_ai: true,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    aiService.getStatus().then(r => setAiStatus(r.data)).catch(() => {});
    aiService.getAnomalies().then(r => setAnomalies(r.data.anomalies || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
      const res = await aiService.chat(text, history, useRag);
      const data = res.data;
      setMessages(m => [...m, {
        role: 'ai',
        content: data.answer || data.message || 'Sorry, I could not generate a response.',
        is_ai: data.is_ai,
        sources: data.sources,
        is_rag: data.is_rag,
      }]);
    } catch (err) {
      setMessages(m => [...m, {
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again. If this persists, check that the backend is running.',
        is_ai: false,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={24} color="#06b6d4" /> AI Financial Advisor
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Powered by Google Gemini · RAG-enhanced responses</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="ai-badge" style={{
            background: aiStatus?.gemini_available ? 'rgba(16,185,129,0.1)' : 'rgba(6,182,212,0.1)',
            color: aiStatus?.gemini_available ? 'var(--accent-green)' : 'var(--accent-cyan)',
            border: `1px solid ${aiStatus?.gemini_available ? 'rgba(16,185,129,0.2)' : 'rgba(6,182,212,0.2)'}`
          }}>
            {aiStatus?.gemini_available ? '🟢 Gemini LLM Online' : '🟢 Rule-Engine Advisor Active'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Chat */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Chat messages */}
          <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div className="chat-message ai">
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.2)', flexShrink: 0 }}>
                  <Bot size={16} color="#06b6d4" />
                </div>
                <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={useRag} onChange={e => setUseRag(e.target.checked)} />
                <BookOpen size={12} /> RAG Mode (Knowledge Base)
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="chat-input"
                placeholder="Ask anything about your finances..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ padding: '10px 14px' }}>
                <Send size={16} />
              </button>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
              ⚠️ This assistant provides educational financial information and is not a substitute for a qualified financial advisor.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* Suggested Questions */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>💡 Suggested Questions</div>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} className="btn btn-secondary btn-sm"
                style={{ width: '100%', textAlign: 'left', marginBottom: 6, fontSize: 12, whiteSpace: 'normal', height: 'auto', padding: '8px 10px', justifyContent: 'flex-start', lineHeight: 1.4 }}
                onClick={() => sendMessage(q)} disabled={loading}>
                {q}
              </button>
            ))}
          </div>

          {/* Anomalies */}
          {anomalies.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <AlertCircle size={14} color="var(--accent-yellow)" />
                <div className="card-title" style={{ fontSize: 13, color: 'var(--accent-yellow)' }}>Anomalies Detected</div>
              </div>
              {anomalies.slice(0, 2).map((a, i) => (
                <div key={i} style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{a.category}: {a.multiplier}x average</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.message}</div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 4, fontSize: 11 }}
                onClick={() => sendMessage("Explain the unusual spending anomalies detected in my account")}>
                Ask AI to explain →
              </button>
            </div>
          )}

          {/* AI Features */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>🚀 AI Features</div>
            {[
              { icon: '🤖', label: 'Gemini AI', status: aiStatus?.gemini_available ? 'Active' : 'Offline', ok: aiStatus?.gemini_available },
              { icon: '📚', label: 'RAG System', status: 'Active', ok: true },
              { icon: '🔍', label: 'Anomaly Detection', status: `${anomalies.length} found`, ok: true },
              { icon: '📊', label: 'Smart Analytics', status: 'Active', ok: true },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12 }}>{f.icon} {f.label}</span>
                <span style={{ fontSize: 11, color: f.ok ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
