import React, { useState, useEffect } from 'react'
import type { UserSession, Role } from '../types/auth'
import { DEMO_ACCOUNTS } from '../constants/roles'
import { setStoredToken, removeStoredToken, getStoredToken } from '../services/api'
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
    setStoredToken(currentUser.token)
  }, [currentUser])

  const switchUser = (username: string) => {
    const found = DEMO_ACCOUNTS.find((u) => u.username.toLowerCase() === username.toLowerCase())
    if (found) {
      setCurrentUser(found)
      setStoredToken(found.token)
    }
  }

  const switchRole = (role: Role) => {
    const found = DEMO_ACCOUNTS.find((u) => u.role === role)
    if (found) {
      setCurrentUser(found)
      setStoredToken(found.token)
    }
  }

  const hasRole = (role: Role | Role[]) => {
    if (Array.isArray(role)) {
      return role.includes(currentUser.role)
    }
    return currentUser.role === role
  }

  const logout = () => {
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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
