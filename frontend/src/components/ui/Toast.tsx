import React, { useState, useCallback } from 'react'
import { cn } from '../../utils/cn'
import { ToastContext, type ToastItem, type ToastType, type ToastContextType } from './toastContextInstance'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    ({ message, title, type = 'info' }: { message: string; title?: string; type?: ToastType }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, title, message, type }])

      setTimeout(() => {
        removeToast(id)
      }, 4500)
    },
    [removeToast]
  )

  const value: ToastContextType = {
    toast: addToast,
    success: (message, title) => addToast({ message, title, type: 'success' }),
    error: (message, title) => addToast({ message, title, type: 'error' }),
    warning: (message, title) => addToast({ message, title, type: 'warning' }),
    info: (message, title) => addToast({ message, title, type: 'info' }),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-md bg-white animate-in slide-in-from-bottom-2 duration-150',
              item.type === 'success' && 'border-emerald-200 text-emerald-900',
              item.type === 'error' && 'border-rose-200 text-rose-900',
              item.type === 'warning' && 'border-amber-200 text-amber-900',
              item.type === 'info' && 'border-sky-200 text-sky-900'
            )}
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'success' && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
              {item.type === 'error' && (
                <div className="w-2 h-2 rounded-full bg-rose-500" />
              )}
              {item.type === 'warning' && (
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              )}
              {item.type === 'info' && (
                <div className="w-2 h-2 rounded-full bg-sky-500" />
              )}
            </div>
            <div className="flex-1 text-xs">
              {item.title && <p className="font-semibold text-slate-900 mb-0.5">{item.title}</p>}
              <p className="text-slate-600">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="text-slate-400 hover:text-slate-600 -mr-1 -mt-1 p-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
