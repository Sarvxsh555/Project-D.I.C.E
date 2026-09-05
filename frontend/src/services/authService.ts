import { api } from './apiClient'
import type { LoginRequest, RegisterRequest, TokenResponse, CurrentUser, StakeholderDefinition } from '../types/auth'
import { STAKEHOLDER_DEFINITIONS } from '../types/auth'

export interface RegisteredUser {
  id: string
  username: string
  email: string
  role: string
}

export const authService = {
  login: async (request: LoginRequest): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>('/auth/login', request)
    return res.data
  },

  /** Does not log the new user in — the backend deliberately issues no token
   *  on register (see AuthController). Caller navigates to /login on success. */
  register: async (request: RegisterRequest): Promise<RegisteredUser> => {
    const res = await api.post<RegisteredUser>('/auth/register', request)
    return res.data
  },

  getCurrentUser: async (): Promise<CurrentUser> => {
    const res = await api.get<CurrentUser>('/auth/me')
    return res.data
  },

  getStakeholders: async (): Promise<StakeholderDefinition[]> => {
    try {
      const res = await api.get<StakeholderDefinition[]>('/auth/stakeholders')
      return res.data
    } catch {
      // Static reference data with a real backend endpoint that mirrors it
      // exactly (AuthController.getStakeholders) — safe to fall back to the
      // same constants the backend would return, not fabricated data.
      return Object.values(STAKEHOLDER_DEFINITIONS)
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Stateless JWT — logout is a client-side token discard either way.
    }
  },
}

export default authService
