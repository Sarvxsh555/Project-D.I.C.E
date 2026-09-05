const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || data.message || 'Request failed');
  return data;
}

export const workspaceApi = {
  tasks: (token) => request('/tasks', { token }),
  createTask: (token, body) => request('/tasks', { method: 'POST', token, body }),
  patchTask: (token, id, body) => request(`/tasks/${id}`, { method: 'PATCH', token, body }),
  notifications: (token) => request('/notifications', { token }),
  markNotificationRead: (token, id) => request(`/notifications/${id}`, { method: 'PATCH', token }),
  unreadCount: (token) => request('/notifications/unread-count', { token }),
};
