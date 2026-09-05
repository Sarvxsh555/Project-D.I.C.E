import React from 'react'
import { AuthProvider } from './AuthContext'
import { ToastProvider } from '../components/ui/Toast'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  )
}
