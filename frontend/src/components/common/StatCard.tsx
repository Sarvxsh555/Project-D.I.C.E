import React from 'react'
import { Card, CardContent } from '../ui/Card'
import { cn } from '../../utils/cn'

export interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  highlight?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  highlight = false,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'border border-slate-200 bg-white transition-colors',
        highlight && 'border-[#5E2A52] bg-[#FAF5F9]',
        className
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
            {label}
          </span>
          {icon && <div className="text-slate-400">{icon}</div>}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
          {trend && (
            <span
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>

        {subtext && <p className="mt-1 text-xs text-slate-500 truncate">{subtext}</p>}
      </CardContent>
    </Card>
  )
}
