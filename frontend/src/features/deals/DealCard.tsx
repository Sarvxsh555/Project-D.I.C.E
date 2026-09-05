import { Card, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency, formatPercent } from '../../utils'
import { DEAL_STATUS_STYLES } from '../../constants/theme'
import type { DealSummary } from '../../types/deal'

export function DealCard({ deal, onClick }: { deal: DealSummary; onClick?: () => void }) {
  const statusMeta = DEAL_STATUS_STYLES[deal.status] || { label: deal.status, variant: 'neutral' }

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:border-slate-300 transition-all shadow-xs"
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs text-slate-900">{deal.dealNumber}</span>
          <Badge variant={statusMeta.variant} size="sm" dot>
            {statusMeta.label}
          </Badge>
        </div>
        <p className="text-xs font-medium text-slate-700 truncate">{deal.customerName}</p>
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <span className="font-bold text-slate-900">{formatCurrency(deal.totalAmount, deal.currency)}</span>
          <span className="text-slate-500">{formatPercent(deal.marginPercent)} margin</span>
        </div>
      </CardContent>
    </Card>
  )
}
