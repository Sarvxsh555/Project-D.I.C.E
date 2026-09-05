import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, LogOut, User, Building, ExternalLink } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

interface PortalLayoutProps {
  children: React.ReactNode
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const { currentUser, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const clientName = currentUser?.name || currentUser?.username || 'Client Partner'
  const companyName = currentUser?.departmentOrCompany || 'Enterprise Client'

  return (
    <div className="min-h-screen bg-slate-50/80 bg-grid-pattern-light flex flex-col text-slate-900 font-sans antialiased">
      {/* Isolated, High-Assurance Customer Top Bar */}
      <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand Logo & Portal Identifier */}
          <div className="flex items-center gap-3">
            <Link to="/portal" className="flex items-center gap-2.5 focus:outline-none">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                D
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-wider text-slate-900 font-mono text-xs leading-none">
                    D.I.C.E.
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    PORTAL
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 tracking-tight">
                  Commercial Proposal Gateway
                </span>
              </div>
            </Link>

            <div className="hidden md:block h-4 w-px bg-slate-200" />
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[200px]">{companyName}</span>
            </div>
          </div>

          {/* Right Section: Security Indicator, User Profile & Logout Action */}
          <div className="flex items-center gap-3">
            {/* Security Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="text-[11px]">TLS 1.3 Encrypted Session</span>
            </div>

            {/* Authenticated Customer Identity */}
            {isAuthenticated && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 leading-tight">
                      {clientName}
                    </span>
                    <Badge variant="success" size="sm">
                      CUSTOMER
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono leading-tight">
                    Client Stakeholder
                  </span>
                </div>
              </div>
            )}

            {/* Explicit Sign Out / Logout Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs px-2.5 py-1.5 border-slate-300 text-slate-700 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-2xs font-medium"
              title="End customer portal session and sign out"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Portal Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Customer Footer with Secondary Sign Out */}
      <footer className="bg-white/95 backdrop-blur-xs border-t border-slate-200/90 py-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">D.I.C.E. Enterprise</span>
            <span>•</span>
            <span>Customer Commercial Proposal & Acceptance Gateway</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <LogOut className="w-3 h-3" />
              <span>Log Out of Session</span>
            </button>
            <span className="text-slate-300">•</span>
            <Link to="/login" className="text-slate-500 hover:text-slate-900 hover:underline font-mono flex items-center gap-1">
              <span>Switch Account</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PortalLayout
