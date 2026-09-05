import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { DiscountRule, Policy } from '../types/product'

export const discountRuleService = {
  list: async (): Promise<DiscountRule[]> => {
    return safeRequest(
      () => api.get<DiscountRule[]>('/discount-rules'),
      () => mockAdapter.listDiscountRules()
    )
  },

  create: async (rule: Omit<DiscountRule, 'id'>): Promise<DiscountRule> => {
    return safeRequest(
      () => api.post<DiscountRule>('/discount-rules', rule),
      () => mockAdapter.createDiscountRule(rule)
    )
  },

  update: async (id: string, updates: Partial<DiscountRule>): Promise<DiscountRule> => {
    return safeRequest(
      () => api.patch<DiscountRule>(`/discount-rules/${id}`, updates),
      () => mockAdapter.updateDiscountRule(id, updates)
    )
  },

  delete: async (id: string): Promise<void> => {
    return safeRequest(
      () => api.delete<void>(`/discount-rules/${id}`),
      () => mockAdapter.deleteDiscountRule(id)
    )
  },
}

export const ruleService = {
  listPolicies: async (): Promise<Policy[]> => {
    return safeRequest(
      () => api.get<Policy[]>('/policies'),
      () => mockAdapter.listPolicies()
    )
  },

  updatePolicy: async (id: string, updates: Partial<Policy>): Promise<Policy> => {
    return safeRequest(
      () => api.put<Policy>(`/policies/${id}`, updates),
      async () => {
        const list = await mockAdapter.listPolicies()
        const pol = list.find((p) => p.id === id)
        if (!pol) throw new Error(`Policy ${id} not found`)
        Object.assign(pol, updates)
        return pol
      }
    )
  },
}

export default discountRuleService
