import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { dashboardService, type DashboardSummary, type ActivityItem, type AtRiskDeal } from '../../services/dashboardService'
import { useAuth } from '../../hooks/useAuth'
import { STAKEHOLDER_DEFINITIONS } from '../../types/auth'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const { currentUser } = useAuth()
  const currentMeta = STAKEHOLDER_DEFINITIONS[currentUser.role] || STAKEHOLDER_DEFINITIONS.SALES_REP

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [atRiskDeals, setAtRiskDeals] = useState<AtRiskDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sumRes, actRes, riskRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getActivity(),
        dashboardService.getAtRiskDeals(),
      ])
      setSummary(sumRes)
      setActivity(actRes)
      setAtRiskDeals(riskRes)
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

      {/* KPI METRICS ROW — every value is straight from DashboardController.Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Total Deals
            </span>
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
            {summary.totalDeals}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Open pipeline value: {summary.openPipelineValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
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
            {summary.pendingApprovals}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.overdueApprovals > 0
              ? `${summary.overdueApprovals} overdue past SLA`
              : 'None overdue'}
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
            {summary.atRiskDeals}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Health score below attention threshold
          </div>
        </div>

        <div className="bg-white border border-[#714B67]/20 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-[#FAF5F9]/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#714B67]">
              Deal Status Mix
            </span>
            <span className="w-2 h-2 rounded-full bg-[#714B67]" />
          </div>
          <div className="mt-2 space-y-0.5">
            {Object.entries(summary.dealsByStatus).length === 0 ? (
              <span className="text-xs text-slate-400">No deals yet</span>
            ) : (
              Object.entries(summary.dealsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">{status.replaceAll('_', ' ')}</span>
                  <span className="font-mono font-semibold text-[#714B67]">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
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
          {activity.length === 0 ? (
            <EmptyState title="No activity yet" description="Audited events will appear here as deals move through the pipeline." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="text-xs font-bold text-slate-600">Event</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Actor</TableHead>
                  <TableHead className="w-40 text-xs font-bold text-slate-600" align="right">Timestamp</TableHead>
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
                        {item.eventType}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-700 text-xs">
                      {item.actor}
                    </TableCell>
                    <TableCell align="right" className="text-slate-500 text-xs font-mono">
                      {new Date(item.occurredAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* SECTION 2: DEALS REQUIRING ATTENTION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Deals Requiring Governance Attention
              </h2>
              <p className="text-[11px] text-slate-400">Deals whose D.I.C.E. health score has dropped below the attention threshold</p>
            </div>
            <Badge variant="warning" size="sm">
              {atRiskDeals.length} Action Items
            </Badge>
          </div>
          <Link to="/deal-health" className="text-xs font-semibold text-[#714B67] hover:underline">
            View All in Deal Health →
          </Link>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          {atRiskDeals.length === 0 ? (
            <EmptyState title="No at-risk deals" description="Every open deal is currently above the health-score attention threshold." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="w-32 text-xs font-bold text-slate-600">Quotation</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Customer</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-slate-600" align="right">D.I.C.E. Risk</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-slate-600" align="right">Health Score</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-slate-600" align="right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskDeals.map((r) => (
                  <TableRow key={r.dealId} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <Link
                        to={`/quotations?id=${r.dealId}`}
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
                        (r.riskScore ?? 0) >= 60 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {r.riskScore ?? '—'}{r.riskScore != null ? '/100' : ''}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {r.healthScore ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <Link to={`/quotations?id=${r.dealId}`}>
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
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
