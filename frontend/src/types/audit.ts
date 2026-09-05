export interface AuditEvent {
  id: string
  entityType?: 'DEAL' | 'APPROVAL' | 'FULFILLMENT' | 'BILLING' | 'INVOICE' | string
  entityId?: string
  action: string
  actor: string
  actorRole?: string
  timestamp: string
  previousValue?: string
  newValue?: string
  reason?: string
}

