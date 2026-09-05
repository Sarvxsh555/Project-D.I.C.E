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
    <div className="space-y-6">
      {/* Comparison Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Original Offer */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Original Internal Offer
          </span>
          <div className="text-xl font-bold text-slate-900">
            {formatPercent(negotiation.originalDiscountPercent)} Discount
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-0.5">
            <div>Margin: <span className="font-semibold text-slate-800">{formatPercent(negotiation.previousMarginPercent)}</span></div>
            <div>Risk Score: <span className="font-semibold font-mono text-slate-800">{negotiation.previousRiskScore} / 100</span></div>
          </div>
        </div>

        {/* Customer Counteroffer */}
        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block mb-1">
              Customer Counteroffer
            </span>
            <span className="text-xs font-bold text-amber-700 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +{negotiation.discountDifference}% Points
            </span>
          </div>
          <div className="text-xl font-bold text-amber-900">
            {formatPercent(negotiation.customerRequestedDiscountPercent)} Discount
          </div>
          <div className="mt-2 text-xs text-slate-700 flex items-start gap-1.5 bg-white/80 p-2 rounded border border-amber-100">
            <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span className="italic">"{negotiation.customerMessage}"</span>
          </div>
        </div>

        {/* DICE Re-Evaluation Impact */}
        <div className="bg-[#FAF5F9] border border-[#E8D4E3] rounded-lg p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E2A52] block mb-1">
            DICE Re-evaluation
          </span>
          <div className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Approval Required Again
          </div>
          <div className="mt-2 text-xs text-slate-600 space-y-0.5">
            <div>Margin impact: <strong className="text-rose-600">{formatPercent(negotiation.currentMarginPercent)}</strong> (-3.8%)</div>
            <div>Risk recalculated: <strong className="text-amber-700 font-mono">{negotiation.currentRiskScore} / 100</strong> (+20 risk)</div>
          </div>
        </div>
      </div>

      {/* Decision Buttons */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          Review customer proposal against executive sales authority.
        </span>
        <div className="flex items-center gap-2">
          {onReject && (
            <Button variant="outline" size="sm" onClick={onReject} className="text-rose-600 border-rose-200 hover:bg-rose-50">
              Reject Counteroffer
            </Button>
          )}
          {onRequestRevision && (
            <Button variant="outline" size="sm" onClick={onRequestRevision}>
              Request Revision
            </Button>
          )}
          {onAccept && (
            <Button variant="primary" size="sm" onClick={onAccept} className="bg-[#5E2A52] hover:bg-[#4d2243]">
              Accept & Route for Approval
            </Button>
          )}
        </div>
      </div>

      {/* Immutable Negotiation History */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <History className="w-4 h-4 text-slate-500" />
          Immutable Negotiation History & Version Log
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Ver</th>
                <th className="py-2.5 px-3">Negotiating Actor</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">Projected Total</th>
                <th className="py-2.5 px-3 text-right">Margin</th>
                <th className="py-2.5 px-3 text-right">Risk</th>
                <th className="py-2.5 px-3">Status / Action</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {negotiation.history.map((record) => (
                <tr key={record.version} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#5E2A52]">
                    v{record.version}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{record.actor}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                    {formatPercent(record.discount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(record.total)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700">
                    {record.margin ? formatPercent(record.margin) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {record.risk ?? '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant={record.status.includes('COUNTEROFFER') ? 'warning' : 'info'}>
                      {record.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-400">
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
