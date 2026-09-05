import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { ApprovalView } from '../types/approval'

export interface DashboardSummary {
  openQuotations: number
  pendingApprovals: number
  atRiskDeals: number
  activeNegotiations: number
  totalPipelineValue: number
  totalDeals?: number
  openPipelineValue?: number
  dealsByStatus?: Record<string, number>
  overdueApprovals?: number
}

export interface ActivityItem {
  id: string
  dealNumber: string
  dealId: string
  customerName: string
  action: string
  severity: string
  timeAgo: string
  eventType?: string
  actor?: string
  occurredAt?: string
}

export interface RiskActivityItem {
  id: string
  dealNumber: string
  customerName: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string
  score: number
  trend: 'UP' | 'DOWN' | 'STABLE' | string
}

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    return safeRequest(
      () => api.get<DashboardSummary>('/dashboard/summary'),
      async () => {
        const base = await mockAdapter.getDashboardSummary()
        return {
          ...base,
          totalDeals: base.openQuotations,
          openPipelineValue: base.totalPipelineValue,
          dealsByStatus: {
            DRAFT: 1,
            SUBMITTED: 1,
            APPROVAL_REQUIRED: 2,
            APPROVED: 1,
            CONFIRMED: 1,
          },
          overdueApprovals: 1,
        }
      }
    )
  },

  getActivity: async (): Promise<ActivityItem[]> => {
    return safeRequest(
      () => api.get<ActivityItem[]>('/dashboard/activity'),
      () => mockAdapter.getRecentActivity()
    )
  },

  getRiskActivity: async (): Promise<RiskActivityItem[]> => {
    return safeRequest(
      () => api.get<RiskActivityItem[]>('/dashboard/risk-activity'),
      () => mockAdapter.getRiskActivity()
    )
  },

  getApprovalQueue: async (): Promise<ApprovalView[]> => {
    return safeRequest(
      () => api.get<ApprovalView[]>('/dashboard/approval-queue'),
      () => mockAdapter.listApprovals('PENDING')
    )
  },
}

export default dashboardService
