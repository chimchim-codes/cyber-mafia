const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.port === '5001' ? '' : 'http://localhost:5001'
);

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('supporthub_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
    quickLogin: (accountType) => request('/api/auth/quick-login', { method: 'POST', body: { accountType } }),
    register: (userData) => request('/api/auth/register', { method: 'POST', body: userData }),
    me: () => request('/api/auth/me'),
  },

  // Conversations
  conversations: {
    init: (payload) => request('/api/conversations', { method: 'POST', body: payload }),
    list: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.set('status', params.status);
      if (params.priority) searchParams.set('priority', params.priority);
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', params.page);
      return request(`/api/conversations?${searchParams.toString()}`);
    },
    get: (id) => request(`/api/conversations/${id}`),
    updateStatus: (id, status, resolvedBy) =>
      request(`/api/conversations/${id}/status`, { method: 'PATCH', body: { status, resolvedBy } }),
    assign: (id, agentId) =>
      request(`/api/conversations/${id}/assign`, { method: 'PATCH', body: { agentId } }),
    updatePriority: (id, priority) =>
      request(`/api/conversations/${id}/priority`, { method: 'PATCH', body: { priority } }),
    clear: (id) => request(`/api/conversations/${id}`, { method: 'DELETE' }),
  },

  // Messages
  messages: {
    list: (conversationId) => request(`/api/messages/${conversationId}`),
    send: (conversationId, payload) =>
      request(`/api/messages/${conversationId}`, { method: 'POST', body: payload }),
  },

  // FAQs
  faqs: {
    list: (params = {}) => {
      const sp = new URLSearchParams();
      if (params.category) sp.set('category', params.category);
      if (params.search) sp.set('search', params.search);
      if (params.includeInactive) sp.set('includeInactive', 'true');
      return request(`/api/faqs?${sp.toString()}`);
    },
    create: (faq) => request('/api/faqs', { method: 'POST', body: faq }),
    update: (id, faq) => request(`/api/faqs/${id}`, { method: 'PUT', body: faq }),
    delete: (id) => request(`/api/faqs/${id}`, { method: 'DELETE' }),
    categories: () => request('/api/faqs/categories'),
  },

  // Tickets
  tickets: {
    list: (params = {}) => {
      const sp = new URLSearchParams();
      if (params.status) sp.set('status', params.status);
      if (params.priority) sp.set('priority', params.priority);
      if (params.search) sp.set('search', params.search);
      return request(`/api/tickets?${sp.toString()}`);
    },
    create: (ticket) => request('/api/tickets', { method: 'POST', body: ticket }),
    update: (id, payload) => request(`/api/tickets/${id}`, { method: 'PATCH', body: payload }),
  },

  // Admin
  admin: {
    getMetrics: () => request('/api/admin/metrics'),
  },

  // Health
  health: () => request('/api/health'),
};

export default api;
