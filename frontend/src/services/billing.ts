import { api } from './api'

// TODO: mirror backend BillingController.
export const billingService = {
  schedule: (dealId: string) => api.get(`/billing/${dealId}/schedule`),
  draft: (dealId: string) => api.post(`/billing/${dealId}/draft`),
}
