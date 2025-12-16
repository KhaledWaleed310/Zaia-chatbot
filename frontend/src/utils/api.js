import axios from 'axios';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and other response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Skip redirect if already on login page
      const isOnLoginPage = window.location.pathname === '/login';

      // Skip redirect for public auth endpoints (they handle their own errors)
      const publicAuthEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password',
                                   '/auth/reset-password', '/auth/verify-email', '/auth/resend-verification'];
      const isPublicAuthEndpoint = publicAuthEndpoints.some(endpoint =>
        error.config?.url?.includes(endpoint)
      );

      // Only redirect if not already on login page and not a public auth endpoint
      if (!isOnLoginPage && !isPublicAuthEndpoint) {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    // Handle server errors
    if (error.response.status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }

    return Promise.reject(error);
  }
);

// Helper to build query string, filtering out undefined/null values
const buildQueryString = (params) => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );
  return new URLSearchParams(filtered).toString();
};

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

export const chatbots = {
  list: () => api.get('/chatbots'),
  create: (data) => api.post('/chatbots', data),
  get: (id) => api.get(`/chatbots/${id}`),
  update: (id, data) => api.patch(`/chatbots/${id}`, data),
  delete: (id) => api.delete(`/chatbots/${id}`),
  getEmbed: (id) => api.get(`/chatbots/${id}/embed`),
  uploadDocument: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/chatbots/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listDocuments: (id) => api.get(`/chatbots/${id}/documents`),
  deleteDocument: (botId, docId) => api.delete(`/chatbots/${botId}/documents/${docId}`),
};

export const integrations = {
  // Get OAuth authorization URL
  getAuthUrl: (provider, botId) => api.get(`/integrations/${provider}/auth-url?bot_id=${botId}`),

  // List integrations for a chatbot
  list: (botId) => api.get(`/integrations/chatbots/${botId}`),

  // Disconnect an integration
  disconnect: (botId, provider) => api.delete(`/integrations/chatbots/${botId}/${provider}`),

  // Browse files/pages/channels in an integration
  browse: (botId, provider, folderId = null, pageToken = null, query = null) => {
    const params = new URLSearchParams();
    if (folderId) params.append('folder_id', folderId);
    if (pageToken) params.append('page_token', pageToken);
    if (query) params.append('query', query);
    const queryString = params.toString();
    return api.get(`/integrations/chatbots/${botId}/${provider}/browse${queryString ? '?' + queryString : ''}`);
  },

  // Import selected items
  import: (botId, provider, items) => api.post(`/integrations/chatbots/${botId}/${provider}/import`, { items }),

  // Get integration status
  getStatus: (botId, provider) => api.get(`/integrations/chatbots/${botId}/${provider}/status`),
};

