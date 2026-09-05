import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  Briefcase,
  CheckCircle2,
  Landmark,
  Warehouse,
  ShieldCheck,
  Building2,
  Lock,
  User,
  ArrowRight,
  Shield,
  Check,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types/auth'
import { STAKEHOLDER_DEFINITIONS } from '../../types/auth'
import { DEMO_ACCOUNTS } from '../../constants/roles'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

interface RoleOption {
  role: Role
  icon: React.ElementType
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: 'SALES_REP', icon: Briefcase },
  { role: 'SALES_MANAGER', icon: CheckCircle2 },
  { role: 'FINANCE', icon: Landmark },
  { role: 'OPERATIONS', icon: Warehouse },
  { role: 'ADMIN', icon: ShieldCheck },
  { role: 'CUSTOMER', icon: Building2 },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, getDefaultDashboard } = useAuth()

  // Pre-select role from search query or default to SALES_REP
  const initialRole = (searchParams.get('role') as Role) || 'SALES_REP'
  const [selectedRole, setSelectedRole] = useState<Role>(
    STAKEHOLDER_DEFINITIONS[initialRole] ? initialRole : 'SALES_REP'
  )

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('dice-demo')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const justRegistered = searchParams.get('registered') === '1'

  // Populate username when stakeholder role changes
  useEffect(() => {
    const demoAcc = DEMO_ACCOUNTS.find((a) => a.role === selectedRole)
    if (demoAcc) {
      setUsername(demoAcc.username)
    }
    setErrorMessage(null)
  }, [selectedRole])

  const currentMeta = STAKEHOLDER_DEFINITIONS[selectedRole]
  const demoAccount = DEMO_ACCOUNTS.find((a) => a.role === selectedRole)

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    try {
      const resp = await login({ username, password })
      const userRole = resp.roles?.[0] || selectedRole
      const targetDashboard = (location.state as { from?: { pathname: string } })?.from?.pathname || getDefaultDashboard(userRole)
      navigate(targetDashboard, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleInstantStakeholderLogin = async (role: Role) => {
    setSelectedRole(role)
    setLoading(true)
    setErrorMessage(null)

    const targetDemo = DEMO_ACCOUNTS.find((a) => a.role === role)
    if (targetDemo) {
      try {
        await login({ username: targetDemo.username, password: 'dice-demo' })
        const targetDashboard = getDefaultDashboard(role)
        navigate(targetDashboard, { replace: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Demo login failed — the backend may be unreachable.'
        setErrorMessage(msg)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-slate-900 antialiased">
      {/* Top Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xs px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center font-bold text-sm tracking-tight text-slate-900">
            <span className="px-2.5 py-1 rounded bg-[#714B67] text-white font-semibold text-xs tracking-wide shadow-xs">
              odoo
            </span>
            <span className="mx-2 text-slate-300 font-light text-sm">×</span>
            <span className="font-extrabold tracking-wider text-slate-900 font-mono text-xs">
              D.I.C.E.
            </span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
            Commercial Governance Gateway
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Decision Engine Online
          </span>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <Link
            to={`/signup?role=${selectedRole}`}
            className="font-medium text-[#714B67] hover:text-[#5a3b52] transition-colors"
          >
            Register Stakeholder →
          </Link>
        </div>
      </header>

      {/* Main Centered Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch shadow-lg shadow-slate-200/40 rounded-xl overflow-hidden border border-slate-200 bg-white">
          
          {/* Left Column: Stakeholder Role Selector */}
          <div className="lg:col-span-5 bg-slate-50/60 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/80">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="w-4 h-4 text-[#714B67]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#714B67] font-bold">
                  Clearance Protocol
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Stakeholder Clearance
              </h2>
              <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                Select your operational role to enter your dedicated workflow and enforce commercial policy rules.
              </p>

              {/* Stakeholder Role Cards */}
              <div className="space-y-2">
                {ROLE_OPTIONS.map((item) => {
                  const meta = STAKEHOLDER_DEFINITIONS[item.role]
                  const isSelected = selectedRole === item.role
                  const Icon = item.icon

                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setSelectedRole(item.role)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-[#714B67] bg-white shadow-xs ring-1 ring-[#714B67]/20 border-l-4 border-l-[#714B67]'
                          : 'border-slate-200/70 bg-white/60 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-sm transition-colors ${
                          isSelected
                            ? 'bg-[#714B67] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#714B67]' : 'text-slate-900'}`}>
                            {meta.title}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#714B67] flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {meta.subtitle}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scope Summary Preview */}
            <div className="mt-6 pt-4 border-t border-slate-200 bg-white -mx-6 -mb-6 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Default View
                </span>
                <Badge variant={currentMeta.badgeVariant} size="sm">
                  {currentMeta.defaultDashboard}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {currentMeta.description}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-mono">Modules:</span>
                {currentMeta.allowedRoutes.map((route) => (
                  <span
                    key={route}
                    className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono text-slate-700 font-medium"
                  >
                    {route === '/' ? '/dashboard' : route}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Sign-In Credentials Form */}
          <div className="lg:col-span-7 p-7 flex flex-col justify-between bg-white">
            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                    Authentication Gate
                  </div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                    <span>{currentMeta.title}</span>
                    <Badge variant={currentMeta.badgeVariant} size="sm">
                      {selectedRole}
                    </Badge>
                  </h3>
                </div>
                {demoAccount && (
                  <button
                    type="button"
                    onClick={() => handleInstantStakeholderLogin(selectedRole)}
                    disabled={loading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md border border-[#714B67] text-[#714B67] bg-[#FAF5F9] hover:bg-[#714B67] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>⚡ 1-Click Demo Login</span>
                  </button>
                )}
              </div>

              {justRegistered && !errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Account created. Sign in with your new credentials below.</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Authentication Notice</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleFormLogin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Stakeholder Username / Identifier:
                    </label>
                    {demoAccount && (
                      <span className="text-[11px] font-mono text-slate-400">
                        demo: <strong className="text-[#714B67]">{demoAccount.username}</strong>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all bg-slate-50/50 hover:bg-white"
                      placeholder="e.g. sales_rep or marcus.v"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Security Password:
                    </label>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                      password: dice-demo
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all bg-slate-50/50 hover:bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={loading}
                    className="w-full bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center justify-center gap-2 rounded-md text-xs py-2.5 shadow-sm transition-all cursor-pointer font-semibold"
                  >
                    <span>{loading ? 'Verifying Credentials...' : `Enter ${currentMeta.title} Workspace`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Demo Switcher Matrix */}
            <div className="mt-8 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">
                  Quick-Switch Stakeholders
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1-click instant login</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const meta = STAKEHOLDER_DEFINITIONS[acc.role]
                  const isActive = selectedRole === acc.role
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleInstantStakeholderLogin(acc.role)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#714B67] bg-[#FAF5F9] ring-1 ring-[#714B67]/20'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-800 text-[11px] truncate">
                        {meta.title}
                      </div>
                      <div className="text-[10px] text-[#714B67] font-mono truncate font-medium mt-0.5">
                        {acc.username}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 text-center text-xs text-slate-500">
                Onboarding a new commercial team member?{' '}
                <Link
                  to={`/signup?role=${selectedRole}`}
                  className="font-semibold text-[#714B67] hover:underline"
                >
                  Register Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-3 px-6 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Odoo X D.I.C.E.</span>
          <span>•</span>
          <span>Commercial Governance & Compliance Decision Engine</span>
        </div>
        <span className="font-mono text-slate-400">
          Odoo Community Integration • ISO 27001 RBAC Certified
        </span>
      </footer>
    </div>
  )
}
