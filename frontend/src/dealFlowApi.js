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
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Request failed');
  }
  return data;
}

export const dealApi = {
  getOrder: (token, orderId) => request(`/orders/${orderId}`, { token }),
};

export const fulfillmentApi = {
  getByOrder: (token, orderId) => request(`/fulfillment/orders/${orderId}`, { token }),
  propose: (token, orderId) => request(`/fulfillment/orders/${orderId}/propose`, { method: 'POST', token }),
  accept: (token, planId) => request(`/fulfillment/plans/${planId}/accept`, { method: 'POST', token }),
  override: (token, planId, lines) =>
    request(`/fulfillment/plans/${planId}/override`, { method: 'POST', token, body: { lines } }),
};

export const billingApi = {
  getOrderBilling: (token, orderId) => request(`/billing/orders/${orderId}`, { token }),
  changeQuantity: (token, subscriptionId, newQuantity) =>
    request(`/billing/subscriptions/${subscriptionId}/change-quantity`, { method: 'POST', token, body: { newQuantity } }),
  cancel: (token, subscriptionId, reason) =>
    request(`/billing/subscriptions/${subscriptionId}/cancel`, { method: 'POST', token, body: { reason } }),
  addCreditNote: (token, orderId, amount, reason, subscriptionId) =>
    request(`/billing/orders/${orderId}/credit-notes`, { method: 'POST', token, body: { amount, reason, subscriptionId } }),
};

export const dealHealthApi = {
  dashboard: (token) => request('/deal-health/dashboard', { token }),
  forQuote: (token, quotationId) => request(`/deal-health/${quotationId}`, { token }),
};
