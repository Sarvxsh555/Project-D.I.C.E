import { useState, useEffect } from 'react'
import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatCurrency, formatPercent } from '../../utils/currency'
import { quotationService } from '../../services/quotationService'
import type { DealDetail } from '../../types/deal'
import type { SimulationResponse } from '../../types/dice'
import { ArrowRight, ShieldCheck, ShieldAlert, Check } from 'lucide-react'

interface DiceSimulationDrawerProps {
  isOpen: boolean
  onClose: () => void
  deal: DealDetail
  onApplyChanges: (changes: { discount: number; quantity: number; paymentTerms: string }) => void
}

export function DiceSimulationDrawer({
  isOpen,
  onClose,
  deal,
  onApplyChanges,
}: DiceSimulationDrawerProps) {
  const [simDiscount, setSimDiscount] = useState<number>(18)
  const [simQuantity, setSimQuantity] = useState<number>(20)
  const [simTerms, setSimTerms] = useState<string>('Net 30')
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  // Trigger simulation upon input adjustments
  useEffect(() => {
    let active = true
    async function runSimulation() {
      setLoading(true)
      try {
        const res = await quotationService.simulate(deal.id, {
          discount: simDiscount,
          quantity: simQuantity,
          paymentTerms: simTerms,
        })
        if (active) setSimulation(res)
      } catch (err) {
        console.error('Simulation error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    if (isOpen) {
      runSimulation()
    }
    return () => {
      active = false
    }
  }, [isOpen, deal.id, simDiscount, simQuantity, simTerms])

  const handleConfirmApply = () => {
    onApplyChanges({
      discount: simDiscount,
      quantity: simQuantity,
      paymentTerms: simTerms,
    })
    setConfirmModalOpen(false)
    onClose()
  }

  const currentTotal = simulation?.current.total ?? deal.totalAmount
  const currentMargin = simulation?.current.margin ?? deal.marginPercent
  const currentRisk = simulation?.current.risk ?? deal.riskScore

  const simTotal = simulation?.simulated.total ?? deal.totalAmount
  const simMargin = simulation?.simulated.margin ?? deal.marginPercent
  const simRisk = simulation?.simulated.risk ?? deal.riskScore
  const simApprovalRequired = simulation?.simulated.approvalRequired ?? true

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="DICE Real-Time Deal Simulation"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-xs text-slate-500">
            Simulate adjustments to line discounts, unit volume, and contractual terms to preview
            governance impact without modifying the active quotation.
          </p>

          {/* Interactive Sliders and Inputs */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Simulation Variables
            </h4>

            {/* Discount Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <label className="font-semibold text-slate-800">
                  Target Service Discount:
                </label>
                <span className="font-bold text-blue-600 font-mono text-sm">
                  {simDiscount}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={simDiscount}
                onChange={(e) => setSimDiscount(parseInt(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0% (Standard)</span>
                <span className="text-emerald-700 font-medium">≤ 10% (Auto-Approved)</span>
                <span>30% (Max)</span>
              </div>
            </div>

            {/* Hardware Quantity Input */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Enterprise Server Qty:
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={simQuantity}
                  onChange={(e) => setSimQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Payment Terms:
                </label>
                <select
                  value={simTerms}
                  onChange={(e) => setSimTerms(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Immediate">Immediate / Advance</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Projected Governance & Margin Outcome
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* CURRENT */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                  Current Quotation
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Net Total</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrency(currentTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Blended Margin</span>
                    <span className="font-bold text-rose-600">
                      {formatPercent(currentMargin)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">DICE Risk Score</span>
                    <span className="font-bold text-amber-700 font-mono">
                      {currentRisk} / 100
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-amber-700 font-medium text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Approval Required</span>
                  </div>
                </div>
              </div>

              {/* SIMULATED */}
              <div className="border-2 border-slate-300 rounded-lg p-4 bg-slate-50/50 shadow-xs relative">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-900 mb-3 flex items-center justify-between">
                  <span>Simulated Outcome</span>
                  {loading && <span className="text-[10px] text-slate-400">Computing...</span>}
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Net Total</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrency(simTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Blended Margin</span>
                    <span
                      className={`font-bold ${
                        simMargin >= 20 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatPercent(simMargin)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">DICE Risk Score</span>
                    <span
                      className={`font-bold font-mono ${
                        simRisk < 50 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {simRisk} / 100
                    </span>
                  </div>
                  <div
                    className={`pt-2 border-t border-purple-100 flex items-center gap-1 font-medium text-[11px] ${
                      simApprovalRequired ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {simApprovalRequired ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>Approval Required</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Instant Auto-Approve</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation Banner */}
          {simulation?.recommendation && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Recommendation:</strong> {simulation.recommendation}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={onClose}>
              Discard Simulation
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800"
            >
              Apply Simulated Changes
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmModalOpen}
        title="Apply Simulated Changes to Quotation?"
        message={`This will update the active quotation ${deal.dealNumber || deal.id} lines to ${simDiscount}% discount and re-evaluate governance rules.`}
        confirmLabel="Confirm & Apply"
        variant="primary"
        onConfirm={handleConfirmApply}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </>
  )
}
