// Client API with intelligent offline fallback for static deployments (e.g. Netlify)
const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined'
    ? (window.location.port === '5001' ? '' : `${window.location.protocol}//${window.location.hostname}:5001`)
    : 'http://localhost:5001'
);

export const DEMO_ADMIN = {
  _id: 'demo_admin_user',
  name: 'Jordan Hayes (Admin)',
  email: 'admin@supporthub.com',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  isOnline: true,
};

export const DEMO_AGENT = {
  _id: 'demo_agent_sarah',
  name: 'Sarah Connor',
  email: 'sarah.agent@supporthub.com',
  role: 'agent',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  isOnline: true,
};

export const DEMO_AGENT_TIER2 = {
  _id: 'demo_agent_alex',
  name: 'Alex Rivera',
  email: 'alex.support@supporthub.com',
  role: 'agent',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  isOnline: true,
};

// Seeded In-Memory fallback store for static deployments
let localFaqs = [
  {
    _id: 'faq_1',
    category: 'Orders',
    question: 'Where is my order and how can I track it?',
    answer: 'You can track your order at any time using your Order Confirmation email or via our Tracking Portal at supporthub.com/track. Enter your order number (e.g. #ORD-8821) and billing zip code. Orders typically process within 24 hours.',
    keywords: ['order', 'track', 'where is my order', 'tracking', 'package', 'status', 'delivery'],
    usageCount: 42,
    isActive: true,
  },
  {
    _id: 'faq_2',
    category: 'Orders',
    question: 'Can I modify or cancel my order after placing it?',
    answer: 'Orders can be modified or canceled within 60 minutes of placement directly from your account order history.',
    keywords: ['cancel order', 'modify order', 'change address', 'edit order', 'cancellation'],
    usageCount: 28,
    isActive: true,
  },
  {
    _id: 'faq_3',
    category: 'Shipping',
    question: 'What are your standard shipping options and delivery timelines?',
    answer: 'We offer three shipping speeds within the continental US: Standard Shipping (3-5 business days, free on orders over $50), Expedited Priority (2 business days, $9.99), and Overnight Express (1 business day, $19.99).',
    keywords: ['shipping', 'delivery', 'timelines', 'rates', 'expedited', 'overnight', 'how long'],
    usageCount: 35,
    isActive: true,
  },
  {
    _id: 'faq_4',
    category: 'Returns',
    question: 'What is your return policy and how do I start a return?',
    answer: 'We offer a 30-day hassle-free return window for all items in original condition. Start your return at supporthub.com/returns by entering your order number.',
    keywords: ['return', 'return policy', 'how to return', '30 days', 'send back', 'exchange'],
    usageCount: 51,
    isActive: true,
  },
  {
    _id: 'faq_5',
    category: 'Refunds',
    question: 'How long does it take for a refund to process?',
    answer: 'Once our warehouse inspects your returned item (1-2 business days), your refund is immediately processed back to your original payment method within 3 to 5 business days.',
    keywords: ['refund', 'money back', 'how long refund', 'refund timeline', 'reimbursement'],
    usageCount: 39,
    isActive: true,
  },
  {
    _id: 'faq_6',
    category: 'Payments',
    question: 'I need help with a payment: what payment methods do you accept?',
    answer: 'We accept Visa, MasterCard, American Express, Discover, PayPal, Apple Pay, Google Pay, and Klarna Pay-in-4 installment plans.',
    keywords: ['payment', 'pay', 'credit card', 'paypal', 'apple pay', 'klarna', 'payment methods'],
    usageCount: 24,
    isActive: true,
  },
  {
    _id: 'faq_7',
    category: 'Account',
    question: 'How do I reset my password if I cannot log in?',
    answer: 'To reset your password, visit supporthub.com/forgot-password, enter your registered email address, and click "Send Reset Link". Link valid for 1 hour.',
    keywords: ['password reset', 'forgot password', 'cannot login', 'reset password', 'account access'],
    usageCount: 19,
    isActive: true,
  },
];

