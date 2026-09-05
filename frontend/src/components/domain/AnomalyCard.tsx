import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react'

interface AnomalyCardProps {
  anomaly: {
    id: string
    dealId: string
    dealNumber: string
    customerName: string
    title: string
    description: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    timestamp: string
    category?: string
  }
}

export function AnomalyCard({ anomaly }: AnomalyCardProps) {
  const getSeverityBadge = () => {
    switch (anomaly.severity) {
      case 'CRITICAL':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Critical
          </Badge>
        )
      case 'HIGH':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            High
          </Badge>
        )
      case 'MEDIUM':
        return <Badge variant="warning">Medium</Badge>
      case 'LOW':
        return <Badge variant="info">Low</Badge>
      default:
        return <Badge variant="neutral">{anomaly.severity}</Badge>
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
              anomaly.severity === 'CRITICAL'
                ? 'bg-rose-50 text-rose-600'
                : anomaly.severity === 'HIGH'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-slate-50 text-slate-600'
            }`}
          >
            {anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs">{anomaly.title}</span>
              {getSeverityBadge()}
            </div>
            <p className="text-xs text-slate-600 mt-1">{anomaly.description}</p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              <span>{anomaly.customerName}</span>
              <span>•</span>
              <span className="font-mono">{new Date(anomaly.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        <Link
          to={`/quotations?id=${anomaly.dealId}`}
          className="text-xs font-semibold text-[#5E2A52] hover:text-[#4d2243] flex items-center gap-1 shrink-0 pt-1"
        >
          <span>{anomaly.dealNumber}</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
