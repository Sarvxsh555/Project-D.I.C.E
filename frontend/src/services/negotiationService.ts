import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type {
  NegotiationDetail,
  CounterofferPayload,
  PortalQuoteView,
} from '../types/negotiation'

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

  // Real preview/accept (POST /negotiations/{dealId}/preview|accept) live on
  // quotationService.simulate/acceptNegotiation, correctly typed against
  // NegotiationController.PreviewResponse — used by DiceSimulationDrawer.
  // Not duplicated here.
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
