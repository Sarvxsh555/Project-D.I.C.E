import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, ExternalLink, UserCheck, Shield, Bell } from 'lucide-react'
import { TOP_NAV_ITEMS } from '../constants/navigation'
import { DEMO_ACCOUNTS } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import { STAKEHOLDER_DEFINITIONS } from '../types/auth'
import type { Role } from '../types/auth'
import { cn } from '../utils/cn'
import { Dropdown } from '../components/ui/Dropdown'
import { Badge } from '../components/ui/Badge'

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, switchRole, logout, getDefaultDashboard } = useAuth()
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

  const handleRoleSwitch = (role: Role) => {
    switchRole(role)
    const newDef = STAKEHOLDER_DEFINITIONS[role]
    const isStillAllowed = newDef.allowedRoutes.some((r) =>
      r === '/' ? location.pathname === '/' || location.pathname === '/dashboard' : location.pathname.startsWith(r)
    )
    if (!isStillAllowed) {
      navigate(newDef.defaultDashboard)
    }
  }

  const roleDropdownItems = [
    // Stakeholder quick switches
    ...DEMO_ACCOUNTS.map((acc) => {
      const def = STAKEHOLDER_DEFINITIONS[acc.role]
      const isActive = currentUser.role === acc.role
      return {
        id: `switch-${acc.username}`,
        icon: <UserCheck className={cn('w-3.5 h-3.5', isActive ? 'text-[#5E2A52]' : 'text-slate-400')} />,
        label: (
          <div className="flex items-center justify-between w-full pr-1">
            <span className={cn('text-xs', isActive ? 'font-bold text-[#5E2A52]' : 'text-slate-700')}>
              {def?.title || acc.role}
            </span>
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#5E2A52]" />}
          </div>
        ),
        onClick: () => handleRoleSwitch(acc.role),
      }
    }),
    // External customer portal preview
    {
      id: 'open-portal',
      icon: <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />,
      label: (
        <span className="text-xs font-medium text-emerald-700">
          Open Customer Portal
        </span>
      ),
      onClick: () => navigate('/portal'),
    },
    // Sign In / Switch Account
    {
      id: 'sign-in-screen',
      icon: <Shield className="w-3.5 h-3.5 text-slate-500" />,
      label: (
        <span className="text-xs text-slate-700">
          Switch Account / Login
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
      {/* Top Navigation Bar - Visually quiet enterprise shell */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Left: Brand & Navigation */}
            <div className="flex items-center gap-6">
              {/* Brand Logo */}
              <Link to={getDefaultDashboard(currentUser.role)} className="flex items-center gap-2 focus:outline-none group">
                <div className="w-7 h-7 rounded bg-[#5E2A52] flex items-center justify-center text-white">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold tracking-tight text-slate-900 group-hover:text-[#5E2A52] transition-colors leading-none">
                    DealFlow<span className="text-[#5E2A52]">360</span>
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Items */}
              <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
                {visibleNavItems.map((item) => {
                  const active = isCurrentPath(item.href)
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'relative px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5',
                        active
                          ? 'text-[#5E2A52] bg-[#FAF5F9] font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      )}
                    >
                      <span>{item.name}</span>
                      {item.badgeKey === 'pendingApprovals' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      {active && (
                        <span className="absolute -bottom-[9px] inset-x-2.5 h-0.5 bg-[#5E2A52]" />
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
                className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none"
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
                    className="flex items-center gap-2 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs text-left cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded bg-[#FAF5F9] border border-[#E8D4E3] text-[#5E2A52] flex items-center justify-center font-bold text-[10px]">
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
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Decision Engine Online • Active Profile: {currentStakeholder.title} ({currentUser.username})
          </span>
        </div>
      </footer>
    </div>
  )
}

