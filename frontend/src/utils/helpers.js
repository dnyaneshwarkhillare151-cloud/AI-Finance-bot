// Format currency in Indian style
export const formatCurrency = (amount, symbol = '₹') => {
  if (amount === null || amount === undefined || isNaN(amount)) return `${symbol}0`;
  const num = parseFloat(amount);
  const isNeg = num < 0;
  const absNum = Math.abs(num);
  let formatted = '';
  if (absNum >= 10000000) formatted = `${(absNum / 10000000).toFixed(1)}Cr`;
  else if (absNum >= 100000) formatted = `${(absNum / 100000).toFixed(1)}L`;
  else if (absNum >= 10000) formatted = `${(absNum / 1000).toFixed(1)}K`;
  else formatted = `${absNum.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `${isNeg ? '-' : ''}${symbol}${formatted}`;
};

export const formatCurrencyFull = (amount, symbol = '₹') => {
  if (amount === null || amount === undefined || isNaN(amount)) return `${symbol}0.00`;
  const num = parseFloat(amount);
  const isNeg = num < 0;
  const absNum = Math.abs(num);
  return `${isNeg ? '-' : ''}${symbol}${absNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateInput = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
};

export const getMonthName = (month, year) => {
  return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

export const getCategoryColor = (category) => {
  const colors = {
    Food: '#f59e0b',
    Transport: '#3b82f6',
    Shopping: '#8b5cf6',
    Bills: '#ef4444',
    Entertainment: '#ec4899',
    Education: '#06b6d4',
    Health: '#10b981',
    Salary: '#22c55e',
    Investment: '#6366f1',
    Other: '#94a3b8',
  };
  return colors[category] || '#94a3b8';
};

export const getCategoryEmoji = (category) => {
  const emojis = {
    Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '📄',
    Entertainment: '🎬', Education: '📚', Health: '🏥',
    Salary: '💼', Investment: '📈', Other: '📦',
  };
  return emojis[category] || '📦';
};

export const getStatusColor = (status) => {
  const colors = { normal: '#10b981', warning: '#f59e0b', critical: '#ef4444' };
  return colors[status] || '#94a3b8';
};

export const getHealthColor = (score) => {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

export const getHealthLabel = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Needs Work';
  return 'Poor';
};

export const getPriorityColor = (priority) => {
  const colors = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
  return colors[priority] || '#94a3b8';
};

export const extractError = (error) => {
  return error?.response?.data?.detail
    || error?.response?.data?.message
    || error?.message
    || 'Something went wrong. Please try again.';
};

// Simple markdown renderer for chat
export const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
};

export const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Education', 'Health', 'Salary', 'Investment', 'Other'];
export const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Net Banking', 'Other'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
