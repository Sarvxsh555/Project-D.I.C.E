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
      () => api.get<Page<DealSummary>>('/quotations', { params }),
      () => mockAdapter.listDeals(params)
    )
  },

  get: async (id: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.get<DealDetail>(`/quotations/${id}`),
      () => mockAdapter.getDeal(id)
    )
  },

  create: async (payload: CreateDealRequest): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>('/quotations', payload),
      () => mockAdapter.createDeal(payload)
    )
  },

  update: async (id: string, updates: Partial<DealDetail>): Promise<DealDetail> => {
    return safeRequest(
      () => api.patch<DealDetail>(`/quotations/${id}`, updates),
      () => mockAdapter.updateDeal(id, updates)
    )
  },

  submit: async (id: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/quotations/${id}/submit`),
      () => mockAdapter.submitDeal(id)
    )
  },

  sendToCustomer: async (id: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/quotations/${id}/send`),
      () => mockAdapter.sendDealToCustomer(id)
    )
  },

  cancel: async (id: string): Promise<DealDetail> => {
    return safeRequest(
      () => api.post<DealDetail>(`/quotations/${id}/cancel`),
      () => mockAdapter.cancelDeal(id)
    )
  },

  getDecision: async (id: string): Promise<DiceDecision> => {
    return safeRequest(
      () => api.get<DiceDecision>(`/deals/${id}/decision`),
      () => mockAdapter.getDecision(id)
    )
  },

  evaluate: async (id: string): Promise<DiceDecision> => {
    return safeRequest(
      () => api.post<DiceDecision>(`/deals/${id}/evaluate`),
      () => mockAdapter.getDecision(id)
    )
  },

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
      () => api.post<DealDetail>(`/quotations/${id}/apply-discount`, { discountPercent: discount }),
      async () => {
        return mockAdapter.updateDeal(id, { totalDiscountPercent: discount })
      }
    )
  },
}

export const dealsService = quotationService
export default quotationService
