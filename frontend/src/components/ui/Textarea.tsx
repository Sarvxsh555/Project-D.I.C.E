import React from 'react'
import { cn } from '../../utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, disabled, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={cn(
            'w-full bg-white text-slate-900 placeholder:text-slate-400 border rounded-md text-sm transition-colors',
            'py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#5E2A52]/20 focus:border-[#5E2A52]',
            'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed resize-y',
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 hover:border-slate-400',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        {!error && hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
