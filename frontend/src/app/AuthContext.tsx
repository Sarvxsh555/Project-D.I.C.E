import React, { useState, useEffect, useCallback } from 'react'
import type { UserSession, Role, LoginRequest, RegisterRequest, TokenResponse } from '../types/auth'
import { STAKEHOLDER_DEFINITIONS } from '../types/auth'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../constants/roles'
import { setStoredToken, removeStoredToken, getStoredToken } from '../services/apiClient'
import { authService, type RegisteredUser } from '../services/authService'
import { AuthContext } from './authContextInstance'

/** Represents "nobody is logged in". Never rendered behind a route guard —
 *  RequireRole redirects to /login whenever currentUser === EMPTY_SESSION —
 *  but keeps `currentUser` a plain, always-defined object so the ~30 pages
 *  that read `currentUser.role` etc. don't all need a null check. */
const EMPTY_SESSION: UserSession = {
  username: '',
  role: 'SALES_REP',
  token: '',
  name: '',
  email: '',
}

function sessionFrom(username: string, role: Role, token: string, fullName: string | null, email: string | null): UserSession {
  return {
    username,
    role,
    token,
    name: fullName || username,
    email: email || '',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserSession>(EMPTY_SESSION)
  const [isLoading, setIsLoading] = useState(true)

  // On first load, a stored token must be verified against the real backend
  // before trusting it — a token that's expired, tampered with, or for a
  // deactivated user must not silently grant access just because it exists
  // in localStorage.
  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    authService
      .getCurrentUser()
      .then((me) => {
        setCurrentUser(sessionFrom(me.username, me.roles[0], token, me.fullName, me.email))
      })
      .catch(() => {
        removeStoredToken()
        setCurrentUser(EMPTY_SESSION)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const applyTokenResponse = useCallback((resp: TokenResponse) => {
    setStoredToken(resp.token)
    setCurrentUser(sessionFrom(resp.username, resp.roles[0], resp.token, resp.fullName, resp.email))
  }, [])

  const login = useCallback(async (request: LoginRequest): Promise<TokenResponse> => {
    const resp = await authService.login(request)
    applyTokenResponse(resp)
    return resp
  }, [applyTokenResponse])

  const register = useCallback(async (request: RegisterRequest): Promise<RegisteredUser> => {
    // No auto-login: register and authenticate are two different actions.
    // The caller (SignupPage) sends the user to /login on success.
    return authService.register(request)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    removeStoredToken()
    setCurrentUser(EMPTY_SESSION)
  }, [])

  /** Demo convenience: re-authenticates as one of the six seeded accounts
   *  through the real login endpoint (never fabricates a session). */
  const switchUser = useCallback(async (username: string) => {
    await login({ username, password: DEMO_PASSWORD })
  }, [login])

  const switchRole = useCallback(async (role: Role) => {
    const demo = DEMO_ACCOUNTS.find((u) => u.role === role)
    if (demo) {
      await switchUser(demo.username)
    }
  }, [switchUser])

  const hasRole = (role: Role | Role[]) => {
    if (Array.isArray(role)) {
      return role.includes(currentUser.role)
    }
    return currentUser.role === role
  }

  const getDefaultDashboard = (role?: Role): string => {
    const targetRole = role || currentUser.role
    return STAKEHOLDER_DEFINITIONS[targetRole]?.defaultDashboard || '/dashboard'
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser.token,
        isLoading,
        switchUser,
        switchRole,
        hasRole,
        login,
        register,
        logout,
        getDefaultDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
