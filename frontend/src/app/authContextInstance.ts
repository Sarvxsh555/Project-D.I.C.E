import { createContext } from 'react'
import type { UserSession, Role, LoginRequest, RegisterRequest, TokenResponse } from '../types/auth'

export interface AuthContextType {
  currentUser: UserSession
  switchUser: (username: string) => void
  switchRole: (role: Role) => void
  hasRole: (role: Role | Role[]) => boolean
  isAuthenticated: boolean
  login: (request: LoginRequest) => Promise<TokenResponse>
  register: (request: RegisterRequest) => Promise<TokenResponse>
  logout: () => void
  getDefaultDashboard: (role?: Role) => string
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

