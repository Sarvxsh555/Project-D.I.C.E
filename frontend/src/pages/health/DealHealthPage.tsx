import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { healthService } from '../../services/healthService'
import { AlertTriangle } from 'lucide-react'

export default function DealHealthPage() {
  const [summary, setSummary] = useState<{ healthyCount: number; atRiskCount: number; criticalCount: number } | null>(null)
  const [dealsList, setDealsList] = useState<any[]>([])
  const [anomaliesList, setAnomaliesList] = useState<any[]>([])
  const [period, setPeriod] = useState<'month' | 'quarter' | 'ytd'>('month')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadHealth() {
      try {
        const [sumRes, anomRes] = await Promise.all([
          healthService.getOverview(),
          healthService.listAnomalies(),
        ])
        if (active) {
          if (Array.isArray(sumRes)) {
            setDealsList(sumRes)
            setSummary({
              healthyCount: sumRes.filter((d: any) => d.riskLevel === 'LOW' || d.healthScore >= 75).length,
              atRiskCount: sumRes.filter((d: any) => d.riskLevel === 'MEDIUM' || (d.healthScore >= 50 && d.healthScore < 75)).length,
              criticalCount: sumRes.filter((d: any) => ['HIGH', 'CRITICAL'].includes(d.riskLevel) || d.healthScore < 50).length,
            })
          } else if (sumRes && typeof sumRes === 'object') {
            const overview = sumRes as any
            setSummary(overview)
            if (Array.isArray(overview.deals)) {
              setDealsList(overview.deals)
            }
          }
          if (Array.isArray(anomRes)) {
            setAnomaliesList(anomRes)
          }
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
    return <LoadingState message="Aggregating continuous deal health & anomaly stream..." rows={6} />
  }

  const attentionDeals = dealsList
    .filter((d) => {
      if (riskFilter === 'HEALTHY' && !(d.riskLevel === 'LOW' || d.healthScore >= 75)) return false
      if (riskFilter === 'AT_RISK' && !(d.riskLevel === 'MEDIUM' || (d.healthScore >= 50 && d.healthScore < 75))) return false
      if (riskFilter === 'CRITICAL' && !(['HIGH', 'CRITICAL'].includes(d.riskLevel) || d.healthScore < 50)) return false
      if (statusFilter === 'ACTIVE' && ['CANCELLED', 'CLOSED'].includes(d.status)) return false
      if (statusFilter === 'ESCALATED' && d.status !== 'APPROVAL_REQUIRED') return false
      return true
    })
    .map((d) => ({
      id: d.id || d.dealId,
      dealNumber: d.dealNumber,
      customerName: d.customerName,
      riskScore: d.healthScore ?? 75,
      margin: d.margin ? `${d.margin}%` : '20.0%',
      trend: d.trend === 'DETERIORATING' ? 'Margin slippage detected' : d.trend === 'IMPROVING' ? 'Discount within policy' : 'Standard monitoring',
      nextAction: d.status === 'APPROVAL_REQUIRED' ? 'Manager Approval Required' : d.status === 'NEGOTIATING' ? 'Review Counteroffer' : d.riskLevel === 'HIGH' ? 'Review Exception' : 'Active Pipeline',
      severity: d.riskLevel || 'LOW',
    }))

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Deal Health
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational pipeline health monitoring, risk deviations, and automated anomaly surveillance
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-300"
          >
            <option value="month">Period: This Month</option>
            <option value="quarter">Period: This Quarter</option>
            <option value="ytd">Period: YTD</option>
          </select>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-300"
          >
            <option value="ALL">All Sales Teams</option>
            <option value="COMM">Commercial Sales</option>
            <option value="ENT">Enterprise Accounts</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-300"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HEALTHY">Healthy Only</option>
            <option value="AT_RISK">At Risk</option>
            <option value="CRITICAL">Critical Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Deals</option>
            <option value="ESCALATED">Escalated</option>
          </select>
        </div>
      </div>

      {/* SUMMARY NUMBERS ROW */}
      <div className="grid grid-cols-3 border border-slate-200 bg-white rounded divide-x divide-slate-200">
        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 block">
            Healthy Deals
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
            {summary?.healthyCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Within margin & policy guardrails</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 block">
            At-Risk Deals
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {summary?.atRiskCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">SLA countdown or margin floor waiver</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-800 block">
            Critical Exceptions
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {summary?.criticalCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">DICE Risk Index &gt; 80</span>
        </div>
      </div>

      {/* SECTION 1: DEALS REQUIRING ATTENTION (REAL TABLE) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Deals Requiring Attention
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {attentionDeals.length} Action Items
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Quotation</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-24" align="right">Risk</TableHead>
              <TableHead className="w-24" align="right">Margin</TableHead>
              <TableHead>Trend / Trigger</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead className="w-24" align="right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attentionDeals.map((d) => (
              <TableRow key={d.dealNumber}>
                <TableCell>
                  <Link
                    to={`/quotations?id=${d.id}`}
                    className="font-mono font-semibold text-blue-600 hover:underline"
                  >
                    {d.dealNumber}
                  </Link>
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {d.customerName}
                </TableCell>
                <TableCell align="right">
                  <span className={`font-mono font-bold ${d.riskScore >= 80 ? 'text-rose-700' : 'text-amber-700'}`}>
                    {d.riskScore}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <span className="font-mono text-slate-900 font-medium">
                    {d.margin}
                  </span>
                </TableCell>
                <TableCell className="text-slate-700 text-xs">
                  {d.trend}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>{d.nextAction}</span>
                  </div>
                </TableCell>
                <TableCell align="right">
                  <Link to={`/quotations?id=${d.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      View Deal
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {attentionDeals.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-slate-500 py-6">
                  No deals matching the selected health criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* SECTION 2: ANOMALIES TABLE (REAL TABLE) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Detected Operational Anomalies
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Automated Audit Telemetry
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Quotation</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="w-28" align="right">Previous</TableHead>
              <TableHead className="w-28" align="right">Current</TableHead>
              <TableHead className="w-28">Severity</TableHead>
              <TableHead className="w-36">Detected</TableHead>
              <TableHead className="w-24" align="right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anomaliesList.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link
                    to={`/quotations?id=${a.dealId || a.id}`}
                    className="font-mono font-semibold text-blue-600 hover:underline"
                  >
                    {a.dealNumber}
                  </Link>
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {a.event || a.message}
                </TableCell>
                <TableCell align="right" className="font-mono text-slate-500">
                  {a.previous || '—'}
                </TableCell>
                <TableCell align="right" className="font-mono font-bold text-rose-700">
                  {a.current || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'danger' : 'warning'} size="sm">
                    {a.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 font-mono text-xs">
                  {a.detected || (a.detectedAt ? new Date(a.detectedAt).toLocaleDateString() : 'Live')}
                </TableCell>
                <TableCell align="right">
                  <Link to={`/quotations?id=${a.dealId || a.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      View Deal
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {anomaliesList.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-slate-500 py-6">
                  No active operational anomalies detected across live deals.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
