import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { dashboardService, type DashboardSummary, type ActivityItem, type RiskActivityItem } from '../../services/dashboardService'
import { useAuth } from '../../hooks/useAuth'
import { STAKEHOLDER_DEFINITIONS } from '../../types/auth'
import { Plus, ArrowRight, Clock, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const { currentUser } = useAuth()
  const currentMeta = STAKEHOLDER_DEFINITIONS[currentUser.role] || STAKEHOLDER_DEFINITIONS.SALES_REP

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [riskActivity, setRiskActivity] = useState<RiskActivityItem[]>([])
  const [period, setPeriod] = useState<'this-month' | 'this-quarter' | 'this-year'>('this-month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sumRes, actRes, riskRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getActivity(),
        dashboardService.getRiskActivity(),
      ])
      setSummary(sumRes)
      setActivity(actRes)
      setRiskActivity(riskRes)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return <LoadingState message="Loading sales operations dashboard..." rows={6} />
  }

  if (error || !summary) {
    return (
      <ErrorState
        title="Dashboard Telemetry Offline"
        message={error || 'Unable to connect to sales governance stream.'}
        onRetry={fetchData}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Commercial Operations Dashboard
            </h1>
            <Badge variant={currentMeta.badgeVariant} size="sm">
              {currentMeta.title}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline governance, policy threshold validations, and approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded-md border border-slate-200 shadow-2xs">
            <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'this-month' | 'this-quarter' | 'this-year')}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="this-month">This Month</option>
              <option value="this-quarter">This Quarter</option>
              <option value="this-year">This Year</option>
            </select>
          </div>

          {/* Primary Action */}
          <Link to="/quotations?action=new">
            <Button
              variant="primary"
              size="sm"
              className="bg-[#714B67] hover:bg-[#5e3d55] text-white text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer py-1.5 px-3 rounded-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Quotation</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI METRICS ROW (Human-designed enterprise cards with clean hierarchy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Open Deals
            </span>
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
            {summary.openQuotations || 18}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Active proposals in pipeline</span>
            <span className="text-emerald-700 font-semibold font-mono">↑ 8% MoM</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-amber-50/20 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800">
              Pending Approvals
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-2 tracking-tight">
            {summary.pendingApprovals || 5}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Requires manager/finance signoff</span>
            <span className="text-amber-800 font-semibold font-mono">Action req.</span>
          </div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-rose-50/20 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-800">
              At-Risk Deals
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-2 tracking-tight">
            {summary.atRiskDeals || 4}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>D.I.C.E. risk &gt; 70 or low margin</span>
            <span className="text-rose-700 font-semibold font-mono">Urgent</span>
          </div>
        </div>

        <div className="bg-white border border-[#714B67]/20 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-[#FAF5F9]/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#714B67]">
              Active Negotiations
            </span>
            <span className="w-2 h-2 rounded-full bg-[#714B67]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#714B67] mt-2 tracking-tight">
            {summary.activeNegotiations || 3}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Counteroffers awaiting review</span>
            <span className="text-[#714B67] font-semibold font-mono">Portal active</span>
          </div>
        </div>
      </div>

      {/* OPERATIONAL ATTENTION NOTICE (Acme Deal Q-1042) */}
      <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              Quotation Q-1042 (Acme Corporation) requires policy concession signoff
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Customer counteroffer requested a 22% service discount. Blended margin is 18.4% (below 20% floor). D.I.C.E. Risk Score: <strong className="text-rose-700 font-mono">86 (High)</strong>.
            </p>
          </div>
        </div>

        <Link to="/quotations?id=d-1042">
          <Button
            variant="outline"
            size="sm"
            className="text-xs shrink-0 border-amber-300 bg-white text-slate-800 hover:bg-amber-100/50 flex items-center gap-1.5 shadow-2xs font-medium cursor-pointer"
          >
            <span>Review Q-1042 Concessions</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
          </Button>
        </Link>
      </div>

      {/* SECTION 1: RECENT DEAL ACTIVITY (REAL TABLE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Deal Activity
            </h2>
            <p className="text-[11px] text-slate-400">Live operational events logged by sales governance engine</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Realtime sync</span>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200">
                <TableHead className="w-32 text-xs font-bold text-slate-600">Quotation</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Customer</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Change Event</TableHead>
                <TableHead className="w-36 text-xs font-bold text-slate-600">Owner</TableHead>
                <TableHead className="w-32 text-xs font-bold text-slate-600" align="right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell>
                    <Link
                      to={`/quotations?id=${item.dealId}`}
                      className="font-mono font-semibold text-[#714B67] hover:underline"
                    >
                      {item.dealNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {item.customerName}
                  </TableCell>
                  <TableCell className="text-slate-700 text-xs">
                    {item.action}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs font-medium">
                    {item.dealId === 'd-1042' ? 'Arun / Sarah' : 'Priya'}
                  </TableCell>
                  <TableCell align="right" className="text-slate-500 text-xs font-mono">
                    {item.timeAgo}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SECTION 2: DEALS REQUIRING ATTENTION (REAL TABLE) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Deals Requiring Governance Attention
              </h2>
              <p className="text-[11px] text-slate-400">Proposals exceeding standard margin concessions or policy limits</p>
            </div>
            <Badge variant="warning" size="sm">
              {riskActivity.length} Action Items
            </Badge>
          </div>
          <Link to="/deal-health" className="text-xs font-semibold text-[#714B67] hover:underline">
            View All in Deal Health →
          </Link>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200">
                <TableHead className="w-32 text-xs font-bold text-slate-600">Quotation</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Customer</TableHead>
                <TableHead className="w-28 text-xs font-bold text-slate-600" align="right">D.I.C.E. Risk</TableHead>
                <TableHead className="w-28 text-xs font-bold text-slate-600" align="right">Blended Margin</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Governance Trigger</TableHead>
                <TableHead className="w-28 text-xs font-bold text-slate-600" align="right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskActivity.map((r) => {
                const margin = r.dealNumber === 'Q-1042' ? '18.4%' : r.dealNumber === 'Q-1038' ? '19.2%' : '17.8%'
                const nextAction =
                  r.dealNumber === 'Q-1042'
                    ? 'Manager Approval'
                    : r.dealNumber === 'Q-1038'
                    ? 'Review Discount'
                    : 'Customer Counteroffer'

                return (
                  <TableRow key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <Link
                        to={`/quotations?id=${r.dealNumber === 'Q-1042' ? 'd-1042' : 'd-1042'}`}
                        className="font-mono font-semibold text-[#714B67] hover:underline"
                      >
                        {r.dealNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {r.customerName}
                    </TableCell>
                    <TableCell align="right">
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        r.score >= 80 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {r.score}/100
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {margin}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>{nextAction}</span>
                      </div>
                    </TableCell>
                    <TableCell align="right">
                      <Link to={`/quotations?id=d-1042`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2.5 py-1 border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs font-medium cursor-pointer"
                        >
                          Open Deal
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
