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
  const { login, switchUser, getDefaultDashboard } = useAuth()

  // Pre-select role from search query or default to SALES_REP
  const initialRole = (searchParams.get('role') as Role) || 'SALES_REP'
  const [selectedRole, setSelectedRole] = useState<Role>(
    STAKEHOLDER_DEFINITIONS[initialRole] ? initialRole : 'SALES_REP'
  )

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('demo1234')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)

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
        await login({ username: targetDemo.username, password: 'password123' })
        const targetDashboard = getDefaultDashboard(role)
        navigate(targetDashboard, { replace: true })
      } catch {
        // Fallback to switchUser
        switchUser(targetDemo.username)
        navigate(getDefaultDashboard(role), { replace: true })
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-slate-900">
      {/* Top Bar */}
      <div className="w-full border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#5E2A52] flex items-center justify-center text-white shadow-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900">
              DealFlow<span className="text-[#5E2A52]">360</span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block -mt-0.5">
              Enterprise Access Gateway
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:flex items-center gap-1.5 text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Auth Service: Operational
          </span>
          <Link
            to={`/signup?role=${selectedRole}`}
            className="font-medium text-[#5E2A52] hover:text-[#4a1f40] hover:underline"
          >
            Create Stakeholder Account
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Stakeholder Role Selector & Scope Details */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-[#5E2A52]" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  Role-Based Gateway
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Select Your Stakeholder Role
              </h2>
              <p className="text-xs text-slate-500 mt-1 mb-3.5 leading-relaxed">
                Authentication routes each stakeholder directly to their dedicated command dashboard and enforces role boundaries.
              </p>

              {/* Stakeholder Role Cards */}
              <div className="space-y-1.5">
                {ROLE_OPTIONS.map((item) => {
                  const meta = STAKEHOLDER_DEFINITIONS[item.role]
                  const isSelected = selectedRole === item.role
                  const Icon = item.icon

                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setSelectedRole(item.role)}
                      className={`w-full text-left p-2.5 rounded border transition-colors flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-[#5E2A52] bg-[#FAF5F9]'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-sm ${
                          isSelected
                            ? 'bg-[#5E2A52] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-[#5E2A52]' : 'text-slate-900'}`}>
                            {meta.title}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#5E2A52] flex-shrink-0" />}
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

            {/* Selected Role Summary & Route Matrix Preview */}
            <div className="mt-5 pt-3.5 border-t border-slate-200 bg-slate-50/80 -mx-5 -mb-5 p-4 rounded-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  Target Landing:
                </span>
                <Badge variant={currentMeta.badgeVariant}>
                  {currentMeta.defaultDashboard}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                {currentMeta.description}
              </p>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Authorized Modules:
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentMeta.allowedRoutes.map((route) => (
                    <span
                      key={route}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-700"
                    >
                      {route === '/' ? '/dashboard' : route}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sign-In Credentials Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Signing In As
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{currentMeta.title}</span>
                    <Badge variant={currentMeta.badgeVariant} size="sm">
                      {selectedRole}
                    </Badge>
                  </h3>
                </div>
                {demoAccount && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInstantStakeholderLogin(selectedRole)}
                    disabled={loading}
                    className="text-xs border-[#5E2A52] text-[#5E2A52] hover:bg-[#FAF5F9] rounded py-1 px-2.5"
                  >
                    Instant 1-Click Login
                  </Button>
                )}
              </div>

              {errorMessage && (
                <div className="mb-4 p-2.5 rounded bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Authentication Notice</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {forgotSent && (
                <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                  Password reset link has been dispatched to {demoAccount?.email || 'your registered corporate address'}.
                </div>
              )}

              <form onSubmit={handleFormLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stakeholder Identifier / Username:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#5E2A52] focus:border-[#5E2A52]"
                      placeholder="e.g. sales_rep or sarah.j"
                    />
                  </div>
                  {demoAccount && (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Demo Profile: <code className="text-slate-600 font-semibold">{demoAccount.username}</code> ({demoAccount.name})
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Security Password:
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotSent(true)}
                      className="text-[11px] text-[#5E2A52] hover:underline"
                    >
                      Reset Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#5E2A52] focus:border-[#5E2A52]"
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
                    className="w-full bg-[#5E2A52] hover:bg-[#4d2243] flex items-center justify-center gap-2 rounded text-xs py-2"
                  >
                    <span>{loading ? 'Verifying Credentials...' : `Enter ${currentMeta.title} Hub`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Demo Accounts Matrix */}
            <div className="mt-8 pt-5 border-t border-slate-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2.5">
                Quick-Switch Demo Stakeholders
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const meta = STAKEHOLDER_DEFINITIONS[acc.role]
                  const isActive = selectedRole === acc.role
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleInstantStakeholderLogin(acc.role)}
                      className={`p-2 rounded border text-left text-xs transition-all ${
                        isActive
                          ? 'border-[#5E2A52] bg-[#FAF5F9]'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 text-[11px] truncate">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-[#5E2A52] font-mono truncate">
                        {meta.title.split(' ')[0]}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 text-center text-xs text-slate-500">
                Registering a new team member?{' '}
                <Link
                  to={`/signup?role=${selectedRole}`}
                  className="font-semibold text-[#5E2A52] hover:underline"
                >
                  Register New Stakeholder
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full border-t border-slate-200 bg-white py-3 px-6 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>DealFlow360 Enterprise Sales Operations Platform • DICE Decision Engine</span>
        <span className="font-mono text-slate-400">Strict RBAC Enforced • ISO 27001 Compliant Architecture</span>
      </div>
    </div>
  )
}