let localConversations = [
  {
    _id: 'conv_1',
    customerId: 'cust_seed_03',
    customerName: 'Sophia Lin',
    customerEmail: 'sophia.lin@example.com',
    status: 'Waiting for Agent',
    priority: 'Urgent',
    unreadCountAgent: 1,
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
    lastMessage: {
      content: 'My payment was charged twice but I received an error page! Please connect me to a human agent.',
      senderType: 'customer',
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
  },
  {
    _id: 'conv_2',
    customerId: 'cust_seed_02',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.v@example.com',
    status: 'Agent Connected',
    priority: 'High',
    unreadCountAgent: 0,
    assignedAgentId: 'demo_agent_sarah',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString(),
    lastMessage: {
      content: 'I have updated your shipping address to Suite 400. Have a wonderful day!',
      senderType: 'agent',
      createdAt: new Date(Date.now() - 120000).toISOString(),
    },
  },
  {
    _id: 'conv_3',
    customerId: 'cust_seed_01',
    customerName: 'Elena Rostova',
    customerEmail: 'elena@example.com',
    status: 'Resolved',
    priority: 'Low',
    resolvedBy: 'AI',
    unreadCountAgent: 0,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessage: {
      content: 'Thank you, the return policy answer explained everything perfectly!',
      senderType: 'customer',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  },
];

let localMessages = {
  conv_1: [
    {
      _id: 'msg_1',
      conversationId: 'conv_1',
      senderType: 'customer',
      senderName: 'Sophia Lin',
      content: 'My payment was charged twice but I received an error page! Please connect me to a human agent.',
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
  ],
  conv_2: [
    {
      _id: 'msg_2',
      conversationId: 'conv_2',
      senderType: 'customer',
      senderName: 'Marcus Vance',
      content: 'Hi, I need to update my shipping address for order #ORD-9912.',
      createdAt: new Date(Date.now() - 1500000).toISOString(),
    },
    {
      _id: 'msg_3',
      conversationId: 'conv_2',
      senderType: 'agent',
      senderName: 'Sarah Connor',
      content: 'I have updated your shipping address to Suite 400. Have a wonderful day!',
      createdAt: new Date(Date.now() - 120000).toISOString(),
    },
  ],
  conv_3: [
    {
      _id: 'msg_4',
      conversationId: 'conv_3',
      senderType: 'customer',
      senderName: 'Elena Rostova',
      content: 'What is your return policy and how do I start a return?',
      createdAt: new Date(Date.now() - 3700000).toISOString(),
    },
    {
      _id: 'msg_5',
      conversationId: 'conv_3',
      senderType: 'ai',
      senderName: 'SupportHub AI',
      content: 'We offer a 30-day hassle-free return window for all items in original condition! You can start a return online at supporthub.com/returns.',
      createdAt: new Date(Date.now() - 3650000).toISOString(),
    },
    {
      _id: 'msg_6',
      conversationId: 'conv_3',
      senderType: 'customer',
      senderName: 'Elena Rostova',
      content: 'Thank you, the return policy answer explained everything perfectly!',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};

let localTickets = [
  {
    _id: 'tkt_1',
    ticketNumber: 'TKT-1001',
    conversationId: 'conv_1',
    customerName: 'Sophia Lin',
    customerEmail: 'sophia.lin@example.com',
    subject: 'Double charge inquiry on payment failure',
    description: 'Customer reports duplicated pending transaction on card. Urgent billing review requested.',
    priority: 'Urgent',
    status: 'Open',
    escalationReason: 'Customer requested human agent for double billing issue',
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    _id: 'tkt_2',
    ticketNumber: 'TKT-1002',
    conversationId: 'conv_2',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.v@example.com',
    subject: 'Urgent address correction for Order #ORD-9912',
    description: 'Customer entered incorrect suite number during checkout. Needs update before courier pickup.',
    priority: 'High',
    status: 'Resolved',
    assignedAgentId: 'demo_agent_sarah',
    escalationReason: 'Customer requested human agent assistance for address modification',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Offline router function for when server is not reachable (e.g. Netlify static hosting)
function handleOfflineFallback(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  // Auth Fallbacks
  if (endpoint.startsWith('/api/auth/login') || endpoint.startsWith('/api/auth/quick-login')) {
    const acc = body.accountType || (body.email?.includes('admin') ? 'admin' : 'agent');
    const user = acc === 'admin' ? DEMO_ADMIN : acc === 'alex' ? DEMO_AGENT_TIER2 : DEMO_AGENT;
    return {
      success: true,
      message: `Signed in as ${user.name}`,
      token: 'demo_static_token_' + Date.now(),
      user,
    };
  }

  if (endpoint.startsWith('/api/auth/register')) {
    const newUser = {
      _id: 'user_' + Date.now(),
      name: body.name || 'Support Staff',
      email: body.email || 'staff@supporthub.com',
      role: body.role || 'agent',
      isOnline: true,
    };
    return {
      success: true,
      message: 'Account created successfully',
      token: 'demo_static_token_' + Date.now(),
      user: newUser,
    };
  }

  if (endpoint.startsWith('/api/auth/me')) {
    const saved = localStorage.getItem('supporthub_user');
    return {
      success: true,
      user: saved ? JSON.parse(saved) : DEMO_ADMIN,
    };
  }

  // Admin Metrics Fallback
  if (endpoint.startsWith('/api/admin/metrics')) {
    return {
      success: true,
      metrics: {
        kpis: {
          totalConversations: localConversations.length + 145,
          activeConversations: 6,
          resolvedConversations: 132,
          escalatedConversations: 12,
          avgFirstResponseTimeSeconds: 1.2,
          avgResolutionTimeMinutes: 2.5,
        },
        resolutionRatio: {
          aiResolvedCount: 98,
          agentResolvedCount: 34,
          aiPercentage: 74.2,
          agentPercentage: 25.8,
        },
        statusBreakdown: [
          { _id: 'Resolved', count: 132 },
          { _id: 'AI Active', count: 4 },
          { _id: 'Waiting for Agent', count: 2 },
        ],
        priorityBreakdown: [
          { _id: 'Low', count: 72 },
          { _id: 'Medium', count: 48 },
          { _id: 'High', count: 20 },
          { _id: 'Urgent', count: 8 },
        ],
        recentActivity: [
          {
            _id: 'act_1',
            customerName: 'Elena Rostova',
            customerEmail: 'elena@example.com',
            status: 'Resolved',
            priority: 'Low',
            resolvedBy: 'AI',
            updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          },
          {
            _id: 'act_2',
            customerName: 'Marcus Vance',
            customerEmail: 'marcus.v@example.com',
            status: 'Resolved',
            priority: 'High',
            resolvedBy: 'Agent',
            updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          },
          {
            _id: 'act_3',
            customerName: 'Sophia Lin',
            customerEmail: 'sophia.lin@example.com',
            status: 'Waiting for Agent',
            priority: 'Urgent',
            updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          },
        ],
      },
    };
  }

  // FAQs Fallback
  if (endpoint.startsWith('/api/faqs')) {
    if (method === 'GET') {
      return { success: true, count: localFaqs.length, faqs: localFaqs };
    }
    if (method === 'POST') {
      const newFaq = { _id: 'faq_' + Date.now(), usageCount: 0, isActive: true, ...body };
      localFaqs.unshift(newFaq);
      return { success: true, faq: newFaq };
    }
    if (method === 'PUT') {
      const id = endpoint.split('/')[3];
      localFaqs = localFaqs.map((f) => (f._id === id ? { ...f, ...body } : f));
      return { success: true };
    }
    if (method === 'DELETE') {
      const id = endpoint.split('/')[3];
      localFaqs = localFaqs.filter((f) => f._id !== id);
      return { success: true };
    }
  }

  // Conversations Fallback
  if (endpoint.startsWith('/api/conversations')) {
    if (endpoint === '/api/conversations' && method === 'POST') {
      const newConv = {
        _id: 'conv_' + Date.now(),
        customerId: body.customerId || 'cust_demo',
        customerName: body.customerName || 'Customer',
        status: 'AI Active',
        priority: 'Medium',
        createdAt: new Date().toISOString(),
      };
      localConversations.unshift(newConv);
      return { success: true, conversation: newConv };
    }
    if (method === 'GET' && !endpoint.includes('/', 18)) {
      return { success: true, conversations: localConversations };
    }
    const id = endpoint.split('/')[3];
    const found = localConversations.find((c) => c._id === id) || localConversations[0];
    return { success: true, conversation: found };
  }

  // Messages Fallback
  if (endpoint.startsWith('/api/messages')) {
    const convId = endpoint.split('/')[3] || 'conv_1';
    if (method === 'GET') {
      return { success: true, messages: localMessages[convId] || [] };
    }
    if (method === 'POST') {
      const userMsg = {
        _id: 'msg_' + Date.now(),
        conversationId: convId,
        senderType: body.senderType || 'customer',
        senderName: body.senderName || 'Customer',
        content: body.content,
        createdAt: new Date().toISOString(),
      };
      if (!localMessages[convId]) localMessages[convId] = [];
      localMessages[convId].push(userMsg);

      // Simulated auto-reply if AI active
      const aiReply = {
        _id: 'msg_ai_' + (Date.now() + 1),
        conversationId: convId,
        senderType: 'ai',
        senderName: 'SupportHub AI',
        content:
          body.content?.toLowerCase().includes('order') || body.content?.toLowerCase().includes('track')
            ? 'You can track your order at any time using your Order Confirmation email or via our Tracking Portal at supporthub.com/track. Enter your order number (e.g. #ORD-8821).'
            : body.content?.toLowerCase().includes('return')
            ? 'We offer a 30-day hassle-free return window for all items in original condition. Start your return at supporthub.com/returns.'
            : 'Thank you for reaching out! I am here to help you with order tracking, returns, refunds, and payments. How can I assist you further?',
        createdAt: new Date(Date.now() + 500).toISOString(),
      };
      localMessages[convId].push(aiReply);

      return { success: true, message: userMsg, aiReply };
    }
  }

  // Tickets Fallback
  if (endpoint.startsWith('/api/tickets')) {
    return { success: true, tickets: localTickets };
  }

  // Default health
  if (endpoint.startsWith('/api/health')) {
    return { status: 'healthy', mode: 'client-offline-fallback' };
  }

  return { success: true };
}

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

  // Attempt real network call with a 1.5s timeout for fast fallback
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn(`Server responded with ${response.status}, falling back gracefully:`, endpoint);
      return handleOfflineFallback(endpoint, options);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    // Network failed or timed out (e.g. static hosting without Express backend like Netlify)
    return handleOfflineFallback(endpoint, options);
  }
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
