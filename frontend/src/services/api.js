import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthEndpoint && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authService = {
  register: (data) => api.post('/auth/register', data, { timeout: 10000 }),
  login: (data) => api.post('/auth/login', data, { timeout: 10000 }),
  getMe: () => api.get('/auth/me', { timeout: 3500 }),
  updateProfile: (data) => api.put('/auth/me', data),
};

// Transactions
export const transactionService = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
};

// Budgets
export const budgetService = {
  getAll: (params) => api.get('/budgets', { params }),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
  getRecommendations: () => api.get('/budgets/recommendations'),
};

// Goals
export const goalService = {
  getAll: () => api.get('/goals'),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  getAnalysis: (id) => api.get(`/goals/${id}/analysis`),
};

// Dashboard
export const dashboardService = {
  get: () => api.get('/dashboard'),
};

// AI
export const aiService = {
  getStatus: () => api.get('/ai/status'),
  categorize: (description) => api.post('/ai/categorize', { description }),
  chat: (message, history = [], useRag = false) => api.post('/ai/chat', { message, history, use_rag: useRag }),
  getInsights: () => api.get('/ai/insights'),
  getFinancialHealth: () => api.get('/ai/financial-health'),
  getAnomalies: () => api.get('/ai/anomalies'),
  rag: (message) => api.post('/ai/rag', { message }),
};

// Reports
export const reportService = {
  get: (params) => api.get('/reports', { params }),
  exportCsv: async (params) => {
    const response = await api.get('/reports/export/csv', {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};

// Notifications
export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
};

// Misc
export const miscService = {
  health: () => api.get('/health'),
  seedDemo: () => api.post('/seed'),
};

export default api;
