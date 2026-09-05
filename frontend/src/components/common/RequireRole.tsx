import React from 'react'
import { Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, UserCheck, KeyRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types/auth'
import { STAKEHOLDER_DEFINITIONS } from '../../types/auth'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export interface RequireRoleProps {
  allowedRoles?: Role[]
  children?: React.ReactNode
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { currentUser, isAuthenticated, getDefaultDashboard, switchRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const isAuthorized = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(currentUser.role)

  if (!isAuthorized) {
    const currentMeta = STAKEHOLDER_DEFINITIONS[currentUser.role]
    const userRoleTitle = currentMeta?.title || currentUser.role
    const targetDashboard = getDefaultDashboard(currentUser.role)

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6 bg-slate-50">
        <Card className="max-w-xl w-full border border-slate-200 p-6 bg-white rounded">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700 font-semibold">
                Access Restricted
              </span>
              <h1 className="text-lg font-semibold text-slate-900 leading-snug">
                Stakeholder Authorization Required
              </h1>
            </div>
          </div>

          <div className="py-5 space-y-4 text-sm text-slate-600">
            <p>
              Your active session profile (<strong className="text-slate-800">{userRoleTitle}</strong>) does not have clearance to view this module ({location.pathname}).
            </p>

            <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Authorized Stakeholders for this Resource
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allowedRoles?.map((r) => {
                  const def = STAKEHOLDER_DEFINITIONS[r]
                  return (
                    <Badge key={r} variant={def?.badgeVariant || 'neutral'}>
                      {def?.title || r}
                    </Badge>
                  )
                })}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Logged in as <span className="font-mono text-slate-700 font-medium">{currentUser.username}</span> ({currentUser.email}).
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              onClick={() => navigate(targetDashboard)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Authorized Dashboard
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {allowedRoles && allowedRoles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs"
                  onClick={() => switchRole(allowedRoles[0])}
                  title={`Fast-switch to ${allowedRoles[0]} for evaluation`}
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                  Switch to {allowedRoles[0].replace('_', ' ')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-800"
                onClick={() => navigate('/login')}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Sign In
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}

export default RequireRole
