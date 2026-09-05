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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sales Dashboard
            </h1>
            <Badge variant={currentMeta.badgeVariant} size="sm">
              {currentMeta.title}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational pipeline governance, pending approvals, and deal risk monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'this-month' | 'this-quarter' | 'this-year')}
              className="px-2 py-1 border border-slate-200 rounded bg-white text-xs text-slate-800 focus:outline-none focus:border-[#5E2A52]"
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
              className="bg-[#5E2A52] hover:bg-[#4B2141] text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Quotation</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI METRICS ROW (Clean numbers, NOT giant floating cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-200 bg-white rounded divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block">
            Open Deals
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {summary.openQuotations || 18}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Active commercial proposals</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-700 block">
            Pending Approvals
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {summary.pendingApprovals || 5}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Requires manager signoff</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-700 block">
            At-Risk Deals
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {summary.atRiskDeals || 4}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">DICE score &gt; 70 or low margin</span>
        </div>

        <div className="p-3.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#5E2A52] block">
            Active Negotiations
          </span>
          <div className="text-2xl font-bold font-mono text-[#5E2A52] mt-1">
            {summary.activeNegotiations || 3}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Counteroffers pending response</span>
        </div>
      </div>

      {/* OPERATIONAL ATTENTION NOTICE (Acme Deal Q-1042) */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5">
            <Clock className="w-3 h-3" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              Quotation Q-1042 (Acme Corporation) requires manager approval
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Customer counteroffer requested a 22% service discount. Blended margin is 18.4% (below 20% floor). DICE Risk Score: <strong>86 (High)</strong>.
            </p>
          </div>
        </div>

        <Link to="/quotations?id=d-1042">
          <Button
            variant="outline"
            size="sm"
            className="text-xs shrink-0 border-slate-300 text-slate-800 hover:bg-slate-100 flex items-center gap-1.5"
          >
            <span>Open Q-1042 Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </Button>
        </Link>
      </div>

      {/* SECTION 1: RECENT DEAL ACTIVITY (REAL TABLE) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Recent Deal Activity
          </h2>
          <span className="text-xs text-slate-400">Live operational events</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Quotation</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="w-36">Owner</TableHead>
              <TableHead className="w-32" align="right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activity.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    to={`/quotations?id=${item.dealId}`}
                    className="font-mono font-semibold text-[#5E2A52] hover:underline"
                  >
                    {item.dealNumber}
                  </Link>
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {item.customerName}
                </TableCell>
                <TableCell className="text-slate-700">
                  {item.action}
                </TableCell>
                <TableCell className="text-slate-600">
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

      {/* SECTION 2: DEALS REQUIRING ATTENTION (REAL TABLE) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Deals Requiring Attention
            </h2>
            <Badge variant="warning" size="sm">
              {riskActivity.length} Action Items
            </Badge>
          </div>
          <Link to="/deal-health" className="text-xs font-semibold text-[#5E2A52] hover:underline">
            View All in Deal Health
          </Link>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Quotation</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-24" align="right">Risk</TableHead>
              <TableHead className="w-24" align="right">Margin</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead className="w-28" align="right">Action</TableHead>
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
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      to={`/quotations?id=${r.dealNumber === 'Q-1042' ? 'd-1042' : 'd-1042'}`}
                      className="font-mono font-semibold text-[#5E2A52] hover:underline"
                    >
                      {r.dealNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {r.customerName}
                  </TableCell>
                  <TableCell align="right">
                    <span className={`font-mono font-bold ${r.score >= 80 ? 'text-rose-700' : 'text-amber-700'}`}>
                      {r.score}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span className="font-mono text-slate-800">
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
                        className="text-xs px-2 py-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        Open
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
  )
}
