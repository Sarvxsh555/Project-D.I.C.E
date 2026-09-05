import { Button } from '../ui/Button'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { DealLineItem } from '../../types/deal'
import { Trash2, Plus } from 'lucide-react'

interface DealLineTableProps {
  lines: DealLineItem[]
  editable?: boolean
  onUpdateLine?: (lineId: string, updates: Partial<DealLineItem>) => void
  onAddLine?: () => void
  onRemoveLine?: (lineId: string) => void
}

export function DealLineTable({
  lines,
  editable = true,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
}: DealLineTableProps) {
  return (
    <div className="border border-slate-200 rounded bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-800 border-collapse">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2 px-3 w-8">#</th>
              <th className="py-2 px-3">Product / Service</th>
              <th className="py-2 px-2.5">SKU</th>
              <th className="py-2 px-2.5 text-right w-20">Qty</th>
              <th className="py-2 px-3 text-right">Unit Price</th>
              <th className="py-2 px-2.5 text-right w-24">Discount %</th>
              <th className="py-2 px-2.5 text-right">Tax (18%)</th>
              <th className="py-2 px-3 text-right font-bold">Net Total</th>
              <th className="py-2 px-2.5 text-right text-slate-400">Unit Cost</th>
              <th className="py-2 px-2.5 text-right">Margin</th>
              {editable && onRemoveLine && <th className="py-2 px-2 w-8 text-center" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line, index) => {
              const hasHighDiscount = line.discountPercent > 15
              const isLowMargin = line.marginPercent < 20
              const unitPrice = line.unitPrice || 20000
              const qty = line.quantity || 1
              const disc = line.discountPercent || 0
              const subtotal = unitPrice * qty * (1 - disc / 100)
              const tax = subtotal * 0.18
              const netTotal = subtotal + tax

              return (
                <tr key={line.id || index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    <div>{line.productName || line.product}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {line.billingType === 'RECURRING' ? 'Recurring Monthly' : 'One-Time Delivery'}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 font-mono text-slate-500 text-[11px]">
                    {line.sku}
                  </td>
                  <td className="py-2.5 px-2.5 text-right">
                    {editable ? (
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          onUpdateLine?.(line.id, {
                            quantity: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-16 px-1.5 py-1 text-right border border-slate-200 rounded text-xs font-mono text-slate-900 focus:outline-none focus:border-[#5E2A52]"
                      />
                    ) : (
                      <span className="font-mono">{line.quantity}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {formatCurrency(unitPrice)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right">
                    {editable ? (
                      <div className="inline-flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={line.discountPercent}
                          onChange={(e) =>
                            onUpdateLine?.(line.id, {
                              discountPercent: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className={`w-16 px-1.5 py-1 text-right border rounded text-xs font-mono focus:outline-none ${
                            hasHighDiscount
                              ? 'border-amber-300 bg-amber-50 text-amber-800'
                              : 'border-slate-200 text-slate-900 focus:border-[#5E2A52]'
                          }`}
                        />
                        <span className="text-slate-400 text-xs">%</span>
                      </div>
                    ) : (
                      <span
                        className={`inline-block font-mono font-medium px-1.5 py-0.5 rounded text-[11px] ${
                          hasHighDiscount
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'text-slate-700'
                        }`}
                      >
                        {formatPercent(line.discountPercent)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono text-slate-500">
                    {formatCurrency(tax)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                    {formatCurrency(netTotal)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-slate-400 font-mono text-[11px]">
                    {formatCurrency(line.costPrice)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right">
                    <span
                      className={`inline-block font-mono font-medium px-1.5 py-0.5 rounded text-[11px] ${
                        isLowMargin
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'text-emerald-700'
                      }`}
                    >
                      {formatPercent(line.marginPercent)}
                    </span>
                  </td>
                  {editable && onRemoveLine && (
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveLine(line.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editable && onAddLine && (
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddLine}
            className="text-xs flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Line Item</span>
          </Button>
          <span className="text-[11px] text-slate-400 font-mono">
            Standard GST 18% applied automatically
          </span>
        </div>
      )}
    </div>
  )
}
