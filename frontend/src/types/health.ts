import type { RiskLevel } from './deal'

export interface RiskFactor {
  id: string
  name: string
  scoreImpact: number
  description: string
  mitigationSuggestion?: string
}

export interface HealthScoreBreakdown {
  dealId: string
  dealNumber: string
  customerName: string
  overallScore: number // 0 - 100
  riskLevel: RiskLevel
  marginHealth: number // 0 - 100
  customerHealth: number // 0 - 100
  policyCompliance: number // 0 - 100
  fulfillmentFeasibility: number // 0 - 100
  riskFactors: RiskFactor[]
  recommendations: string[]
}
