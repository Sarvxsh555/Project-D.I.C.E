import { api } from './apiClient'

/** Matches DealHealthController.HealthView exactly — GET /deals/{id}/health. */
export interface DealHealthView {
  score: number
  band: 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'CRITICAL'
  status: 'HEALTHY' | 'AT_RISK' | 'CRITICAL'
  reasons: string[]
}

/** Matches AnomalyController.AnomalyAlertView (cross-deal feed). */
export interface AnomalyAlert {
  id: string
  dealId: string
  dealNumber: string
  customerName: string
  metric: string
  baseline: number
  currentValue: number
  ratio: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  reason: string | null
  resolved: boolean
  createdAt: string
}

export interface HealthSummary {
  healthyCount: number
  atRiskCount: number
  criticalCount: number
}

// Thresholds mirror the backend defaults (dice.health.healthy-threshold=70,
// at-risk-threshold=40 — DiceProperties). If those are ever reconfigured,
// this summary should be computed server-side instead of duplicated here.
const HEALTHY_THRESHOLD = 70
const AT_RISK_THRESHOLD = 40

export const healthService = {
  /** Computed client-side from real per-deal healthScore, since there is no
   *  backend endpoint that aggregates this across every deal. */
  getOverview: async (): Promise<HealthSummary> => {
    const res = await api.get<{ content: Array<{ healthScore: number | null }> }>('/deals', {
      params: { size: 500 },
    })
    const scores = res.data.content.map((d) => d.healthScore ?? 100)
    return {
      healthyCount: scores.filter((s) => s >= HEALTHY_THRESHOLD).length,
      atRiskCount: scores.filter((s) => s >= AT_RISK_THRESHOLD && s < HEALTHY_THRESHOLD).length,
      criticalCount: scores.filter((s) => s < AT_RISK_THRESHOLD).length,
    }
  },

  listAnomalies: async (): Promise<AnomalyAlert[]> => {
    const res = await api.get<AnomalyAlert[]>('/anomalies')
    return res.data
  },

  getHealth: async (dealId: string): Promise<DealHealthView> => {
    const res = await api.get<DealHealthView>(`/deals/${dealId}/health`)
    return res.data
  },
}

export default healthService
