import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Landmark,
  Warehouse,
  Building2,
  Check,
  Globe,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types/auth'
import { STAKEHOLDER_DEFINITIONS } from '../../types/auth'
import { DEMO_ACCOUNTS } from '../../constants/roles'

interface QuickFillAccount {
  name: string
  title: string
  role: Role
  badgeText: string
  badgeClass: string
  username: string
  icon: React.ElementType
}

const QUICK_FILL_ACCOUNTS: QuickFillAccount[] = [
  {
    name: 'Arjun Mehta',
    title: 'Sales Executive (Commercial)',
    role: 'SALES_REP',
    badgeText: 'Sales Rep',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    username: 'sales_rep',
    icon: Briefcase,
  },
  {
    name: 'Priya Sharma',
    title: 'Regional Sales Director',
    role: 'SALES_MANAGER',
    badgeText: 'Manager',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    username: 'sales_manager',
    icon: CheckCircle2,
  },
  {
    name: 'Rahul Gupta',
    title: 'Chief Financial Officer',
    role: 'FINANCE',
    badgeText: 'Finance',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    username: 'finance',
    icon: Landmark,
  },
  {
    name: 'Sunita Patel',
    title: 'Logistics & Depot Director',
    role: 'OPERATIONS',
    badgeText: 'Operations',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    username: 'operations',
    icon: Warehouse,
  },
  {
    name: 'Vikram Singh',
    title: 'Enterprise Super Admin',
    role: 'ADMIN',
    badgeText: 'Admin',
    badgeClass: 'bg-slate-900 text-white border-slate-900',
    username: 'admin',
    icon: ShieldCheck,
  },
  {
    name: 'Anjali Customer',
    title: 'Client VP (Tata Consultancy)',
    role: 'CUSTOMER',
    badgeText: 'Customer',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    username: 'customer',
    icon: Building2,
  },
]

