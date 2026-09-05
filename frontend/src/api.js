const API_BASE = import.meta.env.VITE_API_BASE || '/api';

class UnauthorizedError extends Error {}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, { method = 'GET', body, token, withCsrf = false } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (withCsrf) {
    const csrfToken = readCookie('XSRF-TOKEN');
    if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new UnauthorizedError(data.error?.message || data.message || 'Unauthorized');
  }
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Request failed');
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  refresh: () => request('/auth/refresh', { method: 'POST', withCsrf: true }),
  logout: (token) => request('/auth/logout', { method: 'POST', token, withCsrf: true }),
  forgotPassword: (payload) => request('/auth/forgot-password', { method: 'POST', body: payload }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),
  me: (token) => request('/portal/me', { token }),
};

export function adminResource(path) {
  return {
    list: (token) => request(`/admin/${path}`, { token }),
    create: (token, body) => request(`/admin/${path}`, { method: 'POST', token, body }),
    update: (token, id, body) => request(`/admin/${path}/${id}`, { method: 'PUT', token, body }),
    remove: (token, id) => request(`/admin/${path}/${id}`, { method: 'DELETE', token }),
  };
}

export async function pingBackend() {
  try {
    const res = await fetch(`${API_BASE}/portal/me`, { credentials: 'include' });
    // Any HTTP response (even 401) means the backend process is reachable.
    return res.status < 500;
  } catch {
    return false;
  }
}

export const adminApi = {
  products: adminResource('products'),
  priceLists: adminResource('price-lists'),
  discountRules: adminResource('discount-rules'),
  warehouses: adminResource('warehouses'),
  subscriptionPlans: adminResource('subscription-plans'),
  recommendationRules: adminResource('recommendation-rules'),
  analyticsSummary: (token) => request('/admin/analytics/summary', { token }),
};

export { UnauthorizedError };
