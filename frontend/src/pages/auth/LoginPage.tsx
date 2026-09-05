import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { DEMO_ACCOUNTS } from '../../constants/roles'
import { Lock, Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { switchUser } = useAuth()
  const [email, setEmail] = useState('sales.rep@dealflow360.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      // Find matching demo account or default to sales_rep
      const match = DEMO_ACCOUNTS.find((a) => a.username.includes('rep')) || DEMO_ACCOUNTS[0]
      switchUser(match.username)
      navigate('/')
    }, 300)
  }

  const handleQuickPersona = (username: string) => {
    switchUser(username)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-10 h-10 rounded-lg bg-[#5E2A52] items-center justify-center text-white shadow-xs mb-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to DealFlow<span className="text-[#5E2A52]">360</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Intelligent Sales Operations & Governance Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200 sm:rounded-lg sm:px-10">
          {forgotSent && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
              Password reset link has been dispatched to your email address.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Corporate Email Address:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password:
                </label>
                <button
                  type="button"
                  onClick={() => setForgotSent(true)}
                  className="text-[11px] text-[#5E2A52] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="w-full bg-[#5E2A52] hover:bg-[#4d2243] flex items-center justify-center gap-1.5 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Persona Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2 text-center">
              Quick Enterprise Demo Sign-In
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {DEMO_ACCOUNTS.slice(0, 4).map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleQuickPersona(acc.username)}
                  className="p-2 border border-slate-200 rounded text-left hover:border-[#5E2A52] hover:bg-[#FAF5F9] transition-all"
                >
                  <div className="font-bold text-slate-800 text-[11px] truncate">{acc.name}</div>
                  <div className="text-[9px] text-[#5E2A52] font-semibold">{acc.role.replace('_', ' ')}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500">
            Need an account?{' '}
            <Link to="/signup" className="font-semibold text-[#5E2A52] hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
