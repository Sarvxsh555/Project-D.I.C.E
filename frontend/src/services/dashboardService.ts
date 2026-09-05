import { api } from './apiClient'

/** Matches DashboardController.Summary exactly — no invented fields. */
export interface DashboardSummary {
  totalDeals: number
  openPipelineValue: number
  dealsByStatus: Record<string, number>
  pendingApprovals: number
  overdueApprovals: number
  atRiskDeals: number
}

/** Matches DashboardController.ActivityItem. */
export interface ActivityItem {
  id: string
  dealId: string
  eventType: string
  actor: string
  occurredAt: string
}

/** Matches DashboardController.AtRiskDeal. */
export interface AtRiskDeal {
  dealId: string
  dealNumber: string
  customerName: string
  riskScore: number | null
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string
  healthScore: number | null
}

/** Matches DashboardController.QueueItem. */
export interface ApprovalQueueItem {
  approvalId: string
  dealNumber: string
  requiredRole: string
  requestedAt: string
  slaDueAt: string | null
  overdue: boolean
}

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await api.get<DashboardSummary>('/dashboard/summary')
    return res.data
  },

  getActivity: async (): Promise<ActivityItem[]> => {
    const res = await api.get<ActivityItem[]>('/dashboard/activity')
    return res.data
  },

  getAtRiskDeals: async (): Promise<AtRiskDeal[]> => {
    const res = await api.get<AtRiskDeal[]>('/dashboard/at-risk')
    return res.data
  },

  getApprovalQueue: async (): Promise<ApprovalQueueItem[]> => {
    const res = await api.get<ApprovalQueueItem[]>('/dashboard/approvals/queue')
    return res.data
  },
}

export default dashboardService
