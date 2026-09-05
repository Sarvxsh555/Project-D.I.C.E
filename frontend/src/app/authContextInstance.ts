import { createContext } from 'react'
import type { UserSession, Role } from '../types/auth'

export interface AuthContextType {
  currentUser: UserSession
  switchUser: (username: string) => void
  switchRole: (role: Role) => void
  hasRole: (role: Role | Role[]) => boolean
  isAuthenticated: boolean
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
