import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    try {
      const res = await notificationService.getAll({ per_page: 5 });
      setUnreadCount(res.data.unread_count || 0);
      setNotifications(res.data.notifications || []);
    } catch {
      // Gracefully silent on background polling
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnread();
    if (!isAuthenticated) return;
    const interval = setInterval(fetchUnread, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnread, isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      notifications,
      loading,
      refreshNotifications: fetchUnread,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      notifications: [],
      loading: false,
      refreshNotifications: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {}
    };
  }
  return ctx;
};
