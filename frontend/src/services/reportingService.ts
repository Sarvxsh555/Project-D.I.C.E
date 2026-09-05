import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'

export interface PipelineMetrics {
  totalPipelineValue: number
  weightedValue: number
  averageMarginPercent: number
  conversionRatePercent: number
}

export const reportingService = {
  getSummary: async () => {
    return safeRequest(
      () => api.get('/reports/summary'),
      () => mockAdapter.getReportsSummary()
    )
  },

  getPipelineMetrics: async (): Promise<PipelineMetrics> => {
    return safeRequest(
      () => api.get<PipelineMetrics>('/reports/deals'),
      async () => {
        const deals = await mockAdapter.listDeals()
        const total = deals.content.reduce((acc, curr) => acc + curr.totalAmount, 0)
        const avgMargin =
          deals.content.reduce((acc, curr) => acc + curr.marginPercent, 0) / (deals.content.length || 1)
        return {
          totalPipelineValue: total,
          weightedValue: total * 0.72,
          averageMarginPercent: parseFloat(avgMargin.toFixed(1)),
          conversionRatePercent: 68.4,
        }
      }
    )
  },
}

export default reportingService
