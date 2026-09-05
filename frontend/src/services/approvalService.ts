import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { ApprovalView, DecisionRequest } from '../types/approval'

export const approvalService = {
  list: async (status?: string): Promise<ApprovalView[]> => {
    return safeRequest(
      () => api.get<ApprovalView[]>('/approvals', { params: { status } }),
      () => mockAdapter.listApprovals(status)
    )
  },

  getPending: async (): Promise<ApprovalView[]> => {
    return approvalService.list('PENDING')
  },

  get: async (id: string): Promise<ApprovalView> => {
    return safeRequest(
      () => api.get<ApprovalView>(`/approvals/${id}`),
      () => mockAdapter.getApproval(id)
    )
  },

  approve: async (id: string, request?: DecisionRequest): Promise<ApprovalView> => {
    return safeRequest(
      () => api.post<ApprovalView>(`/approvals/${id}/approve`, request),
      () => mockAdapter.approveApproval(id, request)
    )
  },

  reject: async (id: string, request?: DecisionRequest): Promise<ApprovalView> => {
    return safeRequest(
      () => api.post<ApprovalView>(`/approvals/${id}/reject`, request),
      () => mockAdapter.rejectApproval(id, request)
    )
  },

  requestChanges: async (id: string, request?: DecisionRequest): Promise<ApprovalView> => {
    return safeRequest(
      () => api.post<ApprovalView>(`/approvals/${id}/request-changes`, request),
      () => mockAdapter.requestChangesApproval(id, request)
    )
  },

  escalate: async (id: string, request?: DecisionRequest): Promise<ApprovalView> => {
    return safeRequest(
      () => api.post<ApprovalView>(`/approvals/${id}/escalate`, request),
      () => mockAdapter.escalateApproval(id, request)
    )
  },
}

export default approvalService
