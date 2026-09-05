import { Badge } from '../ui/Badge'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { DealLineItem } from '../../types/deal'

interface DealLineTableProps {
  lines: DealLineItem[]
  editable?: boolean
  onUpdateLine?: (lineId: string, updates: Partial<DealLineItem>) => void
}

export function DealLineTable({ lines, editable, onUpdateLine }: DealLineTableProps) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-xs">
      <table className="w-full text-left text-xs text-slate-700">
        <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
          <tr>
            <th className="py-3 px-4">#</th>
            <th className="py-3 px-4">Product / Item</th>
            <th className="py-3 px-3">SKU</th>
            <th className="py-3 px-3 text-right">Qty</th>
            <th className="py-3 px-4 text-right">Unit Base Price</th>
            <th className="py-3 px-3 text-right">Discount</th>
            <th className="py-3 px-4 text-right font-medium">Net Amount</th>
            <th className="py-3 px-3 text-right text-slate-400">Unit Cost</th>
            <th className="py-3 px-3 text-right">Margin</th>
            <th className="py-3 px-3 text-center">Billing Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line, index) => {
            const hasHighDiscount = line.discountPercent > 15
            const isLowMargin = line.marginPercent < 20

            return (
              <tr key={line.id || index} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                  {line.lineNumber || index + 1}
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-900">
                  <div>{line.productName || line.product}</div>
                  {line.warehouseAllocations && line.warehouseAllocations.length > 0 && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Allocated across {line.warehouseAllocations.length} warehouses
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px]">
                  {line.sku}
                </td>
                <td className="py-3.5 px-3 text-right font-medium text-slate-900">
                  {editable ? (
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        onUpdateLine?.(line.id, { quantity: parseInt(e.target.value) || 1 })
                      }
                      className="w-16 px-2 py-1 text-right border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
                    />
                  ) : (
                    line.quantity
                  )}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-600">
                  {formatCurrency(line.unitPrice)}
                </td>
                <td className="py-3.5 px-3 text-right">
                  <span
                    className={`inline-block font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                      hasHighDiscount
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'text-slate-700'
                    }`}
                  >
                    {formatPercent(line.discountPercent)}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                  {formatCurrency(line.netAmount || line.lineTotal)}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                  {formatCurrency(line.costPrice)}
                </td>
                <td className="py-3.5 px-3 text-right">
                  <span
                    className={`inline-block font-medium px-1.5 py-0.5 rounded text-[11px] ${
                      isLowMargin
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatPercent(line.marginPercent)}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-center">
                  <Badge variant={line.billingType === 'RECURRING' ? 'info' : 'neutral'}>
                    {line.billingType === 'RECURRING' ? 'Recurring' : 'One-time'}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
