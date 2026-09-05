const API_BASE = 'http://localhost:8080/api';

class UnauthorizedError extends Error {}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, { method = 'GET', body, token, withCsrf = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
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
    throw new UnauthorizedError(data.message || 'Unauthorized');
  }
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
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

export { UnauthorizedError };
