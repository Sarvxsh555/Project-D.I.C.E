import { formatPercent } from '../../utils/currency'
import type { ApprovalSnapshot } from '../../types/approval'
import { ShieldCheck, Lock } from 'lucide-react'

interface ApprovalSnapshotViewProps {
  snapshot?: ApprovalSnapshot
}

export function ApprovalSnapshotView({ snapshot }: ApprovalSnapshotViewProps) {
  if (!snapshot) {
    return (
      <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-400 bg-slate-50/50">
        No immutable approval snapshot created yet. Snapshots are generated upon formal manager decision.
      </div>
    )
  }

  return (
    <div className="border border-emerald-200 bg-emerald-50/30 rounded-lg p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-100">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Immutable Governance Snapshot</span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
          <Lock className="w-3 h-3" />
          Cryptographically Sealed
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block">
            Approved Discount
          </span>
          <span className="font-bold text-slate-800 text-sm">
            {formatPercent(snapshot.discountPercent)}
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block">
            Approved Margin
          </span>
          <span className="font-bold text-slate-800 text-sm">
            {formatPercent(snapshot.marginPercent)}
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block">
            Risk Score
          </span>
          <span className="font-bold text-slate-800 text-sm font-mono">
            {snapshot.riskScore} / 100
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block">
            Contract Terms
          </span>
          <span className="font-bold text-slate-800 text-sm">
            {snapshot.paymentTerms}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-emerald-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
        <span>
          Authorized by: <strong className="text-slate-700">{snapshot.approvedBy}</strong>
        </span>
        <span>
          Date: <span className="font-mono">{new Date(snapshot.approvedAt).toLocaleString('en-IN')}</span>
        </span>
      </div>
    </div>
  )
}
