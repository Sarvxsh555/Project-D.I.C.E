import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { ApprovalSnapshotView } from '../../components/domain/ApprovalSnapshotView'
import { approvalService } from '../../services/approvalService'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { ApprovalView } from '../../types/approval'
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
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
  // RENDER: APPROVAL DETAIL (UNDER 10 SECONDS TO DECIDE)
  // ==========================================
  if (approvalIdParam) {
    if (detailLoading || !selectedApproval) {
      return <LoadingState message="Loading approval request record..." rows={6} />
    }

    const isPending = selectedApproval.status === 'PENDING'
    const isApproved = selectedApproval.status === 'APPROVED'

    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchParams({})}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Approval Queue</span>
        </Button>

        {/* Header Record */}
        <div className="bg-white border border-slate-200 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-semibold text-slate-400">
                Governance Policy Exception
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                {selectedApproval.policyCode || 'POL-DISC-002'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {selectedApproval.dealNumber} — {selectedApproval.customerName}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>Requested by: <strong className="text-slate-800">{selectedApproval.requestedBy}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-700 font-mono">
                <Clock className="w-3 h-3" />
                SLA Target: 8 Hours
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                DICE Risk
              </span>
              <span className="text-xl font-bold font-mono text-amber-700">
                {selectedApproval.riskScore} High
              </span>
            </div>
            <div className="text-right border-l border-slate-200 pl-4">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Blended Margin
              </span>
              <span className="text-xl font-bold font-mono text-rose-700">
                {formatPercent(selectedApproval.marginPercent)}
              </span>
            </div>
          </div>
        </div>

        {/* 10-Second Manager Decision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Decision Summary & Violations */}
          <div className="bg-white border border-slate-200 rounded p-4 space-y-3 text-xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-800 block">
              1. Policy Violations & Reason for Escalation
            </span>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>{selectedApproval.reason || 'Service line item discount exceeds default tier ceiling.'}</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Requested discount: <strong>18.0%</strong> (Policy Ceiling: <strong>10.0%</strong>). Margin drops to <strong>18.4%</strong> (Floor: <strong>20.0%</strong>).
              </p>
            </div>

            <div className="space-y-1 text-slate-700">
              <span className="font-semibold block text-slate-800">DICE Recommendation:</span>
              <p className="text-slate-600">
                Counter-offer with 10% service discount and 6-month commitment to restore margin to 22.4%.
              </p>
            </div>
          </div>

          {/* Deal Financials */}
          <div className="bg-white border border-slate-200 rounded p-4 space-y-3 text-xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-800 block">
              2. Deal Financial Exposure
            </span>
            <div className="space-y-2 text-slate-700 divide-y divide-slate-100">
              <div className="flex justify-between py-1">
                <span>Total Quotation Value:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedApproval.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Total Cost of Delivery:</span>
                <span className="font-mono text-slate-600">{formatCurrency(selectedApproval.totalAmount * 0.816)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Account Credit Terms:</span>
                <span className="font-mono text-slate-900">Net-30 Days</span>
              </div>
              <div className="flex justify-between py-1 text-rose-700 font-semibold">
                <span>Margin Variance from Floor:</span>
                <span className="font-mono">- 1.6% below standard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Manager Decision Actions Bar */}
        {isPending ? (
          <div className="p-3 bg-white border border-slate-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-600">
              Select an action to record managerial governance in audit history:
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal('REQUEST_CHANGES')}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Request Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal('REJECT')}
                className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActionModal('APPROVE')}
                className="text-xs bg-[#5E2A52] hover:bg-[#4B2141] flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve Exception
              </Button>
            </div>
          </div>
        ) : isApproved ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Approved by {selectedApproval.decidedBy || 'Sales Manager'}
            </span>
            <span className="font-mono text-emerald-700">
              {selectedApproval.decidedAt && new Date(selectedApproval.decidedAt).toLocaleString('en-IN')}
            </span>
          </div>
        ) : null}

        {/* Approval History / Snapshot */}
        {selectedApproval.snapshot && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-800">
              Authorized Approval Snapshot & Audit
            </h3>
            <ApprovalSnapshotView snapshot={selectedApproval.snapshot} />
          </div>
        )}

        {/* Action Confirmation Modal */}
        {actionModal && (
          <Modal
            isOpen={!!actionModal}
            onClose={() => setActionModal(null)}
            title={
              actionModal === 'APPROVE'
                ? 'Confirm Exception Approval'
                : actionModal === 'REJECT'
                ? 'Reject Quotation Proposal'
                : 'Request Margin Modifications'
            }
          >
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Please document reasoning for audit compliance on Quotation {selectedApproval.dealNumber}.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Manager Governance Notes:
                </label>
                <textarea
                  rows={3}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="e.g. Approved based on multi-year strategic account expansion."
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#5E2A52]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={actionSubmitting}
                  onClick={handleExecuteAction}
                  className="bg-[#5E2A52] hover:bg-[#4B2141]"
                >
                  {actionSubmitting ? 'Submitting...' : 'Confirm Decision'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    )
  }

  // ==========================================
  // RENDER: APPROVAL WORK QUEUE (TABLE-FIRST)
  // ==========================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Approval Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational sign-off queue for discount exceptions, margin waivers, and policy reviews
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'PENDING' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-600'
            }`}
          >
            Pending ({approvals.filter((a) => a.status === 'PENDING').length || 5})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'APPROVED' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-600'
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'REJECTED' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-600'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading approval work queue..." rows={6} />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={loadApprovals} />
      ) : approvals.length === 0 ? (
        <EmptyState
          title="Approval Queue Clear"
          description="There are currently no items matching this filter."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Quotation</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-32" align="right">Amount</TableHead>
              <TableHead className="w-24" align="right">Discount</TableHead>
              <TableHead className="w-24" align="right">Margin</TableHead>
              <TableHead className="w-20" align="right">Risk</TableHead>
              <TableHead className="w-32">Requested By</TableHead>
              <TableHead className="w-32">SLA Countdown</TableHead>
              <TableHead className="w-24" align="right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ id: app.id })}
                    className="font-mono font-bold text-[#5E2A52] hover:underline cursor-pointer text-left"
                  >
                    {app.dealNumber}
                  </button>
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {app.customerName}
                </TableCell>
                <TableCell align="right" className="font-bold text-slate-900 font-mono">
                  {formatCurrency(app.totalAmount)}
                </TableCell>
                <TableCell align="right">
                  <span className="font-mono font-semibold text-amber-800">
                    18.0%
                  </span>
                </TableCell>
                <TableCell align="right">
                  <span
                    className={`font-mono ${
                      app.marginPercent >= 20 ? 'text-emerald-700' : 'text-rose-700 font-semibold'
                    }`}
                  >
                    {formatPercent(app.marginPercent)}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <span
                    className={`font-mono font-bold ${
                      app.riskScore >= 75 ? 'text-rose-700' : 'text-amber-700'
                    }`}
                  >
                    {app.riskScore}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600">
                  {app.requestedBy || 'Sarah Jenkins'}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    03h : 48m
                  </span>
                </TableCell>
                <TableCell align="right">
                  <button
                    type="button"
                    onClick={() => setSearchParams({ id: app.id })}
                    className="px-2 py-1 text-xs border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Review
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
