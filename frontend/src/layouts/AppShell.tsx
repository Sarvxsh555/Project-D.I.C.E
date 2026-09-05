import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Shield, ShieldCheck, Lock, Bell } from 'lucide-react'
import { TOP_NAV_ITEMS } from '../constants/navigation'
import { useAuth } from '../hooks/useAuth'
import { STAKEHOLDER_DEFINITIONS } from '../types/auth'
import { cn } from '../utils/cn'
import { Dropdown } from '../components/ui/Dropdown'
import { Badge } from '../components/ui/Badge'

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout, getDefaultDashboard } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)


  const currentStakeholder = STAKEHOLDER_DEFINITIONS[currentUser.role] || STAKEHOLDER_DEFINITIONS.SALES_REP
  const allowedRoutes = currentStakeholder.allowedRoutes || ['/']

  // Filter top navigation based on current stakeholder's authorized routes
  const visibleNavItems = TOP_NAV_ITEMS.filter((item) => {
    if (item.href === '/') {
      return allowedRoutes.includes('/') || allowedRoutes.includes('/dashboard')
    }
    return allowedRoutes.some(
      (route) => route !== '/' && (item.href === route || item.href.startsWith(route))
    )
  })

  const isCurrentPath = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  const roleDropdownItems = [
    // Current Workspace Status (Strictly Locked)
    {
      id: 'current-workspace',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />,
      label: (
        <div className="flex flex-col py-0.5">
          <span className="text-xs font-bold text-slate-900 leading-tight">
            {currentStakeholder.title}
          </span>
          <span className="text-[10px] text-emerald-600 font-mono font-semibold">
            Strict Workspace Lock • Active
          </span>
        </div>
      ),
      onClick: () => {},
      disabled: true,
    },
    // Cross-Dashboard Mapping Policy
    {
      id: 'isolation-policy',
      icon: <Lock className="w-3.5 h-3.5 text-slate-400" />,
      label: (
        <span className="text-[11px] text-slate-500 font-mono">
          Cross-Role Mapping: Disabled
        </span>
      ),
      onClick: () => {},
      disabled: true,
    },
    // Switch Account / Login with different credentials
    {
      id: 'sign-in-screen',
      icon: <Shield className="w-3.5 h-3.5 text-slate-500" />,
      label: (
        <span className="text-xs text-slate-700">
          Switch Clearance Account
        </span>
      ),
      onClick: () => navigate('/login'),
    },
    // Logout
    {
      id: 'action-logout',
      icon: <LogOut className="w-3.5 h-3.5 text-rose-600" />,
      danger: true,
      label: (
        <span className="text-xs font-semibold text-rose-600">
          Sign Out
        </span>
      ),
      onClick: () => {
        logout()
        navigate('/login')
      },
    },
  ]



  return (
    <div className="min-h-screen bg-slate-50/80 bg-grid-pattern-light flex flex-col text-slate-900 antialiased font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 shadow-2xs">
        <div className="h-0.5 bg-slate-900 w-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Brand & Navigation */}
            <div className="flex items-center gap-6">
              {/* Brand Logo */}
              <Link
                to={getDefaultDashboard(currentUser.role)}
                className="flex items-center gap-2.5 focus:outline-none group py-1"
                title="D.I.C.E. Enterprise Commercial OS"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs group-hover:bg-slate-800 transition-colors">
                  D
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight text-slate-900 font-mono">
                      D.I.C.E.
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      ENTERPRISE
                    </span>
                  </div>
                </div>
              </Link>

              <div className="h-5 w-px bg-slate-200 hidden lg:block" />

              {/* Desktop Nav Items */}
              <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
                {visibleNavItems.map((item) => {
                  const active = isCurrentPath(item.href)
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'relative px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                        active
                          ? 'text-slate-900 bg-slate-100 font-semibold ring-1 ring-slate-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      )}
                    >
                      <span>{item.name}</span>
                      {item.badgeKey === 'pendingApprovals' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white" />
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right: Notifications, Active Stakeholder Badge & User Profile */}
            <div className="flex items-center gap-2.5">
              {/* Notifications */}
              <button
                type="button"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>

              {/* Active Stakeholder Role Pill */}
              <div className="hidden sm:flex items-center">
                <Badge variant={currentStakeholder.badgeVariant} size="sm">
                  {currentStakeholder.title}
                </Badge>
              </div>

              {/* Persona / Role Selector */}
              <Dropdown
                align="right"
                className="w-auto"
                trigger={
                  <button
                    type="button"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-xs text-left cursor-pointer shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-[10px]">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="hidden sm:flex flex-col">
                      <span className="font-semibold text-slate-800 leading-tight text-xs">
                        {currentUser.name}
                      </span>
                    </div>
                    <svg className="w-3 h-3 text-slate-400 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                }
                items={roleDropdownItems}
              />

              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-3 space-y-1 shadow-md">
            <div className="pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">Role Clearance:</span>
              <Badge variant={currentStakeholder.badgeVariant} size="sm">
                {currentStakeholder.title}
              </Badge>
            </div>
            {visibleNavItems.map((item) => {
              const active = isCurrentPath(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-xs font-medium transition-colors',
                    active
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {children}
      </main>

      {/* Enterprise Subtle Footer */}
      <footer className="bg-white/95 backdrop-blur-xs border-t border-slate-200/90 py-3 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">D.I.C.E. Enterprise</span>
            <span className="text-slate-300">•</span>
            <span>Commercial Operating System & Governance Engine</span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Decision Engine Active • MySQL 8.4 • {currentStakeholder.title} ({currentUser.username})
          </span>
        </div>
      </footer>
    </div>
  )
}
