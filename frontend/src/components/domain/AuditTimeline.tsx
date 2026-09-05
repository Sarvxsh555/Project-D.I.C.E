import type { AuditEvent } from '../../types/audit'
import { Clock, Shield, ArrowRight } from 'lucide-react'

interface AuditTimelineProps {
  events: AuditEvent[]
}

export function AuditTimeline({ events }: AuditTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-400">
        No audit events recorded yet.
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
      <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-4 flex items-center gap-1.5">
        <Shield className="w-4 h-4 text-slate-500" />
        Immutable Lifecycle Governance Audit Trail
      </h4>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((event) => (
          <div key={event.id} className="relative group">
            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#5E2A52] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5E2A52]" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">{event.action}</span>
                <span className="text-[10px] text-slate-400 font-medium">by {event.actor}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(event.timestamp).toLocaleString('en-IN')}
              </span>
            </div>

            {event.reason && (
              <p className="text-xs text-slate-600 mb-1">{event.reason}</p>
            )}

            {(event.previousValue || event.newValue) && (
              <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-50 border border-slate-100 rounded px-2.5 py-1 text-slate-600">
                <span className="text-slate-400">{event.previousValue || 'None'}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-slate-900">{event.newValue}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
