import { createContext } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
}

export interface ToastContextType {
  toast: (options: { message: string; title?: string; type?: ToastType }) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)
