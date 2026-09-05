import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

interface PortalLayoutProps {
  children: React.ReactNode
}

export function PortalLayout({ children }: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 font-sans antialiased">
      {/* Isolated, Trustworthy Customer Top Bar */}
      <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center font-bold text-sm tracking-tight text-slate-900">
              <span className="px-2.5 py-1 rounded bg-[#714B67] text-white font-semibold text-xs tracking-wide shadow-2xs">
                odoo
              </span>
              <span className="mx-2 text-slate-300 font-light text-sm">×</span>
              <span className="font-extrabold tracking-wider text-slate-900 font-mono text-xs">
                D.I.C.E.
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-slate-200" />
            <div className="hidden sm:block text-xs font-semibold text-slate-600">
              Customer Portal
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Encrypted Commercial Session</span>
          </div>
        </div>
      </header>

      {/* Portal Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Customer Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Odoo X D.I.C.E.</span>
            <span>•</span>
            <span>Customer Commercial Proposal & Acceptance Gateway</span>
          </div>
          <Link to="/" className="text-slate-500 hover:text-[#714B67] hover:underline font-mono">
            Internal Staff Portal →
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default PortalLayout