// Admin API
export const admin = {
  // System stats
  getStats: () => api.get('/admin/stats'),
  getUsageAnalytics: (days = 30) => api.get(`/admin/analytics/usage?days=${days}`),
  getBusinessAnalytics: () => api.get('/admin/analytics/business'),
  getRealtimeAnalytics: () => api.get('/admin/analytics/realtime'),
  getFinanceAnalytics: () => api.get('/admin/analytics/finance'),
  getEmailAnalytics: (days = 30) => api.get(`/admin/analytics/email?days=${days}`),
  resetEmailAnalytics: () => api.post('/admin/analytics/email/reset'),
  getServerStatus: () => api.get('/admin/server/status'),

  // User management
  listUsers: (params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/admin/users${query ? '?' + query : ''}`);
  },
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (userId, data) => api.patch(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  suspendUser: (userId) => api.post(`/admin/users/${userId}/suspend`),
  unsuspendUser: (userId) => api.post(`/admin/users/${userId}/unsuspend`),

  // Chatbot management
  listChatbots: (params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/admin/chatbots${query ? '?' + query : ''}`);
  },
  getChatbot: (botId) => api.get(`/admin/chatbots/${botId}`),
  deleteChatbot: (botId) => api.delete(`/admin/chatbots/${botId}`),

  // Database management
  getDatabaseStats: () => api.get('/admin/databases'),
  cleanupOrphanedData: () => api.post('/admin/databases/cleanup'),

  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.patch('/admin/settings', data),

  // Audit logs
  getAuditLogs: (params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/admin/audit-logs${query ? '?' + query : ''}`);
  },
};

// API Keys
export const apiKeys = {
  // List all API keys
  list: () => api.get('/api-keys'),

  // Create a new API key
  create: (data) => api.post('/api-keys', data),

  // Get a single API key
  get: (keyId) => api.get(`/api-keys/${keyId}`),

  // Update an API key
  update: (keyId, data) => api.patch(`/api-keys/${keyId}`, data),

  // Delete an API key
  delete: (keyId) => api.delete(`/api-keys/${keyId}`),

  // Revoke an API key
  revoke: (keyId) => api.post(`/api-keys/${keyId}/revoke`),

  // Get usage stats
  getUsage: (keyId) => api.get(`/api-keys/${keyId}/usage`),
};

// Feedback & Training API
export const feedback = {
  // Submit feedback (public)
  submit: (botId, data) => api.post(`/feedback/${botId}/submit`, data),

  // List feedback
  list: (botId, params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/feedback/${botId}${query ? '?' + query : ''}`);
  },

  // Get feedback stats
  getStats: (botId, days = 30) => api.get(`/feedback/${botId}/stats?days=${days}`),

  // Training pairs
  listTraining: (botId, params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/feedback/${botId}/training${query ? '?' + query : ''}`);
  },

  createTraining: (botId, data) => api.post(`/feedback/${botId}/training`, data),

  updateTraining: (botId, pairId, data) => api.patch(`/feedback/${botId}/training/${pairId}`, data),

  deleteTraining: (botId, pairId) => api.delete(`/feedback/${botId}/training/${pairId}`),

  exportTraining: (botId, format = 'json', approvedOnly = true) =>
    api.get(`/feedback/${botId}/training/export?format=${format}&approved_only=${approvedOnly}`, { responseType: 'blob' }),
};

// Translation / Multi-Language API
export const translation = {
  // Get supported languages
  getLanguages: () => api.get('/translation/languages'),

  // Detect language
  detectLanguage: (text) => api.post('/translation/detect', { text }),

  // Translate text
  translate: (text, targetLanguage, sourceLanguage = null) =>
    api.post('/translation/translate', { text, target_language: targetLanguage, source_language: sourceLanguage }),

  // Get widget translations
  getWidgetTranslations: (language) => api.get(`/translation/widget/${language}`),

  // Get bot language config
  getConfig: (botId) => api.get(`/translation/chatbots/${botId}/config`),

  // Update bot language config
  updateConfig: (botId, config) => api.put(`/translation/chatbots/${botId}/config`, config),
};

// Handoff API
export const handoff = {
  // List handoffs for a chatbot
  list: (botId, params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/handoff/${botId}${query ? '?' + query : ''}`);
  },

  // Get handoff stats
  getStats: (botId, days = 30) => api.get(`/handoff/${botId}/stats?days=${days}`),

  // Get handoff config
  getConfig: (botId) => api.get(`/handoff/${botId}/config`),

  // Update handoff config
  updateConfig: (botId, config) => api.put(`/handoff/${botId}/config`, config),

  // Get single handoff
  get: (botId, handoffId) => api.get(`/handoff/${botId}/${handoffId}`),

  // Update handoff
  update: (botId, handoffId, data) => api.patch(`/handoff/${botId}/${handoffId}`, data),

  // Send message in handoff
  sendMessage: (botId, handoffId, content) =>
    api.post(`/handoff/${botId}/${handoffId}/message`, { content, sender_type: 'agent' }),

  // Update agent presence
  updatePresence: (status, maxConcurrent = 5) =>
    api.post('/handoff/agents/presence', { status, max_concurrent: maxConcurrent }),

  // Get agents status
  getAgentsStatus: () => api.get('/handoff/agents/status'),

  // Booking config
  getBookingConfig: (botId) => api.get(`/handoff/${botId}/booking-config`),
  updateBookingConfig: (botId, config) => api.put(`/handoff/${botId}/booking-config`, config),
  toggleBooking: (botId, enabled) => api.patch(`/handoff/${botId}/booking-config/toggle?enabled=${enabled}`),
};

