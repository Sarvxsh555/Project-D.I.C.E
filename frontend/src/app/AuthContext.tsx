import React, { useState, useEffect } from 'react'
import type { UserSession, Role, LoginRequest, RegisterRequest, TokenResponse } from '../types/auth'
import { STAKEHOLDER_DEFINITIONS } from '../types/auth'
import { DEMO_ACCOUNTS } from '../constants/roles'
import { setStoredToken, removeStoredToken, getStoredToken } from '../services/api'
import { authService } from '../services/authService'
import { mockAdapter } from '../mocks/mockAdapter'
import { AuthContext } from './authContextInstance'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    const stored = getStoredToken()
    if (stored) {
      const match = DEMO_ACCOUNTS.find((a) => a.token === stored)
      if (match) return match
    }
    return DEMO_ACCOUNTS[0] // Default to Sales Rep
  })

  useEffect(() => {
    if (currentUser.token) {
      setStoredToken(currentUser.token)
    }
    // If the token is a placeholder mock token, silently request a genuine backend token
    if (currentUser.username && (!currentUser.token || currentUser.token.startsWith('mock-jwt-'))) {
      authService
        .login({ username: currentUser.username, password: 'dice-demo' })
        .then((res) => {
          if (res?.token) {
            setCurrentUser((prev) => ({ ...prev, token: res.token }))
            setStoredToken(res.token)
          }
        })
        .catch(() => {
          // Backend offline or running in pure mock mode
        })
    }
  }, [currentUser.username])

  const switchUser = (username: string) => {
    const found = DEMO_ACCOUNTS.find((u) => u.username.toLowerCase() === username.toLowerCase())
    if (found) {
      setCurrentUser(found)
      authService
        .login({ username: found.username, password: 'dice-demo' })
        .then((res) => {
          if (res?.token) {
            setCurrentUser((prev) => ({ ...prev, token: res.token }))
            setStoredToken(res.token)
          }
        })
        .catch(() => {
          setStoredToken(found.token)
        })
    }
  }

  const switchRole = (role: Role) => {
    const found = DEMO_ACCOUNTS.find((u) => u.role === role)
    if (found) {
      setCurrentUser(found)
      authService
        .login({ username: found.username, password: 'dice-demo' })
        .then((res) => {
          if (res?.token) {
            setCurrentUser((prev) => ({ ...prev, token: res.token }))
            setStoredToken(res.token)
          }
        })
        .catch(() => {
          setStoredToken(found.token)
        })
    }
  }

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

  const login = async (request: LoginRequest): Promise<TokenResponse> => {
    const tokenResp = await authService.login(request)
    // Find session or synthesize
    const existing = await mockAdapter.findUser(request.username)
    const demo = DEMO_ACCOUNTS.find((u) => u.username.toLowerCase() === request.username.toLowerCase())
    const role = tokenResp.roles?.[0] || existing?.role || demo?.role || 'SALES_REP'
    
    const userSession: UserSession = {
      username: tokenResp.username,
      role,
      token: tokenResp.token,
      name: existing?.name || demo?.name || tokenResp.username,
      email: existing?.email || demo?.email || `${tokenResp.username}@dealflow360.internal`,
      departmentOrCompany: existing?.departmentOrCompany || demo?.departmentOrCompany,
      territory: existing?.territory || demo?.territory,
      warehouseDepot: existing?.warehouseDepot || demo?.warehouseDepot,
    }
    setCurrentUser(userSession)
    setStoredToken(tokenResp.token)
    return tokenResp
  }

  const register = async (request: RegisterRequest): Promise<TokenResponse> => {
    const tokenResp = await authService.register(request)
    const userSession: UserSession = {
      username: request.username,
      role: request.role,
      token: tokenResp.token,
      name: request.fullName || request.username,
      email: request.email,
      departmentOrCompany: request.departmentOrCompany,
      territory: request.territory,
      warehouseDepot: request.warehouseDepot,
    }
    setCurrentUser(userSession)
    setStoredToken(tokenResp.token)
    return tokenResp
  }

  const logout = () => {
    authService.logout()
    removeStoredToken()
    setCurrentUser(DEMO_ACCOUNTS[0])
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        switchUser,
        switchRole,
        hasRole,
        isAuthenticated: !!currentUser.token,
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

