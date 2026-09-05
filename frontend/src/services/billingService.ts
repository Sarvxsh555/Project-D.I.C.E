import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { BillingSchedule, Subscription, Invoice } from '../types/billing'
import type { DealDetail } from '../types/deal'

export const billingService = {
  get: async (dealId: string): Promise<BillingSchedule> => {
    return safeRequest(
      () => api.get<BillingSchedule>(`/billing/${dealId}`),
      () => mockAdapter.getBillingSchedule(dealId)
    )
  },

  getSchedule: async (dealId: string): Promise<BillingSchedule> => {
    return safeRequest(
      () => api.get<BillingSchedule>(`/billing/${dealId}/schedule`),
      () => mockAdapter.getBillingSchedule(dealId)
    )
  },

  listSubscriptions: async (): Promise<Subscription[]> => {
    return safeRequest(
      () => api.get<Subscription[]>('/subscriptions'),
      () => mockAdapter.listSubscriptions()
    )
  },

  pauseSubscription: async (id: string): Promise<Subscription> => {
    return safeRequest(
      () => api.post<Subscription>(`/subscriptions/${id}/pause`),
      () => mockAdapter.pauseSubscription(id)
    )
  },

  cancelSubscription: async (id: string): Promise<Subscription> => {
    return safeRequest(
      () => api.post<Subscription>(`/subscriptions/${id}/cancel`),
      () => mockAdapter.cancelSubscription(id)
    )
  },

  generateInvoice: async (dealId: string): Promise<Invoice> => {
    return safeRequest(
      () => api.post<Invoice>(`/billing/${dealId}/generate-invoice`),
      () => mockAdapter.generateInvoiceFromBilling(dealId)
    )
  },

  draft: async (dealId: string): Promise<BillingSchedule> => {
    return billingService.get(dealId)
  },

  markInvoiced: async (dealId: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/billing/${dealId}/invoiced`),
      async () => {
        const deal = await mockAdapter.getDeal(dealId)
        deal.status = 'INVOICED'
        return deal
      }
    )
  },

  markPaid: async (dealId: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/billing/${dealId}/paid`),
      async () => {
        const deal = await mockAdapter.getDeal(dealId)
        deal.status = 'PAID'
        return deal
      }
    )
  },
}

export const subscriptionService = {
  list: billingService.listSubscriptions,
  pause: billingService.pauseSubscription,
  cancel: billingService.cancelSubscription,
}

export default billingService
