import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatPercent } from '../../utils/currency'
import type { DiceDecision } from '../../types/dice'
import { SlidersHorizontal } from 'lucide-react'

interface DiceDecisionBlockProps {
  decision: DiceDecision
  onSimulate?: () => void
}

const OUTCOME_META: Record<DiceDecision['outcome'], { label: string; variant: 'success' | 'warning' | 'danger'; nextAction: string }> = {
  AUTO_APPROVE: { label: 'AUTO-APPROVED', variant: 'success', nextAction: 'Proceed to fulfillment and billing dispatch.' },
  REQUIRE_APPROVAL: { label: 'APPROVAL REQUIRED', variant: 'warning', nextAction: 'Awaiting sign-off from the required role.' },
  BLOCK: { label: 'BLOCKED', variant: 'danger', nextAction: 'A hard policy floor was breached — cannot proceed as configured.' },
  RECOMMEND_ALTERNATIVE: { label: 'BLOCKED — ALTERNATIVES AVAILABLE', variant: 'danger', nextAction: 'See recommendations below for a viable alternative.' },
  REAPPROVAL_REQUIRED: { label: 'REAPPROVAL REQUIRED', variant: 'warning', nextAction: 'The deal changed since it was last approved — prior sign-off no longer covers this state.' },
}

export function DiceDecisionBlock({ decision, onSimulate }: DiceDecisionBlockProps) {
  const meta = OUTCOME_META[decision.outcome]

  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden border-l-4 border-l-[#5E2A52]">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-500 block">
            Automated Governance & Risk Assessment
          </span>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            DICE DECISION
          </h3>
        </div>

        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-white">
        <div className="p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
            Risk Score
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-amber-700">
              {decision.riskScore ?? '—'}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
        </div>

        <div className="p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
            Blended Margin
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-xl font-bold font-mono ${
                (decision.marginPercent ?? 0) >= 20 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatPercent(decision.marginPercent)}
            </span>
          </div>
        </div>
      </div>

      {/* Decision Factors */}
      <div className="p-4 space-y-3.5 text-xs">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700 block mb-1.5">
            Policy Violations:
          </span>
          {decision.violations.length > 0 ? (
            <ul className="space-y-1 text-slate-700">
              {decision.violations.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-800">
                  <span className="text-rose-600 font-bold select-none">•</span>
                  <span>{v.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No policy violations on this evaluation.</p>
          )}
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
          <div className="pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Next Action:
              </span>
              <span className="text-xs font-semibold text-slate-900">
                {meta.nextAction}
              </span>
            </div>

            {onSimulate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSimulate}
                className="text-xs shrink-0 border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Simulate Terms</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
