import type { RiskLevel } from './deal'

export type DecisionOutcome = 'AUTO_APPROVE' | 'REQUIRE_APPROVAL' | 'BLOCK' | 'RECOMMEND_ALTERNATIVE' | 'REAPPROVAL_REQUIRED'

/** One policy breach — matches PolicyEngine.Violation, parsed out of
 *  Evaluation.policyResults (a JSON-serialized array on the backend). */
export interface PolicyViolation {
  policyCode: string
  policyName: string
  type: string
  severity: string
  requiredRole: string | null
  actualValue: number | null
  thresholdValue: number | null
  message: string
}

/** Matches DealController.EvaluationSummary exactly — the most recent entry
 *  from GET /deals/{id}/evaluations is "the current decision." There is no
 *  single-decision endpoint on the real API. */
export interface DiceDecision {
  id: string
  triggeredBy: string
  marginPercent: number | null
  discountPercent: number | null
  riskScore: number | null
  riskLevel: RiskLevel | null
  healthScore: number | null
  outcome: DecisionOutcome
  violations: PolicyViolation[]
  createdAt: string
}

/** Matches RecommendationEngine.Recommendation. */
export interface Recommendation {
  code: string
  title: string
  rationale: string
  estimatedValue: number | null
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
}

/** Matches NegotiationController.PreviewResponse exactly —
 *  POST /negotiations/{dealId}/preview. Never changes the deal. */
export interface SimulationResponse {
  proposedDiscountPercent: number
  currentTotal: number
  proposedTotal: number
  resultingMarginPercent: number
  outcome: string
  rationale: string
  maxAllowedDiscountPercent: number
  acceptable: boolean
  recommendations: Recommendation[]
}
