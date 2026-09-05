import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { AuditEvent } from '../types/audit'

export const auditService = {
  getEvents: async (entityType: string, entityId: string): Promise<AuditEvent[]> => {
    return safeRequest(
      () => api.get<AuditEvent[]>(`/audit/${entityType}/${entityId}`),
      () => mockAdapter.getAuditEvents(entityId)
    )
  },
}

export default auditService
