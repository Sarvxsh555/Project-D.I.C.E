import { toast, describeHttpError } from './toast.js';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    toast.error('Network error — could not reach the server. Please check your connection and try again.');
    throw networkErr;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = describeHttpError(response.status, data);
    toast.error(message);
    throw new Error(message);
  }
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
