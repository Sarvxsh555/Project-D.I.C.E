import { cn } from '../../utils/cn'
import { Button } from './Button'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : currentPage * pageSize + 1
  const endItem = totalItems ? Math.min((currentPage + 1) * pageSize, totalItems) : 0

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600',
        className
      )}
    >
      {/* Summary */}
      <div>
        {totalItems !== undefined ? (
          <span>
            Showing <strong className="text-slate-800">{startItem}</strong> to{' '}
            <strong className="text-slate-800">{endItem}</strong> of{' '}
            <strong className="text-slate-800">{totalItems}</strong> records
          </span>
        ) : (
          <span>
            Page <strong className="text-slate-800">{currentPage + 1}</strong> of{' '}
            <strong className="text-slate-800">{Math.max(1, totalPages)}</strong>
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 mr-2">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 0}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <div className="px-2 font-medium text-slate-700">
          {currentPage + 1} / {Math.max(1, totalPages)}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
