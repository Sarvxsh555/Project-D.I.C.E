import { createContext } from 'react'
import type { UserSession, Role, LoginRequest, RegisterRequest, TokenResponse } from '../types/auth'
import type { RegisteredUser } from '../services/authService'

export interface AuthContextType {
  currentUser: UserSession
  isAuthenticated: boolean
  /** True while the stored token (if any) is being verified against the
   *  backend on first load — route guards should not redirect to /login
   *  until this settles, or a refresh with a valid token would flash one. */
  isLoading: boolean
  switchUser: (username: string) => Promise<void>
  switchRole: (role: Role) => Promise<void>
  hasRole: (role: Role | Role[]) => boolean
  login: (request: LoginRequest) => Promise<TokenResponse>
  register: (request: RegisterRequest) => Promise<RegisteredUser>
  logout: () => void
  getDefaultDashboard: (role?: Role) => string
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

