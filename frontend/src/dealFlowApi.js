const DEAL_ENGINE_BASE = 'http://localhost:8083/api';
const FULFILLMENT_BASE = 'http://localhost:8088/api';
const BILLING_BASE = 'http://localhost:8091/api';
const DEAL_HEALTH_BASE = 'http://localhost:8090/api';

async function request(base, path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const dealApi = {
  getOrder: (token, orderId) => request(DEAL_ENGINE_BASE, `/orders/${orderId}`, { token }),
};

export const fulfillmentApi = {
  getByOrder: (token, orderId) => request(FULFILLMENT_BASE, `/fulfillment/orders/${orderId}`, { token }),
  propose: (token, orderId) => request(FULFILLMENT_BASE, `/fulfillment/orders/${orderId}/propose`, { method: 'POST', token }),
  accept: (token, planId) => request(FULFILLMENT_BASE, `/fulfillment/plans/${planId}/accept`, { method: 'POST', token }),
  override: (token, planId, lines) =>
    request(FULFILLMENT_BASE, `/fulfillment/plans/${planId}/override`, { method: 'POST', token, body: { lines } }),
};

export const billingApi = {
  getOrderBilling: (token, orderId) => request(BILLING_BASE, `/billing/orders/${orderId}`, { token }),
  changeQuantity: (token, subscriptionId, newQuantity) =>
    request(BILLING_BASE, `/billing/subscriptions/${subscriptionId}/change-quantity`, { method: 'POST', token, body: { newQuantity } }),
  cancel: (token, subscriptionId, reason) =>
    request(BILLING_BASE, `/billing/subscriptions/${subscriptionId}/cancel`, { method: 'POST', token, body: { reason } }),
  addCreditNote: (token, orderId, amount, reason, subscriptionId) =>
    request(BILLING_BASE, `/billing/orders/${orderId}/credit-notes`, { method: 'POST', token, body: { amount, reason, subscriptionId } }),
};

export const dealHealthApi = {
  dashboard: (token) => request(DEAL_HEALTH_BASE, '/deal-health/dashboard', { token }),
  forQuote: (token, quotationId) => request(DEAL_HEALTH_BASE, `/deal-health/${quotationId}`, { token }),
};
