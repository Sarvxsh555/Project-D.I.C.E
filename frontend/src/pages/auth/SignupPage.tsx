import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Briefcase,
  CheckCircle2,
  Landmark,
  Warehouse,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  ArrowRight,
  Shield,
  MapPin,
  Building,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { Role, RegisterRequest } from '../../types/auth'
import { STAKEHOLDER_DEFINITIONS } from '../../types/auth'
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

export default function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { register } = useAuth()

  // Pre-select role from search query or default to SALES_REP
  const initialRole = (searchParams.get('role') as Role) || 'SALES_REP'
  const [selectedRole, setSelectedRole] = useState<Role>(
    STAKEHOLDER_DEFINITIONS[initialRole] ? initialRole : 'SALES_REP'
  )

  // Standard fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Role-tailored dynamic fields
  const [territory, setTerritory] = useState('North India Commercial')
  const [departmentOrCompany, setDepartmentOrCompany] = useState('')
  const [warehouseDepot, setWarehouseDepot] = useState('WH-A (Mumbai Central)')
  const [customerGstin, setCustomerGstin] = useState('27AABCA1234F1Z5')

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const currentMeta = STAKEHOLDER_DEFINITIONS[selectedRole]

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const payload: RegisterRequest = {
        username: username.trim().toLowerCase().replace(/\s+/g, '_'),
        password,
        email,
        fullName,
        role: selectedRole,
        territory: selectedRole === 'SALES_REP' ? territory : undefined,
        departmentOrCompany:
          selectedRole === 'CUSTOMER'
            ? departmentOrCompany || 'Client Partner'
            : departmentOrCompany || currentMeta.title,
        warehouseDepot: selectedRole === 'OPERATIONS' ? warehouseDepot : undefined,
      }

      const resp = await register(payload)
      // Register and authenticate are two different actions — the backend
      // deliberately issues no token here. Send the new user to /login to
      // sign in with the credentials they just created.
      navigate(`/login?role=${resp.role}&registered=1`, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try a different username.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
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
            Stakeholder Provisioning
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">Already registered?</span>
          <Link
            to={`/login?role=${selectedRole}`}
            className="font-semibold text-[#714B67] hover:underline"
          >
            Sign In Here →
          </Link>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch shadow-lg shadow-slate-200/50 rounded-xl overflow-hidden border border-slate-200 bg-white">
          
          {/* Left Column: Stakeholder Role Selection */}
          <div className="lg:col-span-5 bg-slate-50/70 p-6 sm:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#714B67]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#714B67] font-bold">
                  Step 1: Stakeholder Role
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">
                Provisioning Role
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Select your functional domain to bind contextual policies, approval matrices, and role clearances.
              </p>

              {/* Role Option List */}
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
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-[#714B67] bg-white shadow-xs ring-1 ring-[#714B67]/20 border-l-4 border-l-[#714B67]'
                          : 'border-slate-200/80 bg-white/60 hover:bg-white hover:border-slate-300'
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

            {/* Scope Box */}
            <div className="mt-6 pt-3.5 border-t border-slate-200 bg-white/80 -mx-6 sm:-mx-7 -mb-6 sm:-mb-7 p-5 rounded-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  Assigned Default Dashboard:
                </span>
                <Badge variant={currentMeta.badgeVariant}>
                  {currentMeta.defaultDashboard}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {currentMeta.description}
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Access: {currentMeta.allowedRoutes.length} Authorized Application Modules
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Role Registration Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Step 2: Profile Specifications
                  </span>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                    <span>{currentMeta.title} Profile</span>
                    <Badge variant={currentMeta.badgeVariant} size="sm">
                      {selectedRole}
                    </Badge>
                  </h3>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Registration Notice</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                {/* Full Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all"
                        placeholder="e.g. Ramesh Kulkarni"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      System Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">@</span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all"
                        placeholder="e.g. ramesh_k"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all"
                      placeholder="ramesh@odoo-dice.internal"
                    />
                  </div>
                </div>

                {/* Role-Specific Dynamic Fields */}
                {selectedRole === 'SALES_REP' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <span className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider block">
                      Sales Rep Configuration
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#714B67]" />
                          Assigned Territory:
                        </label>
                        <select
                          value={territory}
                          onChange={(e) => setTerritory(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67]"
                        >
                          <option value="North India Commercial">North India Commercial</option>
                          <option value="South India Enterprise">South India Enterprise</option>
                          <option value="West India Key Accounts">West India Key Accounts</option>
                          <option value="East India Public Sector">East India Public Sector</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Annual Quota Target:
                        </label>
                        <input
                          type="text"
                          readOnly
                          value="₹50,00,000 (Commercial Enterprise)"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-100/80 text-xs font-mono text-slate-600 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedRole === 'SALES_MANAGER' && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2.5">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                      Sales Manager Cost Center & Authority
                    </span>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-amber-700" />
                        Cost Center / Regional Hierarchy:
                      </label>
                      <input
                        type="text"
                        value={departmentOrCompany}
                        onChange={(e) => setDepartmentOrCompany(e.target.value)}
                        placeholder="e.g. CC-402 Commercial Sales Division"
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === 'FINANCE' && (
                  <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-lg space-y-2.5">
                    <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider block">
                      Finance Entity & Ledger
                    </span>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-sky-700" />
                        Billing Legal Entity:
                      </label>
                      <input
                        type="text"
                        value={departmentOrCompany}
                        onChange={(e) => setDepartmentOrCompany(e.target.value)}
                        placeholder="e.g. Odoo X D.I.C.E. Enterprise Operations Pvt Ltd"
                        className="w-full px-2.5 py-1.5 border border-sky-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === 'OPERATIONS' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                      WMS Primary Depot Allocation
                    </span>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Warehouse className="w-3.5 h-3.5 text-slate-700" />
                        Assigned Warehouse Depot:
                      </label>
                      <select
                        value={warehouseDepot}
                        onChange={(e) => setWarehouseDepot(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-600"
                      >
                        <option value="WH-A (Mumbai Central)">WH-A (Mumbai Central Depot - 1,200 units capacity)</option>
                        <option value="WH-B (Bengaluru Hub)">WH-B (Bengaluru Tech Hub - 900 units capacity)</option>
                        <option value="WH-C (Delhi NCR)">WH-C (Delhi NCR Logistics Depot - 650 units capacity)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedRole === 'CUSTOMER' && (
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2.5">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      Client Organization Credentials
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-emerald-700" />
                          Company Name:
                        </label>
                        <input
                          type="text"
                          required
                          value={departmentOrCompany}
                          onChange={(e) => setDepartmentOrCompany(e.target.value)}
                          placeholder="e.g. Acme Corporation"
                          className="w-full px-2.5 py-1.5 border border-emerald-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          GSTIN Tax ID:
                        </label>
                        <input
                          type="text"
                          value={customerGstin}
                          onChange={(e) => setCustomerGstin(e.target.value)}
                          placeholder="27AABCA1234F1Z5"
                          className="w-full px-2.5 py-1.5 border border-emerald-300 rounded bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={loading}
                    className="w-full bg-[#714B67] hover:bg-[#5e3d55] text-white flex items-center justify-center gap-2 rounded-md text-xs py-2.5 font-medium shadow-xs transition-colors cursor-pointer"
                  >
                    <span>{loading ? 'Provisioning Stakeholder Account...' : `Register & Launch ${currentMeta.title} Hub`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
              Already have credentials?{' '}
              <Link to={`/login?role=${selectedRole}`} className="font-semibold text-[#714B67] hover:underline">
                Sign In to Existing Session
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-3 px-6 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Odoo X D.I.C.E.</span>
          <span>•</span>
          <span>Commercial Policy & Governance Engine</span>
        </div>
        <span className="font-mono text-slate-400">Strict RBAC Enforced • Multi-Tenant Architecture</span>
      </footer>
    </div>
  )
}