// Leads API
export const leads = {
  // List leads for a chatbot
  list: (botId, params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/leads/${botId}${query ? '?' + query : ''}`);
  },

  // Create a new lead
  create: (botId, data) => api.post(`/leads/${botId}`, data),

  // Get a single lead
  get: (botId, leadId) => api.get(`/leads/${botId}/${leadId}`),

  // Update a lead
  update: (botId, leadId, data) => api.patch(`/leads/${botId}/${leadId}`, data),

  // Delete a lead
  delete: (botId, leadId) => api.delete(`/leads/${botId}/${leadId}`),

  // Get lead stats
  getStats: (botId, days = 30) => api.get(`/leads/${botId}/stats?days=${days}`),

  // Export leads
  export: (botId, format = 'csv', status = null) => {
    const params = new URLSearchParams({ format });
    if (status) params.append('status', status);
    return api.get(`/leads/${botId}/export?${params.toString()}`, { responseType: 'blob' });
  },

  // Get lead form config
  getFormConfig: (botId) => api.get(`/leads/${botId}/form-config`),

  // Update lead form config
  updateFormConfig: (botId, config) => api.put(`/leads/${botId}/form-config`, config),
};

// Analytics API
export const analytics = {
  // Dashboard
  getDashboard: (botId, days = 30) => api.get(`/analytics/${botId}/dashboard?days=${days}`),

  // Unanswered Questions
  listUnansweredQuestions: (botId, params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/analytics/${botId}/unanswered-questions${query ? '?' + query : ''}`);
  },
  updateUnansweredQuestion: (botId, questionId, data) =>
    api.patch(`/analytics/${botId}/unanswered-questions/${questionId}`, data),
  getUnansweredSummary: (botId, days = 30) =>
    api.get(`/analytics/${botId}/unanswered-summary?days=${days}`),

  // Sentiment
  getSentimentSummary: (botId, days = 30) =>
    api.get(`/analytics/${botId}/sentiment/summary?days=${days}`),
  getSentimentTimeline: (botId, granularity = 'day', days = 30) =>
    api.get(`/analytics/${botId}/sentiment/timeline?granularity=${granularity}&days=${days}`),

  // Quality
  getQualitySummary: (botId, days = 30) =>
    api.get(`/analytics/${botId}/quality/summary?days=${days}`),
  listQualityResponses: (botId, params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/analytics/${botId}/quality/responses${query ? '?' + query : ''}`);
  },

  // Usage
  getRealtimeUsage: (botId) => api.get(`/analytics/${botId}/usage/realtime`),
  getUsageHeatmap: (botId, metric = 'messages', days = 30) =>
    api.get(`/analytics/${botId}/usage/heatmap?metric=${metric}&days=${days}`),
  getPeakHours: (botId, days = 30) =>
    api.get(`/analytics/${botId}/usage/peak-hours?days=${days}`),

  // Topics
  listTopics: (botId) => api.get(`/analytics/${botId}/topics`),
  triggerTopicClustering: (botId, minClusterSize = 10) =>
    api.post(`/analytics/${botId}/topics/cluster?min_cluster_size=${minClusterSize}`),
};

// Public share API (no auth required)
export const share = {
  // Get config for shared bot
  getConfig: (botId) => axios.get(`${API_BASE}/chatbots/share/${botId}/config`),

  // Verify password for protected bot
  verifyPassword: (botId, password) => axios.post(`${API_BASE}/chatbots/share/${botId}/verify`, { password }),

  // Check access (with optional token)
  checkAccess: (botId, token = null) => {
    const params = token ? `?token=${token}` : '';
    return axios.get(`${API_BASE}/chatbots/share/${botId}/check-access${params}`);
  },

  // Send message to shared bot (public endpoint)
  sendMessage: (botId, message, sessionId = null) => {
    return axios.post(`${API_BASE}/chat/${botId}/message`, {
      message,
      session_id: sessionId,
    });
  },

  // Conversation Management (Personal Mode)
  listConversations: (botId, visitorId) =>
    axios.get(`${API_BASE}/chat/${botId}/conversations`, {
      params: { visitor_id: visitorId }
    }),

  getConversation: (botId, sessionId, visitorId) =>
    axios.get(`${API_BASE}/chat/${botId}/conversations/${sessionId}`, {
      params: { visitor_id: visitorId }
    }),

  createConversation: (botId, visitorId) =>
    axios.post(`${API_BASE}/chat/${botId}/conversations`, null, {
      params: { visitor_id: visitorId }
    }),

  updateConversation: (botId, sessionId, visitorId, data) =>
    axios.patch(`${API_BASE}/chat/${botId}/conversations/${sessionId}`, data, {
      params: { visitor_id: visitorId }
    }),

  deleteConversation: (botId, sessionId, visitorId) =>
    axios.delete(`${API_BASE}/chat/${botId}/conversations/${sessionId}`, {
      params: { visitor_id: visitorId }
    }),

  getGreeting: (botId, visitorId) =>
    axios.get(`${API_BASE}/greeting/${botId}`, {
      params: { visitor_id: visitorId }
    }),
};

// GDPR API
export const gdpr = {
  // Export user data
  exportData: () => api.get('/gdpr/export'),

  // Request account deletion (soft delete with 30-day grace period)
  requestDeletion: () => api.post('/gdpr/delete-request'),

  // Delete account immediately (hard delete)
  deleteImmediately: () => api.delete('/gdpr/delete-immediate'),

  // Update marketing consent
  updateConsent: (marketingConsent) => api.patch('/gdpr/consent', { marketing_consent: marketingConsent }),
};

// Bookings API
export const bookings = {
  // List bookings for a bot
  list: (botId, params = {}) => {
    const query = buildQueryString(params);
    return api.get(`/bookings/${botId}${query ? '?' + query : ''}`);
  },

  // Get calendar view (bookings grouped by date)
  getCalendar: (botId, year, month) =>
    api.get(`/bookings/${botId}/calendar?year=${year}&month=${month}`),

  // Check time slot availability
  checkAvailability: (botId, date, time, duration = null) => {
    const params = new URLSearchParams({ date, time });
    if (duration) params.append('duration', duration);
    return api.get(`/bookings/${botId}/check-availability?${params.toString()}`);
  },

  // Get single booking
  get: (botId, bookingId) => api.get(`/bookings/${botId}/${bookingId}`),

  // Update booking status
  updateStatus: (botId, bookingId, status) =>
    api.patch(`/bookings/${botId}/${bookingId}?status=${status}`),

  // Cancel booking
  cancel: (botId, bookingId) => api.delete(`/bookings/${botId}/${bookingId}`),
};

export default api;
