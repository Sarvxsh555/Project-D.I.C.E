import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type {
  NegotiationDetail,
  CounterofferPayload,
  PortalQuoteView,
  PreviewResponse,
} from '../types/negotiation'
import type { DealDetail } from '../types/deal'

export const negotiationService = {
  get: async (dealId: string): Promise<NegotiationDetail> => {
    return safeRequest(
      () => api.get<NegotiationDetail>(`/negotiations/${dealId}`),
      () => mockAdapter.getNegotiation(dealId)
    )
  },

  submitCounteroffer: async (
    dealId: string,
    payload: CounterofferPayload
  ): Promise<NegotiationDetail> => {
    return safeRequest(
      () => api.post<NegotiationDetail>(`/negotiations/${dealId}/counteroffer`, payload),
      () => mockAdapter.submitNegotiationCounteroffer(dealId, payload)
    )
  },

  reevaluate: async (dealId: string): Promise<NegotiationDetail> => {
    return safeRequest(
      () => api.post<NegotiationDetail>(`/negotiations/${dealId}/reevaluate`),
      () => mockAdapter.getNegotiation(dealId)
    )
  },

  preview: async (dealId: string, req: { discountPercent: number }): Promise<PreviewResponse> => {
    return safeRequest(
      () => api.post<PreviewResponse>(`/negotiations/${dealId}/preview`, req),
      async () => {
        const sim = await mockAdapter.simulateDeal(dealId, { discount: req.discountPercent })
        return {
          total: sim.simulated.total,
          margin: sim.simulated.margin,
          risk: sim.simulated.risk,
          approvalRequired: sim.simulated.approvalRequired,
          decision: sim.simulated.approvalRequired ? 'APPROVAL_REQUIRED' : 'AUTO_APPROVED',
          recommendation: sim.simulated.approvalRequired
            ? 'Discount requires management exception.'
            : 'Discount is within auto-approval limits.',
        }
      }
    )
  },

  accept: async (dealId: string, req: { discountPercent: number }): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/negotiations/${dealId}/accept`, req),
      async () => {
        const deal = await mockAdapter.getDeal(dealId)
        deal.totalDiscountPercent = req.discountPercent
        deal.status = 'APPROVED'
        return deal
      }
    )
  },
}

export const portalService = {
  getQuote: async (token: string): Promise<PortalQuoteView> => {
    return safeRequest(
      () => api.get<PortalQuoteView>(`/portal/quotes/${token}`),
      () => mockAdapter.getPortalQuote(token)
    )
  },

  accept: async (token: string): Promise<{ success: boolean; message: string }> => {
    return safeRequest(
      () => api.post<{ success: boolean; message: string }>(`/portal/quotes/${token}/accept`),
      () => mockAdapter.acceptPortalQuote(token)
    )
  },

  reject: async (token: string): Promise<{ success: boolean; message: string }> => {
    return safeRequest(
      () => api.post<{ success: boolean; message: string }>(`/portal/quotes/${token}/reject`),
      () => mockAdapter.rejectPortalQuote(token)
    )
  },

  counteroffer: async (token: string, payload: CounterofferPayload): Promise<PortalQuoteView> => {
    return safeRequest(
      () => api.post<PortalQuoteView>(`/portal/quotes/${token}/counteroffer`, payload),
      () => mockAdapter.counterofferPortalQuote(token, payload)
    )
  },
}

export default negotiationService
