const QUOTATION_API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, { method = 'GET', body, token, idempotencyKey } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`${QUOTATION_API_BASE}${path}`, {
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

function toQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') usp.set(key, value);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export const quotationApi = {
  list: (token, params) => request(`/quotations${toQuery(params)}`, { token }),
  get: (token, id) => request(`/quotations/${id}`, { token }),
  create: (token, body) => request('/quotations', { method: 'POST', token, body }),
  update: (token, id, body) => request(`/quotations/${id}`, { method: 'PUT', token, body }),
  transition: (token, id, toStage) =>
    request(`/quotations/${id}/transition`, { method: 'POST', token, body: { toStage } }),
  products: (token, params) => request(`/products${toQuery(params)}`, { token }),
  customers: (token) => request('/customers', { token }),
  recommendations: (token, productIds) =>
    request(`/recommendations${toQuery({ productIds: productIds.join(',') })}`, { token }),
  approvalChain: (token, id) => request(`/quotations/${id}/approval-chain`, { token }),
  audit: (token, id) => request(`/quotations/${id}/audit`, { token }),
  approve: (token, id, reason) => request(`/quotations/${id}/approve`, { method: 'POST', token, body: { reason } }),
  reject: (token, id, reason) => request(`/quotations/${id}/reject`, { method: 'POST', token, body: { reason } }),
  returnForRevision: (token, id, reason) =>
    request(`/quotations/${id}/return`, { method: 'POST', token, body: { reason } }),
  customerConfirm: (token, id) =>
    request(`/quotations/${id}/customer-confirm`, {
      method: 'POST',
      token,
      idempotencyKey: `confirm-${id}-${crypto.randomUUID()}`,
    }),
};

export const PIPELINE_STAGES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'NEGOTIATION',
  'APPROVED',
  'ORDERED',
  'FULFILLMENT',
  'COMPLETED',
];

export function stageLabel(stage) {
  return stage
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatInr(amount) {
  const value = Number(amount) || 0;
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}
