import { Button } from '../ui/Button'
import type { FulfillmentPlan, WarehouseStock } from '../../types/fulfillment'
import { CheckCircle2, Box, ShieldCheck } from 'lucide-react'

interface WarehouseAllocationViewProps {
  plan: FulfillmentPlan
  stock: WarehouseStock[]
  onAcceptSuggested?: () => void
  onManualOverride?: () => void
}

export function WarehouseAllocationView({
  plan,
  stock,
  onAcceptSuggested,
  onManualOverride,
}: WarehouseAllocationViewProps) {
  const steps = [
    'Approved',
    'Fulfillment Created',
    'Allocated',
    'Shipment Planned',
    'Shipped',
    'Delivered',
  ]
  const currentStepIdx = steps.indexOf(plan.lifecycleStep || 'Allocated')

  return (
    <div className="space-y-6">
      {/* Lifecycle Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-4">
          Fulfillment Lifecycle Progression
        </h4>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIdx
            const isCurrent = idx === currentStepIdx

            return (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#5E2A52] text-white'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  } ${isCurrent ? 'ring-4 ring-purple-100' : ''}`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] mt-1.5 font-medium text-center hidden sm:block ${
                    isCurrent ? 'text-[#5E2A52] font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Warehouse Stock Overview Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Box className="w-4 h-4 text-slate-500" />
            Active Depot Inventory Reserves
          </span>
          <span className="text-[11px] text-slate-400 font-normal">Real-Time WMS Telemetry</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Depot / Warehouse</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3 text-right">Available</th>
                <th className="py-2.5 px-3 text-right">Reserved</th>
                <th className="py-2.5 px-3 text-right">Incoming</th>
                <th className="py-2.5 px-3 text-right">Backordered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {stock.map((w) => (
                <tr key={w.warehouseId} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                    {w.warehouseName}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600">{w.productName}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                    {w.available} units
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{w.reserved}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">+{w.incoming}</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{w.backordered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggested Allocation Recommendation Box */}
      <div className="bg-[#FAF5F9] border border-[#E8D4E3] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#5E2A52] flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#5E2A52]" />
              Automated Fulfillment Recommendation
            </div>
            <div className="text-xs text-slate-700 space-y-1 mt-2">
              <p>
                <strong>Depot Route A:</strong> 12 units from Warehouse A (Mumbai Central)
              </p>
              <p>
                <strong>Depot Route B:</strong> 8 units from Warehouse B (Bengaluru Tech Hub)
              </p>
              <p className="text-emerald-700 font-semibold">
                Backorders: 0 units • Expected Dispatch: 12 Sep 2026 (Zero Transit Delay)
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            {onAcceptSuggested && (
              <Button
                variant="primary"
                size="sm"
                onClick={onAcceptSuggested}
                className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center justify-center gap-1.5"
              >
                Accept Suggested Allocation
              </Button>
            )}
            {onManualOverride && (
              <Button variant="outline" size="sm" onClick={onManualOverride}>
                Manual Override
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
