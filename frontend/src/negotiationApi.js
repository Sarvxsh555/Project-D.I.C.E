import { toast, describeHttpError } from './toast.js';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const BASE = `${API_BASE}/negotiations`;

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
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

export const negotiationApi = {
  events: (token, quotationId) => request(`/${quotationId}/events`, { token }),
  versions: (token, quotationId) => request(`/${quotationId}/versions`, { token }),
  comment: (token, quotationId, lineId, message) =>
    request(`/${quotationId}/comments`, { method: 'POST', token, body: { lineId, message } }),
  changeRequest: (token, quotationId, message) =>
    request(`/${quotationId}/change-requests`, { method: 'POST', token, body: { message } }),
  counterDiscount: (token, quotationId, lineId, proposedDiscountPercent, message) =>
    request(`/${quotationId}/counter-discount`, {
      method: 'POST',
      token,
      body: { lineId, proposedDiscountPercent, message },
    }),
};
