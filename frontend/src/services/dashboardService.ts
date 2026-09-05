import { api, safeRequest } from './apiClient'
import type { ApprovalView } from '../types/approval'
import type { Role } from '../types/auth'

export interface DashboardSummary {
  openQuotations: number
  pendingApprovals: number
  atRiskDeals: number
  activeNegotiations: number
  totalPipelineValue: number
  totalDeals: number
  openPipelineValue: number
  dealsByStatus: Record<string, number>
  overdueApprovals: number
  blendedMargin?: number
  fulfillingOrders?: number
  customersCount?: number
  warehousesCount?: number
  totalInventoryUnits?: number
  reservedInventoryUnits?: number
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
  dealId?: string
  dealNumber: string
  customerName: string
  riskLevel: 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string
  score: number
  trend: 'UP' | 'DOWN' | 'STABLE' | string
  margin?: number
  status?: string
}

export const dashboardService = {
  getSummary: async (role?: Role): Promise<DashboardSummary> => {
    return safeRequest(
      () => api.get<DashboardSummary>('/dashboard/summary', { params: role ? { role } : undefined }),
      async () => {
        // Honest zeroed fallback if backend connection drops - never dummy placeholder numbers
        return {
          openQuotations: 0,
          pendingApprovals: 0,
          atRiskDeals: 0,
          activeNegotiations: 0,
          totalPipelineValue: 0,
          totalDeals: 0,
          openPipelineValue: 0,
          dealsByStatus: {},
          overdueApprovals: 0,
          blendedMargin: 0,
          fulfillingOrders: 0,
          customersCount: 0,
          warehousesCount: 0,
          totalInventoryUnits: 0,
          reservedInventoryUnits: 0,
        }
      }
    )
  },

  getActivity: async (): Promise<ActivityItem[]> => {
    return safeRequest(
      () => api.get<ActivityItem[]>('/dashboard/activity'),
      async () => []
    )
  },

  getRiskActivity: async (): Promise<RiskActivityItem[]> => {
    return safeRequest(
      () => api.get<RiskActivityItem[]>('/dashboard/risk-activity'),
      async () => []
    )
  },

  getApprovalQueue: async (): Promise<ApprovalView[]> => {
    return safeRequest(
      () => api.get<ApprovalView[]>('/dashboard/approval-queue'),
      async () => []
    )
  },
}

export default dashboardService
