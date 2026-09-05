import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../utils/currency'
import type { DealDetail } from '../../types/deal'
import { Send, Edit3, CheckCircle2, AlertTriangle, Clock, SlidersHorizontal } from 'lucide-react'

interface DealHeaderProps {
  deal: DealDetail
  onSimulate?: () => void
  onSendToCustomer?: () => void
  onEdit?: () => void
  onSubmit?: () => void
}

export function DealHeader({
  deal,
  onSimulate,
  onSendToCustomer,
  onEdit,
  onSubmit,
}: DealHeaderProps) {
  const getStatusBadge = () => {
    switch (deal.status) {
      case 'DRAFT':
        return <Badge variant="neutral">Draft</Badge>
      case 'SUBMITTED':
        return <Badge variant="info">Submitted</Badge>
      case 'APPROVAL_REQUIRED':
      case 'PENDING_APPROVAL':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Approval Required
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Approved
          </Badge>
        )
      case 'CUSTOMER_REVIEW':
        return <Badge variant="info">Customer Review</Badge>
      case 'NEGOTIATION':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            In Negotiation
          </Badge>
        )
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed Deal</Badge>
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>
      case 'CANCELLED':
        return <Badge variant="neutral">Cancelled</Badge>
      default:
        return <Badge variant="neutral">{deal.status}</Badge>
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded p-4 mb-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Deal Identifiers */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {deal.dealNumber}
            </h1>
            {getStatusBadge()}
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {deal.customerTier || 'Enterprise'} Tier
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-500">
            <span>
              Customer:{' '}
              <strong className="text-slate-800 font-medium">
                {deal.customerName}
              </strong>
            </span>
            <span>•</span>
            <span>
              Owner:{' '}
              <strong className="text-slate-800 font-medium">{deal.owner}</strong>
            </span>
            <span>•</span>
            <span>
              Payment Terms:{' '}
              <strong className="text-slate-800 font-medium">
                {deal.paymentTerms}
              </strong>
            </span>
          </div>
        </div>

        {/* Center/Right: Pricing & Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right pr-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Total Deal Value
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatCurrency(deal.totalAmount)}
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            {onSimulate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSimulate}
                className="flex items-center gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50 text-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Simulate</span>
              </Button>
            )}

            {deal.status === 'DRAFT' && onSubmit && (
              <Button variant="primary" size="sm" onClick={onSubmit} className="bg-[#5E2A52] hover:bg-[#4B2141] text-xs">
                Submit for Approval
              </Button>
            )}

            {deal.status === 'APPROVED' && onSendToCustomer && (
              <Button
                variant="primary"
                size="sm"
                onClick={onSendToCustomer}
                className="flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send to Customer
              </Button>
            )}

            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="text-slate-600 hover:text-slate-900"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
