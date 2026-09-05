const BASE = 'http://localhost:8086/api/negotiations';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const negotiationApi = {
  events: (token, quotationId) => request(`/${quotationId}/events`, { token }),
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