const PRINCIPLES = [
  { label: 'Intelligence', desc: 'Real-time margin scoring & deal risk analytics' },
  { label: 'Compliance', desc: 'Automated discount policy validation & guardrails' },
  { label: 'Governance', desc: 'Multi-tier approval matrices for commercial exceptions' },
  { label: 'Pipeline', desc: 'Single source of truth across Sales, Finance & Ops' },
  { label: 'Margin Yield', desc: 'Protecting gross profitability on every quotation' },
  { label: 'Fulfillment', desc: 'Live depot inventory reservations & dispatch sync' },
  { label: 'Audit Trail', desc: 'Tamper-evident logging for all contractual commitments' },
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

  const [username, setUsername] = useState('sales_rep')
  const [password, setPassword] = useState('dice-demo')
  const [showPassword, setShowPassword] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)

  // Sync username on role selection
  useEffect(() => {
    const demoAcc = DEMO_ACCOUNTS.find((a) => a.role === selectedRole)
    if (demoAcc) {
      setUsername(demoAcc.username)
    }
    setErrorMessage(null)
  }, [selectedRole])

  const handleSelectQuickFill = (acc: QuickFillAccount) => {
    setSelectedRole(acc.role)
    setUsername(acc.username)
    setPassword('dice-demo')
    setErrorMessage(null)
  }

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    try {
      const resp = await login({ username: username.trim(), password })
      const userRole = resp.roles?.[0] || selectedRole
      const targetDashboard =
        (location.state as { from?: { pathname: string } })?.from?.pathname ||
        getDefaultDashboard(userRole)
      navigate(targetDashboard, { replace: true })
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify your credentials.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row antialiased text-slate-900 selection:bg-slate-900 selection:text-white">
      
      {/* ========================================================================= */}
      {/* LEFT SECTION: WHITE-THEMED OPERATING SYSTEM HERO                         */}
      {/* ========================================================================= */}
      <div className="lg:w-5/12 xl:w-5/12 w-full p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-slate-50/80 bg-grid-pattern-light border-b lg:border-b-0 lg:border-r border-slate-200/90 relative">
        
        {/* Top Branding (Logo Badge + System Title) */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Globe className="w-5 h-5 text-white stroke-[2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
              Project D.I.C.E
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mt-1">
              OPERATING SYSTEM
            </span>
          </div>
        </div>

        {/* Center Hero Section */}
        <div className="my-10 lg:my-auto max-w-md">
          {/* Context Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-mono shadow-2xs mb-6">
            D.I.C.E Technologies · Enterprise OS
          </div>

          {/* Large Bold Headline */}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-[1.2] mb-8">
            One system for execution,<br />
            accountability & outreach.
          </h1>

          {/* Principles Matrix (Left bold slate-900, right muted slate-500) */}
          <div className="space-y-2.5">
            {PRINCIPLES.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline gap-4 text-xs sm:text-sm"
              >
                <span className="w-32 flex-shrink-0 font-semibold text-slate-900 tracking-tight">
                  {item.label}
                </span>
                <span className="text-slate-500 font-normal">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="text-xs text-slate-400 font-medium">
          Not a CRM. An operating system.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SECTION: HARMONIZED WITH LEFT SIDE COLOR & PALETTE                 */}
      {/* ========================================================================= */}
      <div className="lg:w-7/12 xl:w-7/12 w-full p-6 sm:p-10 lg:p-12 flex items-center justify-center bg-slate-50/50 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto py-2">
          
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-6 sm:p-8 lg:p-9">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-8 divide-y xl:divide-y-0 xl:divide-x divide-slate-200/80">
              
              {/* SUB-COLUMN 1: ERP Form (Matched with Left Side Slate-900 Identity) */}
              <div className="xl:col-span-6 pr-0 xl:pr-6 flex flex-col justify-between">
                <div>
                  {/* Header Title with Deep Slate Accent Bar & Single Login Badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-5 bg-slate-900 rounded-full flex-shrink-0" />
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                        Sign In to D.I.C.E ERP
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                      Single Login
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
                    Enter your credentials below. The system will automatically route you to your assigned dashboard.
                  </p>

                  {/* Status Alerts */}
                  {errorMessage && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {forgotSent && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-center gap-2">
                      <Check className="w-4 h-4 text-slate-900" />
                      <span>Password reset instructions dispatched to your registered email.</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleFormLogin} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Register Number / Employee ID *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. sales_rep or IT2024001"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Password *
                        </label>
                        <button
                          type="button"
                          onClick={() => setForgotSent(true)}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-950 hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Keep Session Logged In & Auth Verification */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={keepLoggedIn}
                          onChange={(e) => setKeepLoggedIn(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                        <span>Keep session logged in</span>
                      </label>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-slate-900" />
                        <span>DICE Auth</span>
                      </div>
                    </div>

                    {/* Submit Action Button (Matched to Slate-900) */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{loading ? 'Authenticating...' : 'Sign In to D.I.C.E ERP Portal'}</span>
                    </button>
                  </form>
                </div>

                {/* Bottom Register Route */}
                <div className="mt-5 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                  <span>Don't have an enterprise account? </span>
                  <Link
                    to={`/signup?role=${selectedRole}`}
                    className="text-slate-900 font-semibold hover:underline"
                  >
                    Register clearance →
                  </Link>
                </div>
              </div>

              {/* SUB-COLUMN 2: Test Account Quick Fill (Matched to Left Side Slate Colors) */}
              <div className="xl:col-span-6 pl-0 xl:pl-6 pt-6 xl:pt-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-slate-700" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Test Account Quick Fill
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Click to select
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">
                    Select any account below to test its role-specific dashboard access:
                  </p>

                  {/* Scrollable Quick Fill Stack */}
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {QUICK_FILL_ACCOUNTS.map((acc) => {
                      const isSelected = username === acc.username
                      const Icon = acc.icon

                      return (
                        <div
                          key={acc.username}
                          onClick={() => handleSelectQuickFill(acc)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50/90 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {acc.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {acc.title}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex-shrink-0 ${acc.badgeClass}`}
                          >
                            {acc.badgeText}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Sub-note */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Strict Role-Locked Session</span>
                  <span>MySQL 8.4 • Verified</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
