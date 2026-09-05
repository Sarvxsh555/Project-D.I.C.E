import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { healthService, type HealthSummary, type AnomalyAlert } from '../../services/healthService'
import { dashboardService, type AtRiskDeal } from '../../services/dashboardService'

export default function DealHealthPage() {
  const [summary, setSummary] = useState<HealthSummary | null>(null)
  const [atRiskDeals, setAtRiskDeals] = useState<AtRiskDeal[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sumRes, riskRes, anomRes] = await Promise.all([
        healthService.getOverview(),
        dashboardService.getAtRiskDeals(),
        healthService.listAnomalies(),
      ])
      setSummary(sumRes)
      setAtRiskDeals(riskRes)
      setAnomalies(anomRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deal health')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [])

  if (loading) {
    return <LoadingState message="Aggregating deal health & anomaly stream..." rows={6} />
  }

  if (error || !summary) {
    return <ErrorState title="Deal Health Offline" message={error || 'Unable to load deal health'} onRetry={loadHealth} />
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Deal Health
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Live pipeline health monitoring and discount-anomaly surveillance
        </p>
      </div>

      {/* SUMMARY NUMBERS — computed from real per-deal healthScore */}
      <div className="grid grid-cols-3 border border-slate-200 bg-white rounded divide-x divide-slate-200">
        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 block">
            Healthy Deals
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
            {summary.healthyCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Health score ≥ 70</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 block">
            At-Risk Deals
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {summary.atRiskCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Health score 40–69</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-800 block">
            Critical Deals
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {summary.criticalCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Health score &lt; 40</span>
        </div>
      </div>

      {/* SECTION 1: DEALS REQUIRING ATTENTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Deals Requiring Attention
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {atRiskDeals.length} deals
          </span>
        </div>

        {atRiskDeals.length === 0 ? (
          <EmptyState title="No deals need attention" description="Every open deal is above the health-score attention threshold." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Quotation</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-24" align="right">Risk Score</TableHead>
                <TableHead className="w-24" align="right">Health Score</TableHead>
                <TableHead className="w-24" align="right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskDeals.map((d) => (
                <TableRow key={d.dealId}>
                  <TableCell>
                    <Link
                      to={`/quotations?id=${d.dealId}`}
                      className="font-mono font-bold text-[#5E2A52] hover:underline"
                    >
                      {d.dealNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {d.customerName}
                  </TableCell>
                  <TableCell align="right">
                    <span className={`font-mono font-bold ${(d.riskScore ?? 0) >= 60 ? 'text-rose-700' : 'text-amber-700'}`}>
                      {d.riskScore ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span className="font-mono text-slate-900 font-medium">
                      {d.healthScore ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <Link to={`/quotations?id=${d.dealId}`}>
                      <Button variant="outline" size="sm" className="text-xs px-2 py-1 border-slate-300 text-slate-700 hover:bg-slate-100">
                        View Deal
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* SECTION 2: ANOMALIES */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Detected Discount Anomalies
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {anomalies.length} unresolved
          </span>
        </div>

        {anomalies.length === 0 ? (
          <EmptyState title="No anomalies" description="No unresolved discount anomalies across the pipeline." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Quotation</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead className="w-28" align="right">Baseline</TableHead>
                <TableHead className="w-28" align="right">Current</TableHead>
                <TableHead className="w-28">Severity</TableHead>
                <TableHead className="w-36">Detected</TableHead>
                <TableHead className="w-24" align="right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anomalies.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link
                      to={`/quotations?id=${a.dealId}`}
                      className="font-mono font-bold text-[#5E2A52] hover:underline"
                    >
                      {a.dealNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {a.metric}
                  </TableCell>
                  <TableCell align="right" className="font-mono text-slate-500">
                    {a.baseline}
                  </TableCell>
                  <TableCell align="right" className="font-mono font-bold text-rose-700">
                    {a.currentValue}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'danger' : 'warning'} size="sm">
                      {a.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 font-mono text-xs">
                    {new Date(a.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Link to={`/quotations?id=${a.dealId}`}>
                      <Button variant="outline" size="sm" className="text-xs px-2 py-1 border-slate-300 text-slate-700 hover:bg-slate-100">
                        View Deal
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
