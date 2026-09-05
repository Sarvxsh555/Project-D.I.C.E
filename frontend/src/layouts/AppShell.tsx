import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { TOP_NAV_ITEMS } from '../constants/navigation'
import { DEMO_ACCOUNTS } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../utils/cn'
import { Dropdown } from '../components/ui/Dropdown'

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const { currentUser, switchUser } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isCurrentPath = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  const roleDropdownItems = DEMO_ACCOUNTS.map((acc) => ({
    id: acc.username,
    label: (
      <div className="flex flex-col py-0.5">
        <span className="font-semibold text-slate-800">{acc.name}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{acc.role.replace('_', ' ')}</span>
      </div>
    ),
    onClick: () => switchUser(acc.username),
  }))

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Brand & Navigation */}
            <div className="flex items-center gap-6">
              {/* Brand Logo */}
              <Link to="/" className="flex items-center gap-2.5 focus:outline-none group">
                <div className="w-8 h-8 rounded bg-[#5E2A52] flex items-center justify-center text-white shadow-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-[#5E2A52] transition-colors">
                    DealFlow<span className="text-[#5E2A52]">360</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold -mt-0.5">
                    Sales Ops OS
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Items */}
              <nav className="hidden xl:flex items-center space-x-1" aria-label="Main Navigation">
                {TOP_NAV_ITEMS.map((item) => {
                  const active = isCurrentPath(item.href)
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                        active
                          ? 'text-[#5E2A52] bg-[#FAF5F9] font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      )}
                    >
                      <span>{item.name}</span>
                      {item.badgeKey === 'pendingApprovals' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      {active && (
                        <span className="absolute -bottom-[9px] inset-x-3 h-0.5 bg-[#5E2A52] rounded-full" />
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right: Quick Role Switcher Persona & User Profile */}
            <div className="flex items-center gap-3">
              {/* Secondary Navigation for Lg screens */}
              <nav className="hidden lg:flex xl:hidden items-center space-x-1 text-xs">
                <Link
                  to="/quotations"
                  className={cn(
                    'px-2.5 py-1.5 rounded-md font-medium',
                    isCurrentPath('/quotations') ? 'text-[#5E2A52] bg-[#FAF5F9]' : 'text-slate-600'
                  )}
                >
                  Quotations
                </Link>
                <Link
                  to="/approvals"
                  className={cn(
                    'px-2.5 py-1.5 rounded-md font-medium',
                    isCurrentPath('/approvals') ? 'text-[#5E2A52] bg-[#FAF5F9]' : 'text-slate-600'
                  )}
                >
                  Approvals
                </Link>
                <Link
                  to="/negotiations"
                  className={cn(
                    'px-2.5 py-1.5 rounded-md font-medium',
                    isCurrentPath('/negotiations') ? 'text-[#5E2A52] bg-[#FAF5F9]' : 'text-slate-600'
                  )}
                >
                  Negotiate
                </Link>
              </nav>

              {/* Persona / Role Selector */}
              <Dropdown
                align="right"
                trigger={
                  <button
                    type="button"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs text-left cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#FAF5F9] border border-[#E8D4E3] text-[#5E2A52] flex items-center justify-center font-bold text-[10px]">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="hidden sm:flex flex-col">
                      <span className="font-semibold text-slate-800 leading-tight">
                        {currentUser.name}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-none">
                        {currentUser.role.replace('_', ' ')}
                      </span>
                    </div>
                    <svg className="w-3.5 h-3.5 text-slate-400 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="xl:hidden p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none"
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
          <div className="xl:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-3 space-y-1 shadow-md">
            {TOP_NAV_ITEMS.map((item) => {
              const active = isCurrentPath(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-xs font-medium transition-colors',
                    active
                      ? 'bg-[#FAF5F9] text-[#5E2A52] font-semibold'
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Enterprise Subtle Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DealFlow360 Enterprise Sales Operations Platform</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Decision Engine Online • Flyway v1.0.0
          </span>
        </div>
      </footer>
    </div>
  )
}
