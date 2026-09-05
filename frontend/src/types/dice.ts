import type { RiskLevel } from './deal'

export interface DiceDecision {
  dealId: string
  decision: 'APPROVAL_REQUIRED' | 'AUTO_APPROVED' | 'REJECTED'
  riskScore: number // 0 - 100
  riskLevel: RiskLevel
  marginPercent: number
  policyViolations: string[]
  factors: string[]
  recommendation: string
  autoApproveCondition: string
  evaluatedAt: string
}

export interface SimulationInput {
  discount: number
  quantity: number
  paymentTerms: string
  products?: string[]
}

export interface SimulationMetricState {
  total: number
  margin: number
  risk: number
  approvalRequired: boolean
}

export interface SimulationResponse {
  current: SimulationMetricState
  simulated: SimulationMetricState
  changedFactors: string[]
  recommendation: string
}
