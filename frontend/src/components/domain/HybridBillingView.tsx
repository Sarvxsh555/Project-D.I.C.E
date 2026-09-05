import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../utils/currency'
import type { HybridBillingDetail } from '../../types/billing'
import { FileText, Calendar, CreditCard } from 'lucide-react'

interface HybridBillingViewProps {
  billing: HybridBillingDetail
  onGenerateInvoice?: () => void
}

export function HybridBillingView({ billing, onGenerateInvoice }: HybridBillingViewProps) {
  return (
    <div className="space-y-6">
      {/* Hybrid Charge Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
            One-Time Capital Charges
          </span>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(billing.oneTimeTotal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Hardware batch delivery & license fees
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
            Recurring Operating Retainer
          </span>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(billing.recurringMonthlyTotal)}
            <span className="text-xs text-slate-400 font-normal"> / month</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Premium Support 24/7 dedicated SLA
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-900 block mb-1">
              Billing Action
            </span>
            <span className="text-xs text-slate-700">
              Trigger instant automated invoice creation against scheduled milestones.
            </span>
          </div>
          {onGenerateInvoice && (
            <Button
              variant="primary"
              size="sm"
              onClick={onGenerateInvoice}
              className="mt-3 bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 self-start"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Milestone Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Charge Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-slate-500" />
          Itemized Hybrid Line Charges
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Billing Cadence</th>
                <th className="py-2.5 px-3 text-right">Charge Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billing.charges.map((charge) => (
                <tr key={charge.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-medium text-slate-900">{charge.description}</td>
                  <td className="py-3 px-3">
                    <Badge variant={charge.type === 'RECURRING' ? 'info' : 'neutral'}>
                      {charge.type === 'RECURRING'
                        ? `Recurring (${charge.interval || 'Monthly'})`
                        : 'One-Time Capital'}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(charge.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing Schedule Timeline */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-4 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-500" />
          Projected Billing Schedule Timeline
        </h4>

        <div className="space-y-3">
          {billing.timeline.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 rounded-md border border-slate-100 bg-slate-50/40 text-xs hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-500 text-[11px] w-24">
                  {entry.date}
                </span>
                <span className="font-medium text-slate-900">{entry.description}</span>
                <Badge variant={entry.chargeType === 'RECURRING' ? 'info' : 'neutral'}>
                  {entry.chargeType === 'RECURRING' ? 'Recurring' : 'One-Time'}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(entry.amount)}
                </span>
                <Badge variant="warning">{entry.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
