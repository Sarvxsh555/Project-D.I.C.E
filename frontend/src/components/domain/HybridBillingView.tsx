import { Button } from '../ui/Button'
import { formatCurrency } from '../../utils/currency'
import type { BillingSchedule } from '../../types/billing'
import { FileText, Calendar, CreditCard } from 'lucide-react'

interface HybridBillingViewProps {
  billing: BillingSchedule
  onGenerateInvoice?: () => void
}

export function HybridBillingView({ billing, onGenerateInvoice }: HybridBillingViewProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
            Total Amount
          </span>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(billing.totalAmount, billing.currency)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Payment terms: Net-{billing.paymentTermsDays} days
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
            Installments
          </span>
          <div className="text-xl font-bold text-[#5E2A52]">
            {billing.installments.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {billing.installments.length > 1 ? 'Milestone billing schedule' : 'One-time billing'}
          </span>
        </div>

        <div className="bg-[#FAF5F9] border border-[#E8D4E3] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#5E2A52] block mb-1">
              Billing Action
            </span>
            <span className="text-xs text-slate-700">
              Trigger invoice generation against this deal's billing schedule.
            </span>
          </div>
          {onGenerateInvoice && (
            <Button
              variant="primary"
              size="sm"
              onClick={onGenerateInvoice}
              className="mt-3 bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5 self-start"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-slate-500" />
          Line Items
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billing.lineItems.map((item) => (
                <tr key={item.sku} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-mono text-slate-500">{item.sku}</td>
                  <td className="py-3 px-3 font-medium text-slate-900">{item.description}</td>
                  <td className="py-3 px-3 text-right">{item.quantity}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(item.amount, billing.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Installment Schedule */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-4 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-500" />
          Installment Schedule
        </h4>

        <div className="space-y-3">
          {billing.installments.map((inst) => (
            <div
              key={inst.code}
              className="flex items-center justify-between p-3 rounded-md border border-slate-100 bg-slate-50/40 text-xs hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-500 text-[11px] w-24">
                  {inst.dueDate}
                </span>
                <span className="font-medium text-slate-900">{inst.label}</span>
              </div>

              <span className="font-bold text-slate-900 font-mono">
                {formatCurrency(inst.amount, billing.currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
