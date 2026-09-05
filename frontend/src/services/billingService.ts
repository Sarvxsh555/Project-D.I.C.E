import { api } from './apiClient'
import type { BillingSchedule, Subscription, Invoice } from '../types/billing'

export const billingService = {
  getSchedule: async (dealId: string): Promise<BillingSchedule> => {
    const res = await api.get<BillingSchedule>(`/billing/${dealId}/schedule`)
    return res.data
  },

  /** Real endpoint: POST /billing/{dealId}/draft (BillingController.draft). */
  draft: async (dealId: string): Promise<BillingSchedule> => {
    const res = await api.post<BillingSchedule>(`/billing/${dealId}/draft`)
    return res.data
  },

  /** No global subscription list on the real API — only per-deal
   *  (GET /deals/{dealId}/subscriptions) or per-id (GET /subscriptions/{id}). */
  listSubscriptionsForDeal: async (dealId: string): Promise<Subscription[]> => {
    const res = await api.get<Subscription[]>(`/deals/${dealId}/subscriptions`)
    return res.data
  },

  /** No pause endpoint on the real API — SubscriptionController only has cancel. */
  cancelSubscription: async (id: string): Promise<Subscription> => {
    const res = await api.post<Subscription>(`/subscriptions/${id}/cancel`)
    return res.data
  },

  /** Real endpoint is POST /deals/{dealId}/invoice (InvoiceController.generate).
   *  Returns 204 (no invoice generated, e.g. nothing billable) as null. */
  generateInvoice: async (dealId: string): Promise<Invoice | null> => {
    const res = await api.post<Invoice>(`/deals/${dealId}/invoice`)
    return res.status === 204 ? null : res.data
  },
}

export default billingService
