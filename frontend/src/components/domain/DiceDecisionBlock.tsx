import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatPercent } from '../../utils/currency'
import type { DiceDecision } from '../../types/dice'
import { SlidersHorizontal } from 'lucide-react'

import { cn } from '../../utils/cn'

interface DiceDecisionBlockProps {
  decision: DiceDecision
  onSimulate?: () => void
}

export function DiceDecisionBlock({ decision, onSimulate }: DiceDecisionBlockProps) {
  const isApprovalRequired = decision.decision === 'APPROVAL_REQUIRED'
  const isAutoApproved = decision.decision === 'AUTO_APPROVED'

  return (
    <div
      className={cn(
        'border border-slate-200 rounded-lg bg-white overflow-hidden border-l-4 shadow-2xs',
        isAutoApproved
          ? 'border-l-emerald-600'
          : isApprovalRequired
          ? 'border-l-amber-500'
          : 'border-l-rose-600'
      )}
    >
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

        <div className="flex items-center gap-2">
          <Badge
            variant={
              isApprovalRequired
                ? 'warning'
                : isAutoApproved
                ? 'success'
                : 'danger'
            }
          >
            {isApprovalRequired
              ? 'APPROVAL REQUIRED'
              : isAutoApproved
              ? 'AUTO-APPROVED'
              : 'POLICY REJECTED'}
          </Badge>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-white">
        <div className="p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
            Risk Score
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-amber-700">
              {decision.riskScore}
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
                decision.marginPercent >= 20 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatPercent(decision.marginPercent)}
            </span>
            <span className="text-[10px] text-slate-400">
              (Floor: 20.0%)
            </span>
          </div>
        </div>
      </div>

      {/* Decision Factors */}
      <div className="p-4 space-y-3.5 text-xs">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700 block mb-1.5">
            Decision Factors:
          </span>
          <ul className="space-y-1 text-slate-700">
            {decision.policyViolations && decision.policyViolations.length > 0 ? (
              decision.policyViolations.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-800">
                  <span className="text-rose-600 font-bold select-none">•</span>
                  <span>{v}</span>
                </li>
              ))
            ) : (
              decision.factors.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="text-slate-400 font-bold select-none">•</span>
                  <span>{f}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Recommendation & Next Action */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
              Recommendation:
            </span>
            <p className="text-xs text-slate-800 mt-0.5">
              {decision.autoApproveCondition || decision.recommendation || 'Reduce service discount to 10% or below to reach target margin.'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Next Action:
              </span>
              <span className="text-xs font-semibold text-slate-900">
                {isApprovalRequired ? 'Manager approval required.' : 'Proceed to fulfillment and billing dispatch.'}
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
