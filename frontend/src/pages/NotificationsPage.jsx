import { useState, useEffect } from 'react';
import { notificationService } from '../services/api';
import { formatDate, extractError } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Bell, BellOff, Check, CheckCheck, Trash2, RefreshCw } from 'lucide-react';

const TYPE_COLORS = { budget_alert: '#f59e0b', goal_update: '#10b981', anomaly: '#ef4444', insight: '#3b82f6', info: '#64748b' };
const TYPE_EMOJIS = { budget_alert: '💰', goal_update: '🎯', anomaly: '⚠️', insight: '💡', info: 'ℹ️' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'unread') params.unread_only = true;
      const res = await notificationService.getAll({ ...params, per_page: 50 });
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unread_count || 0);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, [filter]);

  const handleMarkRead = async (id) => {
    try { await notificationService.markRead(id); fetchNotifications(); }
    catch { toast.error('Failed to mark as read'); }
  };

  const handleMarkAllRead = async () => {
    try { await notificationService.markAllRead(); toast.success('All marked as read'); fetchNotifications(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try { await notificationService.delete(id); fetchNotifications(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete all notifications?')) return;
    setDeleting(true);
    try { await notificationService.clearAll(); toast.success('All notifications cleared'); fetchNotifications(); }
    catch { toast.error('Failed to clear notifications'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Notifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{unread} unread · {total} total</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchNotifications}><RefreshCw size={14} /> Refresh</button>
          {unread > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}><CheckCheck size={14} /> Mark All Read</button>
          )}
          {total > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleClearAll} disabled={deleting}>
              <Trash2 size={14} /> {deleting ? 'Clearing...' : 'Clear All'}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unread})` },
        ].map(f => (
          <button key={f.key} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><BellOff size={40} color="var(--text-muted)" /></div>
            <div className="empty-state-title">No notifications</div>
            <div className="empty-state-desc">You're all caught up! Notifications will appear here for budget alerts, goal updates, and AI insights.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => (
            <div key={n.id} className="card" style={{ padding: '12px 16px', opacity: n.is_read ? 0.7 : 1, borderLeftColor: !n.is_read ? TYPE_COLORS[n.notification_type] || '#3b82f6' : 'transparent', borderLeftWidth: 3, borderLeftStyle: 'solid', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${TYPE_COLORS[n.notification_type] || '#3b82f6'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {TYPE_EMOJIS[n.notification_type] || '📢'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 14 }}>{n.title}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {!n.is_read && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[n.notification_type] || '#3b82f6', flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(n.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <span className="badge" style={{ fontSize: 10, background: `${TYPE_COLORS[n.notification_type] || '#3b82f6'}15`, color: TYPE_COLORS[n.notification_type] || '#3b82f6' }}>
                      {n.notification_type?.replace('_', ' ')}
                    </span>
                    {!n.is_read && (
                      <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleMarkRead(n.id)}>
                        <Check size={11} /> Mark Read
                      </button>
                    )}
                    <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: 11, color: 'var(--accent-red)' }} onClick={() => handleDelete(n.id)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
