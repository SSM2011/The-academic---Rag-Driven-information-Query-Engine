const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

// Auth
export const auth = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (name, email, password, role = 'student', adminCode = '') =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, adminCode })
    }),

  me: () => request('/auth/me'),

  getUsers: () => request('/auth/users'),
};

// Documents (admin)
export const documents = {
  upload: (formData) =>
    request('/documents/upload', { method: 'POST', body: formData }),

  embed: (docId) =>
    request(`/documents/${docId}/embed`, { method: 'POST' }),

  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/documents${qs ? '?' + qs : ''}`);
  },

  get: (docId) => request(`/documents/${docId}`),

  delete: (docId) => request(`/documents/${docId}`, { method: 'DELETE' }),

  chunks: (docId, page = 1) => request(`/documents/${docId}/chunks?page=${page}`),

  stats: () => request('/documents/stats/overview'),
};

// Query (students)
export const query = {
  ask: (question, sessionId = null, options = {}) =>
    request('/query', {
      method: 'POST',
      body: JSON.stringify({ question, sessionId, ...options })
    }),

  semanticSearch: (question) =>
    request('/query', {
      method: 'POST',
      body: JSON.stringify({ question, mode: 'semantic' })
    }),

  getSessions: () => request('/query/sessions'),

  getSession: (sessionId) => request(`/query/sessions/${sessionId}`),

  deleteSession: (sessionId) =>
    request(`/query/sessions/${sessionId}`, { method: 'DELETE' }),
};

// Health
export const health = () => request('/health');
