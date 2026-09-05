import React from 'react'
import { cn } from '../../utils/cn'

export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className={cn('w-full text-left text-sm text-slate-700', className)} {...props}>
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
      className={cn('bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200', className)}
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
        clickable ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50',
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
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-4 py-3 font-semibold text-slate-600', className)} {...props}>
      {children}
    </th>
  )
}

export function TableCell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3.5 align-middle text-slate-700', className)} {...props}>
      {children}
    </td>
  )
}
