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
  const [period, setPeriod] = useState<'month' | 'quarter' | 'ytd'>('month')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadHealth() {
      try {
        const sumRes = await healthService.getOverview()
        if (active) {
          setSummary(sumRes)
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

  const attentionDeals = [
    {
      dealNumber: 'Q-1042',
      id: 'd-1042',
      customerName: 'Acme Corporation',
      riskScore: 86,
      margin: '18.4%',
      trend: 'Discount increased to 22%',
      nextAction: 'Manager Approval Required',
      severity: 'HIGH',
    },
    {
      dealNumber: 'Q-1038',
      id: 'd-1042',
      customerName: 'Globex Logistics',
      riskScore: 78,
      margin: '19.2%',
      trend: 'SLA countdown < 2 hours remaining',
      nextAction: 'Review Concession Exception',
      severity: 'MEDIUM',
    },
    {
      dealNumber: 'Q-1032',
      id: 'd-1042',
      customerName: 'Wayne Enterprises',
      riskScore: 74,
      margin: '17.5%',
      trend: 'Credit limit 94% utilized',
      nextAction: 'Finance Credit Signoff',
      severity: 'MEDIUM',
    },
    {
      dealNumber: 'Q-1025',
      id: 'd-1042',
      customerName: 'Cyberdyne Systems',
      riskScore: 82,
      margin: '18.0%',
      trend: 'Customer counteroffer pending',
      nextAction: 'Accept or Adjust Terms',
      severity: 'HIGH',
    },
  ]

  const anomaliesList = [
    {
      id: 'anom-1',
      dealNumber: 'Q-1042',
      event: 'Discount Override',
      previous: '18.0%',
      current: '22.0%',
      severity: 'HIGH',
      detected: 'Today (12 min ago)',
    },
    {
      id: 'anom-2',
      dealNumber: 'Q-1042',
      event: 'Margin Slippage',
      previous: '21.2%',
      current: '18.4%',
      severity: 'HIGH',
      detected: 'Today (18 min ago)',
    },
    {
      id: 'anom-3',
      dealNumber: 'Q-1038',
      event: 'SLA Threshold Breach',
      previous: '4.0 hrs',
      current: '7.8 hrs',
      severity: 'MEDIUM',
      detected: 'Today (1 hr ago)',
    },
    {
      id: 'anom-4',
      dealNumber: 'Q-1032',
      event: 'Credit Exposure Limit',
      previous: '₹8,20,000',
      current: '₹9,40,000',
      severity: 'MEDIUM',
      detected: 'Yesterday',
    },
  ]

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
            className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          >
            <option value="month">Period: This Month</option>
            <option value="quarter">Period: This Quarter</option>
            <option value="ytd">Period: YTD</option>
          </select>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          >
            <option value="ALL">All Sales Teams</option>
            <option value="COMM">Commercial Sales</option>
            <option value="ENT">Enterprise Accounts</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HEALTHY">Healthy Only</option>
            <option value="AT_RISK">At Risk</option>
            <option value="CRITICAL">Critical Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Deals</option>
            <option value="ESCALATED">Escalated</option>
          </select>
        </div>
      </div>

      {/* SUMMARY NUMBERS ROW (Clean flat counters, NOT giant floating cards) */}
      <div className="grid grid-cols-3 border border-slate-200 bg-white rounded divide-x divide-slate-200">
        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 block">
            Healthy Deals
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
            {summary?.healthyCount || 24}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Within margin & policy guardrails</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 block">
            At-Risk Deals
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {summary?.atRiskCount || 11}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">SLA countdown or margin floor waiver</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-800 block">
            Critical Exceptions
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {summary?.criticalCount || 4}
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
                    className="font-mono font-bold text-[#5E2A52] hover:underline"
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
                    to="/quotations?id=d-1042"
                    className="font-mono font-bold text-[#5E2A52] hover:underline"
                  >
                    {a.dealNumber}
                  </Link>
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {a.event}
                </TableCell>
                <TableCell align="right" className="font-mono text-slate-500">
                  {a.previous}
                </TableCell>
                <TableCell align="right" className="font-mono font-bold text-rose-700">
                  {a.current}
                </TableCell>
                <TableCell>
                  <Badge variant={a.severity === 'HIGH' ? 'danger' : 'warning'} size="sm">
                    {a.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 font-mono text-xs">
                  {a.detected}
                </TableCell>
                <TableCell align="right">
                  <Link to="/quotations?id=d-1042">
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
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
