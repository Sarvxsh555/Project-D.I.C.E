import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { NegotiationDetail } from '../../types/negotiation'
import { History, ShieldAlert, ArrowUpRight, MessageSquare } from 'lucide-react'

interface NegotiationViewProps {
  negotiation: NegotiationDetail
  onAccept?: () => void
  onReject?: () => void
  onRequestRevision?: () => void
}

export function NegotiationView({
  negotiation,
  onAccept,
  onReject,
  onRequestRevision,
}: NegotiationViewProps) {
  return (
    <div className="space-y-4">
      {/* Comparison Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Original Offer */}
        <div className="bg-white border border-slate-200 rounded p-3.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block mb-1">
            Original Internal Offer
          </span>
          <div className="text-lg font-bold text-slate-900">
            {formatPercent(negotiation.originalDiscountPercent)} Discount
          </div>
          <div className="mt-2 text-xs text-slate-600 space-y-0.5">
            <div>Margin: <span className="font-semibold text-slate-800 font-mono">{formatPercent(negotiation.previousMarginPercent)}</span></div>
            <div>Risk Score: <span className="font-semibold font-mono text-slate-800">{negotiation.previousRiskScore} / 100</span></div>
          </div>
        </div>

        {/* Customer Counteroffer */}
        <div className="bg-amber-50/40 border border-amber-200 rounded p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-800 block mb-1">
              Customer Counteroffer
            </span>
            <span className="text-xs font-semibold text-amber-800 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +{negotiation.discountDifference}% Points
            </span>
          </div>
          <div className="text-lg font-bold text-amber-950">
            {formatPercent(negotiation.customerRequestedDiscountPercent)} Discount
          </div>
          <div className="mt-2 text-xs text-slate-700 flex items-start gap-1.5 bg-white/90 p-2 rounded border border-amber-200/60">
            <MessageSquare className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <span className="italic">"{negotiation.customerMessage}"</span>
          </div>
        </div>

        {/* DICE DECISION Re-Evaluation Impact */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-slate-900 rounded p-3.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-900 block mb-1">
            DICE DECISION — Re-Evaluation
          </span>
          <div className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            APPROVAL REQUIRED
          </div>
          <div className="mt-2 text-xs text-slate-600 space-y-0.5">
            <div>Margin impact: <strong className="text-rose-700 font-mono">{formatPercent(negotiation.currentMarginPercent)}</strong> (-3.8%)</div>
            <div>Risk recalculated: <strong className="text-amber-800 font-mono">{negotiation.currentRiskScore} / 100</strong> (+20 risk)</div>
          </div>
        </div>
      </div>

      {/* Decision Buttons */}
      <div className="bg-white border border-slate-200 rounded p-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          Evaluate customer counteroffer against corporate pricing governance rules.
        </span>
        <div className="flex items-center gap-2">
          {onReject && (
            <Button variant="outline" size="sm" onClick={onReject} className="text-rose-700 border-rose-200 hover:bg-rose-50 rounded text-xs py-1 px-2.5">
              Reject Counteroffer
            </Button>
          )}
          {onRequestRevision && (
            <Button variant="outline" size="sm" onClick={onRequestRevision} className="rounded text-xs py-1 px-2.5">
              Request Revision
            </Button>
          )}
          {onAccept && (
            <Button variant="primary" size="sm" onClick={onAccept} className="bg-slate-900 hover:bg-slate-800 rounded text-xs py-1 px-3">
              Accept & Route for Approval
            </Button>
          )}
        </div>
      </div>

      {/* Immutable Negotiation History */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-slate-500" />
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-700">
            Immutable Negotiation History & Version Log
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50/75 text-[11px] uppercase text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Ver</th>
                <th className="py-2 px-3">Negotiating Actor</th>
                <th className="py-2 px-3 text-right">Discount</th>
                <th className="py-2 px-3 text-right">Projected Total</th>
                <th className="py-2 px-3 text-right">Margin</th>
                <th className="py-2 px-3 text-right">Risk</th>
                <th className="py-2 px-3">Status / Action</th>
                <th className="py-2 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {negotiation.history.map((record) => (
                <tr key={record.version} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-mono font-semibold text-blue-600">
                    v{record.version}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">{record.actor}</td>
                  <td className="py-2 px-3 text-right font-medium text-slate-900 font-mono">
                    {formatPercent(record.discount)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                    {formatCurrency(record.total)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    {record.margin ? formatPercent(record.margin) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    {record.risk ?? '-'}
                  </td>
                  <td className="py-2 px-3">
                    <Badge variant={record.status.includes('COUNTEROFFER') ? 'warning' : 'info'}>
                      {record.status}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-400">
                    {new Date(record.timestamp).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
