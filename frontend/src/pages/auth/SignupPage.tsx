import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { User, Mail, Lock, ArrowRight } from 'lucide-react'

export default function SignupPage() {
  const navigate = useNavigate()
  const { switchUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      switchUser('sales_rep')
      navigate('/')
    }, 400)
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
          Create DealFlow<span className="text-[#5E2A52]">360</span> Account
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Role-based enterprise sales operations access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200 sm:rounded-lg sm:px-10">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Legal Name:
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
                  placeholder="Vikram Sharma"
                />
              </div>
            </div>

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
                  placeholder="vikram@enterprise.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password:
              </label>
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="w-full bg-[#5E2A52] hover:bg-[#4d2243] flex items-center justify-center gap-1.5 mt-4"
            >
              <span>{loading ? 'Provisioning Account...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#5E2A52] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
