import { cn } from '../../utils/cn'

export interface LoadingStateProps {
  message?: string
  rows?: number
  className?: string
}

export function LoadingState({
  message = 'Loading data...',
  rows = 3,
  className,
}: LoadingStateProps) {
  return (
    <div className={cn('p-6 bg-white rounded-lg border border-slate-200 space-y-3', className)}>
      <div className="flex items-center gap-3 text-slate-500 text-xs font-medium pb-2 border-b border-slate-100">
        <svg
          className="animate-spin h-4 w-4 text-[#5E2A52]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        <span>{message}</span>
      </div>

      <div className="space-y-2.5 pt-1 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 bg-slate-200/70 rounded w-1/4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-1/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
