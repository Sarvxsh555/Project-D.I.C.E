import { Button } from '../ui/Button'
import { formatPercent } from '../../utils/currency'
import type { DiceDecision } from '../../types/dice'
import { AlertCircle, CheckCircle, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react'

interface DiceDecisionBlockProps {
  decision: DiceDecision
  onSimulate?: () => void
}

export function DiceDecisionBlock({ decision, onSimulate }: DiceDecisionBlockProps) {
  const isApprovalRequired = decision.decision === 'APPROVAL_REQUIRED'
  const isAutoApproved = decision.decision === 'AUTO_APPROVED'

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
      {/* Header Banner */}
      <div
        className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          isApprovalRequired
            ? 'bg-amber-50/70 border-amber-200'
            : isAutoApproved
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-rose-50/70 border-rose-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {isApprovalRequired ? (
            <ShieldAlert className="w-5 h-5 text-amber-700" />
          ) : isAutoApproved ? (
            <CheckCircle className="w-5 h-5 text-emerald-700" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-700" />
          )}
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              DICE Intelligence Decision
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {isApprovalRequired
                ? 'Approval Required by Sales Manager'
                : isAutoApproved
                ? 'Auto-Approved by System Governance'
                : 'Governance Policy Violation — Rejected'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Risk Score
            </span>
            <span className="text-sm font-bold text-amber-700 font-mono">
              {decision.riskScore} / 100
            </span>
          </div>

          <div className="text-right border-l border-slate-200 pl-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Blended Margin
            </span>
            <span
              className={`text-sm font-bold ${
                decision.marginPercent >= 20 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatPercent(decision.marginPercent)}
            </span>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-4">
        {/* WHY section */}
        <div>
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Decision Factors & Policy Checks (Why?)
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-600 pl-3">
            {decision.policyViolations && decision.policyViolations.length > 0 ? (
              decision.policyViolations.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-800">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{v}</span>
                </li>
              ))
            ) : (
              decision.factors.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>{f}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* WHAT WOULD MAKE IT AUTO-APPROVED */}
        <div className="bg-[#FAF5F9] border border-[#E8D4E3] rounded-md p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-[#5E2A52] mb-1">
                What would make it auto-approved?
              </div>
              <p className="text-xs text-slate-700">
                {decision.autoApproveCondition || decision.recommendation}
              </p>
            </div>

            {onSimulate && (
              <Button
                variant="primary"
                size="sm"
                onClick={onSimulate}
                className="shrink-0 flex items-center gap-1.5 bg-[#5E2A52] hover:bg-[#4d2243]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Simulate Change
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
