import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { HealthScoreBreakdown } from '../types/health'

export interface HealthOverview {
  healthyCount: number
  atRiskCount: number
  criticalCount: number
  deals?: any[]
}

export const healthService = {
  getOverview: async (): Promise<HealthOverview | any[]> => {
    return safeRequest(
      () => api.get<HealthOverview | any[]>('/deals/health'),
      () => mockAdapter.getHealthOverview()
    )
  },

  listAnomalies: async () => {
    return safeRequest(
      () => api.get('/deals/anomalies'),
      () => mockAdapter.listAnomalies()
    )
  },

  getHealthBreakdown: async (dealId: string): Promise<HealthScoreBreakdown> => {
    return safeRequest(
      () => api.get<HealthScoreBreakdown>(`/deals/${dealId}/health`),
      () => mockAdapter.getHealthBreakdown(dealId)
    )
  },

  getAllHealthMetrics: async () => {
    return safeRequest(
      () => api.get('/deals/health/metrics'),
      async () => {
        const deals = await mockAdapter.listDeals()
        return deals.content.map((d) => ({
          dealId: d.id,
          dealNumber: d.dealNumber,
          customerName: d.customerName,
          healthScore: d.healthScore ?? 75,
          riskLevel: d.riskLevel,
        }))
      }
    )
  },
}

export default healthService
