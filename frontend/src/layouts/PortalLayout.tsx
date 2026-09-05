import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

interface PortalLayoutProps {
  children: React.ReactNode
}

export function PortalLayout({ children }: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Isolated, Trustworthy Customer Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#5E2A52] flex items-center justify-center text-white font-bold text-sm">
              DF
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">
                DealFlow<span className="text-[#5E2A52]">360</span> Customer Portal
              </div>
              <div className="text-[10px] text-slate-400">Secure Commercial Client Workspace</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">256-bit Encrypted Session</span>
          </div>
        </div>
      </header>

      {/* Portal Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Customer Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Official Commercial Proposal by DealFlow360 Enterprise Platform</span>
          <Link to="/" className="text-slate-500 hover:text-[#5E2A52] text-[11px]">
            Internal Staff Portal Switcher
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default PortalLayout
