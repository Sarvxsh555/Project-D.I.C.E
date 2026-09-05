import { api, setStoredToken, removeStoredToken, safeRequest } from './api'
import { mockAdapter } from '../mocks/mockAdapter'
import type { LoginRequest, RegisterRequest, TokenResponse, CurrentUser, StakeholderDefinition } from '../types/auth'
import { DEMO_ACCOUNTS } from '../constants/roles'
import { STAKEHOLDER_DEFINITIONS } from '../types/auth'

export const authService = {
  login: async (request: LoginRequest): Promise<TokenResponse> => {
    return safeRequest(
      () => api.post<TokenResponse>('/auth/login', request),
      async () => {
        const existing = await mockAdapter.findUser(request.username)
        const demoUser = existing || DEMO_ACCOUNTS.find(
          (u) => u.username.toLowerCase() === request.username.toLowerCase()
        )
        const role = demoUser ? demoUser.role : 'SALES_REP'
        const mockToken: TokenResponse = {
          token: demoUser?.token || `mock-jwt-${request.username}`,
          username: request.username,
          roles: [role],
          expiresInMs: 86400000,
        }
        setStoredToken(mockToken.token)
        return mockToken
      }
    )
  },

  register: async (request: RegisterRequest): Promise<TokenResponse> => {
    return safeRequest(
      () => api.post<TokenResponse>('/auth/register', request),
      async () => {
        const tokenResp = await mockAdapter.registerUser(request)
        setStoredToken(tokenResp.token)
        return tokenResp
      }
    )
  },

  getCurrentUser: async (): Promise<CurrentUser> => {
    return safeRequest(
      () => api.get<CurrentUser>('/auth/me'),
      async () => {
        return {
          username: 'sales_rep',
          roles: ['SALES_REP'],
        }
      }
    )
  },

  getStakeholders: async (): Promise<StakeholderDefinition[]> => {
    return safeRequest(
      () => api.get<StakeholderDefinition[]>('/auth/stakeholders'),
      async () => Object.values(STAKEHOLDER_DEFINITIONS)
    )
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch {
      // safe fallback
    } finally {
      removeStoredToken()
    }
  },
}

export default authService
