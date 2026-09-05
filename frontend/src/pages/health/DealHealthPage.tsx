import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../../components/ui/LoadingState'
import { AnomalyCard } from '../../components/domain/AnomalyCard'
import { healthService } from '../../services/healthService'
import type { HealthScoreBreakdown } from '../../types/health'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  ArrowRight,
} from 'lucide-react'

export default function DealHealthPage() {
  const [summary, setSummary] = useState<{ healthyCount: number; atRiskCount: number; criticalCount: number } | null>(null)
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [selectedBreakdown, setSelectedBreakdown] = useState<HealthScoreBreakdown | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadHealth() {
      try {
        const [sumRes, anomRes, brkRes] = await Promise.all([
          healthService.getOverview(),
          healthService.listAnomalies(),
          healthService.getHealthBreakdown('d-1042'),
        ])
        if (active) {
          setSummary(sumRes)
          setAnomalies(anomRes)
          setSelectedBreakdown(brkRes)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadHealth()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <LoadingState message="Aggregating continuous deal health & anomaly stream..." rows={5} />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Deal Health & Anomaly Surveillance
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Surfaces margin deterioration, discount slippage, and inventory bottlenecks in real time
        </p>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Healthy Deals */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 block mb-1">
              Healthy Deals
            </span>
            <div className="text-3xl font-bold text-emerald-700 font-mono">
              {summary?.healthyCount || 24}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Within standard guardrails</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* At-Risk Deals */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-amber-700 block mb-1">
              At-Risk Deals
            </span>
            <div className="text-3xl font-bold text-amber-700 font-mono">
              {summary?.atRiskCount || 11}
            </div>
            <span className="text-[11px] text-amber-700/80 mt-1 block">Margin or SLA violations</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Critical Deals */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-rose-700 block mb-1">
              Critical Deals
            </span>
            <div className="text-3xl font-bold text-rose-700 font-mono">
              {summary?.criticalCount || 4}
            </div>
            <span className="text-[11px] text-rose-700/80 mt-1 block">Immediate executive action</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Anomaly Feed & Health Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-[#5E2A52]" />
              Real-Time Anomaly Stream
            </h3>
            <span className="text-xs text-slate-400">Click card to open workspace</span>
          </div>

          <div className="space-y-3">
            {anomalies.map((anom) => (
              <AnomalyCard key={anom.id} anomaly={anom} />
            ))}
          </div>
        </div>

        {/* Selected Deal Diagnostic (Q-1042) */}
        {selectedBreakdown && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400">
                  Focus Deep-Dive Diagnostic
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedBreakdown.dealNumber} — {selectedBreakdown.customerName}
                </h3>
              </div>

              <Link
                to={`/quotations?id=${selectedBreakdown.dealId}`}
                className="text-xs font-semibold text-[#5E2A52] flex items-center gap-1 hover:underline"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Composite Score Ring Card */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#FAF5F9]/50 border border-[#E8D4E3]">
              <div>
                <span className="text-xs text-slate-600">Composite Deal Health</span>
                <div className="text-2xl font-bold text-amber-700 font-mono">
                  {selectedBreakdown.overallScore} / 100
                </div>
                <span className="text-[11px] text-amber-800 font-medium">
                  Status: High Risk Escalation
                </span>
              </div>

              <div className="text-right space-y-1 text-xs">
                <div>Margin Health: <strong className="text-rose-600">{selectedBreakdown.marginHealth}%</strong></div>
                <div>Customer Credit: <strong className="text-slate-800">{selectedBreakdown.customerHealth}%</strong></div>
                <div>Fulfillment Feasibility: <strong className="text-emerald-700">{selectedBreakdown.fulfillmentFeasibility}%</strong></div>
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-2">
                Identified Risk Factors
              </h4>
              <div className="space-y-2">
                {selectedBreakdown.riskFactors.map((rf) => (
                  <div
                    key={rf.id}
                    className="p-3 rounded-md bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{rf.name}</span>
                      <span className="text-rose-600 font-mono">{rf.scoreImpact} pts</span>
                    </div>
                    <p className="text-slate-600 mt-1">{rf.description}</p>
                    {rf.mitigationSuggestion && (
                      <p className="text-[#5E2A52] font-medium mt-1">
                        Mitigation: {rf.mitigationSuggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
