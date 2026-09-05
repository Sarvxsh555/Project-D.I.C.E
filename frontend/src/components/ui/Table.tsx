import React from 'react'
import { cn } from '../../utils/cn'

export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 bg-white rounded">
      <table className={cn('w-full text-left text-[13px] text-slate-800 border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200', className)}
      {...props}
    >
      {children}
    </thead>
  )
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-slate-100 bg-white', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({
  className,
  children,
  clickable = false,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        clickable ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({
  className,
  children,
  align = 'left',
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={cn(
        'px-3 py-2 text-xs font-semibold text-slate-600',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({
  className,
  children,
  align = 'left',
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn(
        'px-3 py-2.5 align-middle text-[13px] text-slate-800',
        align === 'right' ? 'text-right font-mono tabular-nums' : align === 'center' ? 'text-center' : 'text-left',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}

