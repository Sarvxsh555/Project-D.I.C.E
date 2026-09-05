import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { Page } from '../types/api'
import type {
  DealSummary,
  DealDetail,
  CreateDealRequest,
  DealStatus,
} from '../types/deal'
import type { DiceDecision, SimulationResponse, PolicyViolation } from '../types/dice'

/** DealController.EvaluationSummary — the raw wire shape before policyResults
 *  (a JSON-serialized string) is parsed into PolicyViolation[]. */
interface EvaluationSummaryWire {
  id: string
  triggeredBy: string
  marginPercent: number | null
  discountPercent: number | null
  riskScore: number | null
  riskLevel: string | null
  healthScore: number | null
  outcome: string
  policyResults: string | null
  createdAt: string
}

function parseEvaluation(e: EvaluationSummaryWire): DiceDecision {
  let violations: PolicyViolation[] = []
  if (e.policyResults) {
    try {
      violations = JSON.parse(e.policyResults)
    } catch {
      violations = []
    }
  }
  return {
    id: e.id,
    triggeredBy: e.triggeredBy,
    marginPercent: e.marginPercent,
    discountPercent: e.discountPercent,
    riskScore: e.riskScore,
    riskLevel: e.riskLevel as DiceDecision['riskLevel'],
    healthScore: e.healthScore,
    outcome: e.outcome as DiceDecision['outcome'],
    violations,
    createdAt: e.createdAt,
  }
}

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

  /** No single-decision resource on the real API — the closest is
   *  GET /deals/{id}/evaluations (history, newest first). Returns the most
   *  recent evaluation as "the current decision", or null if the deal has
   *  never been evaluated. */
  getDecision: async (id: string): Promise<DiceDecision | null> => {
    const res = await api.get<EvaluationSummaryWire[]>(`/deals/${id}/evaluations`)
    return res.data.length > 0 ? parseEvaluation(res.data[0]) : null
  },

  /** Real endpoint: POST /deals/{id}/evaluate. Re-runs the engines and
   *  returns the updated deal; fetch the fresh decision separately. */
  evaluate: async (id: string): Promise<DiceDecision | null> => {
    await api.post(`/deals/${id}/evaluate`)
    return quotationService.getDecision(id)
  },

  /** Real endpoint: POST /negotiations/{dealId}/preview
   *  (NegotiationController.preview). Read-only — never changes the deal. */
  simulate: async (id: string, discountPercent: number): Promise<SimulationResponse> => {
    const res = await api.post<SimulationResponse>(`/negotiations/${id}/preview`, { discountPercent })
    return res.data
  },

  /** Real endpoint: POST /negotiations/{dealId}/accept — commits a
   *  previously-previewed discount. */
  acceptNegotiation: async (id: string, discountPercent: number): Promise<DealDetail> => {
    const res = await api.post<DealDetail>(`/negotiations/${id}/accept`, { discountPercent })
    return res.data
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
