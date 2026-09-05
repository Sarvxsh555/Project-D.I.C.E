import { api } from './api'

// TODO: mirror backend ApprovalController.
export const approvalsService = {
  pending: () => api.get('/approvals/pending'),
  forDeal: (dealId: string) => api.get(`/approvals/deal/${dealId}`),
  approve: (id: string, comment?: string) => api.post(`/approvals/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) => api.post(`/approvals/${id}/reject`, { comment }),
}
