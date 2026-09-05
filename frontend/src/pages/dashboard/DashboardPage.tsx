import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { dashboardService, type DashboardSummary, type ActivityItem, type RiskActivityItem } from '../../services/dashboardService'
import {
  FileText,
  Clock,
  AlertTriangle,
  MessageSquare,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [riskActivity, setRiskActivity] = useState<RiskActivityItem[]>([])
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
    return <LoadingState message="Aggregating sales operations command center..." rows={5} />
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time quotation governance, DICE risk indicators, and deal orchestration
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Link to="/quotations">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-slate-700"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              All Quotations
            </Button>
          </Link>

          <Link to="/approvals">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              View Approvals
              {summary.pendingApprovals > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center ml-0.5">
                  {summary.pendingApprovals}
                </span>
              )}
            </Button>
          </Link>

          <Link to="/quotations?action=new">
            <Button
              variant="primary"
              size="sm"
              className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* Top KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Quotations */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Open Quotations
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {summary.openQuotations || 18}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active pipeline proposals</span>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold text-amber-700">
              Pending Approvals
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">
            {summary.pendingApprovals || 5}
          </div>
          <span className="text-[11px] text-amber-700/80 mt-1 block">Requires manager signoff</span>
        </div>

        {/* At-Risk Deals */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold text-rose-700">
              At-Risk Deals
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2 font-mono">
            {summary.atRiskDeals || 4}
          </div>
          <span className="text-[11px] text-rose-700/80 mt-1 block">DICE score &gt; 70 or margin drop</span>
        </div>

        {/* Active Negotiations */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold text-purple-700">
              Active Negotiations
            </span>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-[#5E2A52] mt-2 font-mono">
            {summary.activeNegotiations || 3}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Customer counteroffers pending</span>
        </div>
      </div>

      {/* Action / Attention Prompt Banner */}
      <div className="bg-[#FAF5F9] border border-[#E8D4E3] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#5E2A52] text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#5E2A52]">
              What needs your immediate attention?
            </div>
            <p className="text-xs text-slate-700 mt-0.5">
              Quotation <strong>Q-1042 (Acme Corporation)</strong> received a customer counteroffer (22% discount). Deal risk increased to <strong>84 HIGH</strong>.
            </p>
          </div>
        </div>

        <Link to="/quotations?id=d-1042">
          <Button
            variant="primary"
            size="sm"
            className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5 shrink-0"
          >
            Open Q-1042 Workspace
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Split Section: Recent Activity & Risk Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700">
              Recent Deal Activity
            </h3>
            <span className="text-[11px] text-slate-400">Live operational events</span>
          </div>

          <div className="divide-y divide-slate-100">
            {activity.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-md transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/quotations?id=${item.dealId}`}
                      className="font-bold text-xs text-[#5E2A52] hover:underline"
                    >
                      {item.dealNumber}
                    </Link>
                    <span className="text-xs font-medium text-slate-800">
                      {item.customerName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{item.action}</div>
                </div>

                <div className="text-right shrink-0">
                  <Badge
                    variant={
                      item.severity === 'HIGH'
                        ? 'danger'
                        : item.severity === 'MEDIUM'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {item.severity}
                  </Badge>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {item.timeAgo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Activity */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              DICE Deal Risk Telemetry
            </h3>
            <span className="text-[11px] text-slate-400">Automated Risk Scoring</span>
          </div>

          <div className="divide-y divide-slate-100">
            {riskActivity.map((r) => (
              <div
                key={r.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-md transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/quotations?id=d-1042"
                      className="font-bold text-xs text-[#5E2A52] hover:underline"
                    >
                      {r.dealNumber}
                    </Link>
                    <span className="text-xs font-medium text-slate-800">
                      {r.customerName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    DICE Risk Index: <strong className="font-mono text-slate-800">{r.score} / 100</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL'
                        ? 'danger'
                        : r.riskLevel === 'MEDIUM'
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {r.riskLevel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
