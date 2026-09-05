import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { ApprovalView, DecisionRequest } from '../types/approval'

/**
 * approve/reject/escalate below already matched the real ApprovalController
 * exactly. list/getPending/get did not - the real API has no generic
 * "list all with a status filter" or "get by id" endpoint, only
 * GET /approvals/pending (queue for the caller's role) and
 * GET /approvals/deal/{dealId}. requestChanges has no backend endpoint at
 * all yet. Fixed getPending to hit the real endpoint since it's the primary
 * consumer (the approvals queue screen); left list/get/requestChanges
 * pointed at their original (nonexistent) paths so they 404 honestly
 * rather than silently mock, until real endpoints exist for them.
 */
export const approvalService = {
  list: async (status?: string): Promise<ApprovalView[]> => {
    return safeRequest(
      () => api.get<ApprovalView[]>('/approvals', { params: { status } }),
      () => mockAdapter.listApprovals(status)
    )
  },

  getPending: async (): Promise<ApprovalView[]> => {
    return safeRequest(
      () => api.get<ApprovalView[]>('/approvals/pending'),
      () => mockAdapter.listApprovals('PENDING')
    )
  },

  get: async (id: string): Promise<ApprovalView> => {
    return safeRequest(
      () => api.get<ApprovalView>(`/approvals/${id}`),
      () => mockAdapter.getApproval(id)
    )
  },

  approve: async (id: string, request?: DecisionRequest): Promise<ApprovalView> => {
    return safeRequest(
      () => api.post<ApprovalView>(`/approvals/${id}/approve`, { reason: request?.comment || 'Approved.' }),
      () => mockAdapter.approveApproval(id, request)
    )
  },

  reject: async (id: string, request?: DecisionRequest): Promise<ApprovalView> => {
    return safeRequest(
      () => api.post<ApprovalView>(`/approvals/${id}/reject`, { reason: request?.comment || 'Rejected.' }),
      () => mockAdapter.rejectApproval(id, request)
    )
  },

  /** Real endpoint is POST /approvals/{id}/return (ApprovalController.returnForRevision)
   *  — same "send back to the rep for revision" semantics, different name.
   *  Backend requires a non-blank `reason`, not the DecisionRequest shape
   *  every other action here uses. */
  requestChanges: async (id: string, request?: DecisionRequest): Promise<ApprovalView> => {
    const reason = request?.changesRequested || request?.requestedChanges || request?.comment || ''
    return safeRequest(
      () => api.post<ApprovalView>(`/approvals/${id}/return`, { reason }),
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
