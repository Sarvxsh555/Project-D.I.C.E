import { api } from './api'

// TODO: type these against backend DealController's request/response records
// once frontend/src/types has the shared shapes.
export const dealsService = {
  list: (params?: Record<string, unknown>) => api.get('/deals', { params }),
  get: (id: string) => api.get(`/deals/${id}`),
  create: (payload: unknown) => api.post('/deals', payload),
  applyDiscount: (id: string, discountPercent: number) =>
    api.post(`/deals/${id}/discount`, { discountPercent }),
}
