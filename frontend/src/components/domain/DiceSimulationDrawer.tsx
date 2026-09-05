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
  onApplied: (deal: DealDetail) => void
}

export function DiceSimulationDrawer({
  isOpen,
  onClose,
  deal,
  onApplied,
}: DiceSimulationDrawerProps) {
  const [simDiscount, setSimDiscount] = useState<number>(18)
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  // Real-time preview via POST /negotiations/{dealId}/preview — never
  // changes the deal, safe to call on every slider move.
  useEffect(() => {
    let active = true
    async function runPreview() {
      setLoading(true)
      setError(null)
      try {
        const res = await quotationService.simulate(deal.id, simDiscount)
        if (active) setSimulation(res)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Preview failed')
      } finally {
        if (active) setLoading(false)
      }
    }

    if (isOpen) {
      runPreview()
    }
    return () => {
      active = false
    }
  }, [isOpen, deal.id, simDiscount])

  const handleConfirmApply = async () => {
    setApplying(true)
    try {
      const updated = await quotationService.acceptNegotiation(deal.id, simDiscount)
      onApplied(updated)
      setConfirmModalOpen(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply')
      setConfirmModalOpen(false)
    } finally {
      setApplying(false)
    }
  }

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
            Preview a discount change against real policy and margin rules before applying it —
            this calls the same engine that evaluates the live quotation.
          </p>

          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Discount Slider */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <label className="font-semibold text-slate-800">
                Proposed Discount:
              </label>
              <span className="font-bold text-[#5E2A52] font-mono text-sm">
                {simDiscount}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={simDiscount}
              onChange={(e) => setSimDiscount(parseInt(e.target.value))}
              className="w-full accent-[#5E2A52] cursor-pointer"
            />
          </div>

          {/* Preview Result */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Governance & Margin Outcome
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                  Current
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Total</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrency(simulation?.currentTotal ?? deal.totalAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Margin</span>
                    <span className="font-bold text-slate-700">
                      {formatPercent(deal.marginPercent)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-2 border-[#5E2A52]/30 rounded-lg p-4 bg-[#FAF5F9]/50 shadow-xs relative">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#5E2A52] mb-3 flex items-center justify-between">
                  <span>Proposed</span>
                  {loading && <span className="text-[10px] text-slate-400">Computing...</span>}
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Total</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {simulation ? formatCurrency(simulation.proposedTotal) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Margin</span>
                    <span
                      className={`font-bold ${
                        simulation && simulation.resultingMarginPercent >= 20 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {simulation ? formatPercent(simulation.resultingMarginPercent) : '—'}
                    </span>
                  </div>
                  {simulation && (
                    <div
                      className={`pt-2 border-t border-purple-100 flex items-center gap-1 font-medium text-[11px] ${
                        simulation.acceptable ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {simulation.acceptable ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>No approval needed</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>{simulation.outcome.replaceAll('_', ' ')}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {simulation?.rationale && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
              {simulation.rationale}
            </div>
          )}

          {simulation && simulation.recommendations.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 space-y-1.5">
              {simulation.recommendations.map((rec) => (
                <div key={rec.code} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>{rec.title}:</strong> {rec.rationale}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={onClose}>
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!simulation}
              onClick={() => setConfirmModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#5E2A52] hover:bg-[#4d2243]"
            >
              Apply Discount
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmModalOpen}
        title="Apply Discount to Quotation?"
        message={`This will update ${deal.dealNumber} to a ${simDiscount}% discount and re-evaluate governance rules.`}
        confirmLabel={applying ? 'Applying...' : 'Confirm & Apply'}
        variant="primary"
        onConfirm={handleConfirmApply}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </>
  )
}
