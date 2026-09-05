import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ApprovalSnapshotView } from '../../components/domain/ApprovalSnapshotView'
import { approvalService } from '../../services/approvalService'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { ApprovalView } from '../../types/approval'
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react'

export default function ApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const approvalIdParam = searchParams.get('id')

  const [approvals, setApprovals] = useState<ApprovalView[]>([])
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detail View State
  const [selectedApproval, setSelectedApproval] = useState<ApprovalView | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionModal, setActionModal] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | null>(null)
  const [actionComment, setActionComment] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)

  const loadApprovals = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await approvalService.list(activeTab)
      setApprovals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApprovals()
  }, [activeTab])

  useEffect(() => {
    if (!approvalIdParam) {
      setSelectedApproval(null)
      return
    }

    let active = true
    async function loadDetail() {
      setDetailLoading(true)
      try {
        const item = await approvalService.get(approvalIdParam!)
        if (active) setSelectedApproval(item)
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    loadDetail()
    return () => {
      active = false
    }
  }, [approvalIdParam])

  const handleExecuteAction = async () => {
    if (!selectedApproval || !actionModal) return
    setActionSubmitting(true)
    try {
      let updated: ApprovalView
      if (actionModal === 'APPROVE') {
        updated = await approvalService.approve(selectedApproval.id, { comment: actionComment })
      } else if (actionModal === 'REJECT') {
        updated = await approvalService.reject(selectedApproval.id, { comment: actionComment })
      } else {
        updated = await approvalService.requestChanges(selectedApproval.id, { comment: actionComment })
      }
      setSelectedApproval(updated)
      setActionModal(null)
      setActionComment('')
      loadApprovals()
    } catch (err) {
      console.error(err)
    } finally {
      setActionSubmitting(false)
    }
  }

  // ==========================================
  // RENDER: APPROVAL DETAIL
  // ==========================================
  if (approvalIdParam) {
    if (detailLoading || !selectedApproval) {
      return <LoadingState message="Loading approval request dossier..." rows={5} />
    }

    const isPending = selectedApproval.status === 'PENDING'
    const isApproved = selectedApproval.status === 'APPROVED'

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchParams({})}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Approvals Queue
        </Button>

        {/* Approval Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Approval Request</span>
                <span>•</span>
                <span className="text-[#5E2A52] font-mono">{selectedApproval.policyCode}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                {selectedApproval.dealNumber} — {selectedApproval.customerName}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span>Requested by: <strong className="text-slate-800">{selectedApproval.requestedBy}</strong></span>
                <span>•</span>
                <span>Target Role: <strong className="text-slate-800">{selectedApproval.requiredRole}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-700 font-mono">
                  <Clock className="w-3 h-3" />
                  SLA Target: 8 Hours
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                  DICE Risk
                </span>
                <span className="text-xl font-bold text-amber-700 font-mono">
                  {selectedApproval.riskScore} HIGH
                </span>
              </div>

              <div className="text-right border-l border-slate-200 pl-4">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                  Blended Margin
                </span>
                <span className="text-xl font-bold text-rose-600 font-mono">
                  {formatPercent(selectedApproval.marginPercent)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Decision Controls (for Pending) */}
        {isPending ? (
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-medium">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                Managerial decision authority required for discount ceiling exception.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal('REQUEST_CHANGES')}
                className="text-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Request Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal('REJECT')}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActionModal('APPROVE')}
                className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve & Seal Snapshot
              </Button>
            </div>
          </div>
        ) : isApproved ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Approved by {selectedApproval.decidedBy || 'Priya Patel'}</span>
            </div>
            <span className="text-xs text-emerald-700 font-mono">
              {selectedApproval.decidedAt && new Date(selectedApproval.decidedAt).toLocaleString('en-IN')}
            </span>
          </div>
        ) : null}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Customer Proposed Discount
            </span>
            <span className="text-lg font-bold text-slate-900 font-mono">18.0%</span>
            <span className="text-[10px] text-rose-600 mt-1 block">Exceeds 10% ceiling</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Quotation Total
            </span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {formatCurrency(selectedApproval.totalAmount)}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Net commercial value</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Customer Tier
            </span>
            <span className="text-lg font-bold text-[#5E2A52]">Gold</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Eligible up to 15%</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Payment Terms
            </span>
            <span className="text-lg font-bold text-slate-900">Net 30</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Standard credit terms</span>
          </div>
        </div>

        {/* WHY APPROVAL? */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Why is this approval required?
          </h3>
          <ul className="space-y-2 text-xs text-slate-700 pl-2">
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">•</span>
              <span><strong>Customer discount: 18%</strong> requested on Premium Support line item.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">•</span>
              <span><strong>Service ceiling exceeded:</strong> Governance policy caps service line discounts at 10.0%.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">•</span>
              <span><strong>Margin below threshold:</strong> Blended deal margin of 18.4% is under corporate target floor of 20.0%.</span>
            </li>
          </ul>
        </div>

        {/* Immutable Snapshot if approved */}
        {selectedApproval.snapshot && (
          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3">
              Immutable Approval Snapshot
            </h3>
            <ApprovalSnapshotView snapshot={selectedApproval.snapshot} />
          </div>
        )}

        {/* Approval History Progression */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-4">
            Approval Progression History
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-500 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />

            <div className="relative z-10 flex flex-col items-center bg-white px-2">
              <div className="w-5 h-5 rounded-full bg-[#5E2A52] text-white flex items-center justify-center text-[10px] font-bold">
                1
              </div>
              <span className="font-semibold text-slate-900 mt-1">Created</span>
              <span className="text-[10px] text-slate-400">04 Sep 08:15</span>
            </div>

            <div className="relative z-10 flex flex-col items-center bg-white px-2">
              <div className="w-5 h-5 rounded-full bg-[#5E2A52] text-white flex items-center justify-center text-[10px] font-bold">
                2
              </div>
              <span className="font-semibold text-slate-900 mt-1">Evaluated</span>
              <span className="text-[10px] text-slate-400">05 Sep 08:30</span>
            </div>

            <div className="relative z-10 flex flex-col items-center bg-white px-2">
              <div className="w-5 h-5 rounded-full bg-[#5E2A52] text-white flex items-center justify-center text-[10px] font-bold">
                3
              </div>
              <span className="font-semibold text-slate-900 mt-1">Approval Requested</span>
              <span className="text-[10px] text-slate-400">05 Sep 08:31</span>
            </div>

            <div className="relative z-10 flex flex-col items-center bg-white px-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isApproved ? 'bg-[#5E2A52] text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                4
              </div>
              <span className="font-semibold text-slate-900 mt-1">
                {isApproved ? 'Approved' : 'Manager Review'}
              </span>
              <span className="text-[10px] text-slate-400">
                {isApproved ? 'Completed' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Confirmation Modal */}
        <Modal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          title={
            actionModal === 'APPROVE'
              ? 'Approve Quotation Exception'
              : actionModal === 'REJECT'
              ? 'Reject Quotation Exception'
              : 'Request Line Item Changes'
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              {actionModal === 'APPROVE'
                ? 'Approving creates an immutable governance snapshot for Q-1042.'
                : actionModal === 'REJECT'
                ? 'Rejecting will mark the quotation as rejected.'
                : 'Requesting changes will return the deal to draft with instructions.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Executive Justification / Reason:
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Enter mandatory governance note..."
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteAction}
                disabled={actionSubmitting}
                className={actionModal === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#5E2A52]'}
              >
                {actionSubmitting ? 'Processing...' : 'Confirm Decision'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ==========================================
  // RENDER: APPROVAL LIST
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Approval Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review margin thresholds, discount escalations, and commercial exceptions
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white shadow-xs text-[#5E2A52] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading approval requests..." rows={4} />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={loadApprovals} />
      ) : approvals.length === 0 ? (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} approvals`}
          description="All deal exceptions in this queue have been processed."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Quotation</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3 text-right">DICE Risk</th>
                <th className="py-3 px-3 text-right">Margin</th>
                <th className="py-3 px-5">Policy Exception Reason</th>
                <th className="py-3 px-3">Requested By</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvals.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#5E2A52]">
                    <button
                      onClick={() => setSearchParams({ id: app.id })}
                      className="hover:underline cursor-pointer text-left"
                    >
                      {app.dealNumber}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {app.customerName}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-700">
                    {app.riskScore}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold text-rose-600">
                    {formatPercent(app.marginPercent)}
                  </td>
                  <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate">
                    {app.reason}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500">{app.requestedBy}</td>
                  <td className="py-3.5 px-3">
                    <Badge
                      variant={
                        app.status === 'APPROVED'
                          ? 'success'
                          : app.status === 'PENDING'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {app.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchParams({ id: app.id })}
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
