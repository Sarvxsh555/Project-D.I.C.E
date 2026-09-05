import { formatCurrency, formatPercent } from '../../utils/currency'
import type { DealDetail } from '../../types/deal'

interface PricingSummaryProps {
  deal: DealDetail
}

export function PricingSummary({ deal }: PricingSummaryProps) {
  const subtotal = deal.subtotal || deal.totalAmount
  const discountAmount = deal.discountAmount || 0
  const taxAmount = deal.taxAmount || 0
  const netTotal = deal.totalAmount

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
      <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-4">
        Pricing Breakdown
      </h3>

      <div className="space-y-2.5 text-xs text-slate-600">
        <div className="flex justify-between items-center py-1">
          <span>Gross Catalog Subtotal</span>
          <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center py-1 text-amber-700">
          <span>Customer & Line Discount</span>
          <span className="font-medium">-{formatCurrency(discountAmount)}</span>
        </div>

        <div className="flex justify-between items-center py-1">
          <span>Estimated Tax / GST</span>
          <span className="font-medium text-slate-900">
            {taxAmount > 0 ? formatCurrency(taxAmount) : 'Exempt / Inclusive'}
          </span>
        </div>

        <div className="border-t border-slate-200 pt-3 mt-2 flex justify-between items-center text-sm font-bold text-slate-900">
          <span>Net Quotation Total</span>
          <span className="text-base text-slate-900 font-mono">{formatCurrency(netTotal)}</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 mt-3 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Blended Gross Margin:</span>
          <span
            className={`font-bold ${
              deal.marginPercent >= 20 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatPercent(deal.marginPercent)}
          </span>
        </div>
      </div>
    </div>
  )
}
