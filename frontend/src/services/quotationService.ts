import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { Page } from '../types/api'
import type {
  DealSummary,
  DealDetail,
  CreateDealRequest,
  DealStatus,
} from '../types/deal'
import type { DiceDecision, SimulationResponse } from '../types/dice'

/**
 * Routes below are corrected to match the real backend (DealController,
 * NegotiationController) — the original version called `/quotations/*`,
 * which doesn't exist; the real API is `/deals/*`.
 *
 * Not fixed in this pass, flagged as real follow-up work rather than
 * papered over: DealSummary/DealDetail here don't fully match the backend's
 * JSON shape (this UI models tax and ONE_TIME/RECURRING billing type, which
 * the backend has no concept of at all; `customerTier` here is capitalized
 * 'Gold' vs the backend's free-form uppercase string; DealStatus/RiskLevel
 * enum values differ - e.g. RiskLevel has 'MEDIUM' here vs the backend's
 * 'MODERATE'). Fields that do line up (id, dealNumber, customerName,
 * totalAmount, marginPercent, riskScore, riskLevel, status, currency) will
 * render correctly against the real API; the rest will come back undefined
 * rather than throw. submit/sendToCustomer/cancel/getDecision/simulate have
 * no real backend endpoint at all yet - calling them against the real API
 * will 404, which is the correct, honest failure mode (visible, not a
 * silent fake success) until those endpoints exist.
 */

export interface ListDealParams {
  status?: DealStatus
  search?: string
  page?: number
  size?: number
  sort?: string
}

export const quotationService = {
  list: async (params?: ListDealParams): Promise<Page<DealSummary>> => {
    return safeRequest(
      () => api.get<Page<DealSummary>>('/deals', { params }),
      () => mockAdapter.listDeals(params)
    )
  },

  get: async (id: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.get<DealDetail>(`/deals/${id}`),
      () => mockAdapter.getDeal(id)
    )
  },

  create: async (payload: CreateDealRequest): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>('/deals', payload),
      () => mockAdapter.createDeal(payload)
    )
  },

  /** No generic partial-update endpoint exists on the real API - only
   *  replaceLines / applyDiscount below. Left pointed at a real prefix so
   *  it 404s honestly rather than silently mocking, until/unless a real
   *  endpoint is added. */
  update: async (id: string, updates: Partial<DealDetail>): Promise<DealDetail> => {
    return safeRequest(
      () => api.patch<DealDetail>(`/deals/${id}`, updates),
      () => mockAdapter.updateDeal(id, updates)
    )
  },

  /** No real backend endpoint yet - see file header. */
  submit: async (id: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/deals/${id}/submit`),
      () => mockAdapter.submitDeal(id)
    )
  },

  /** No real backend endpoint yet - see file header. */
  sendToCustomer: async (id: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/deals/${id}/send`),
      () => mockAdapter.sendDealToCustomer(id)
    )
  },

  /** No real backend endpoint yet - see file header. */
  cancel: async (id: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/deals/${id}/cancel`),
      () => mockAdapter.cancelDeal(id)
    )
  },

  /** No real backend endpoint yet - the closest equivalent is
   *  GET /deals/{id}/evaluations (history), not a single "decision"
   *  resource, and it doesn't return this DiceDecision shape. See file header. */
  getDecision: async (id: string): Promise<DiceDecision> => {
    return safeRequest(
      () => api.get<DiceDecision>(`/deals/${id}/decision`),
      () => mockAdapter.getDecision(id)
    )
  },

  /** Real endpoint (POST /deals/{id}/evaluate), but it returns DealDetail,
   *  not DiceDecision - response shape not reconciled in this pass. */
  evaluate: async (id: string): Promise<DiceDecision> => {
    return safeRequest(
      () => api.post<DiceDecision>(`/deals/${id}/evaluate`),
      () => mockAdapter.getDecision(id)
    )
  },

  /** The real equivalent is POST /negotiations/{dealId}/preview
   *  (NegotiationController), with a different request/response shape -
   *  not rewired in this pass. See file header. */
  simulate: async (
    id: string,
    changes: { discount?: number; quantity?: number; paymentTerms?: string }
  ): Promise<SimulationResponse> => {
    return safeRequest(
      () => api.post<SimulationResponse>(`/deals/${id}/simulate`, { changes }),
      () => mockAdapter.simulateDeal(id, changes)
    )
  },

  applyDiscount: async (
    id: string,
    payload: { discountPercent: number } | number
  ): Promise<DealDetail> => {
    const discount = typeof payload === 'number' ? payload : payload.discountPercent
    return safeRequest(
      () => api.post<DealDetail>(`/deals/${id}/discount`, { discountPercent: discount }),
      async () => {
        return mockAdapter.updateDeal(id, { totalDiscountPercent: discount })
      }
    )
  },
}

export const dealsService = quotationService
export default quotationService
