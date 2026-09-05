import { api, setStoredToken, removeStoredToken, safeRequest } from './api'
import type { LoginRequest, TokenResponse, CurrentUser } from '../types/auth'
import { DEMO_ACCOUNTS } from '../constants/roles'

export const authService = {
  login: async (request: LoginRequest): Promise<TokenResponse> => {
    return safeRequest(
      () => api.post<TokenResponse>('/auth/login', request),
      async () => {
        const demoUser = DEMO_ACCOUNTS.find(
          (u) => u.username.toLowerCase() === request.username.toLowerCase()
        )
        const role = demoUser ? demoUser.role : 'SALES_REP'
        const mockToken: TokenResponse = {
          token: `mock-jwt-${request.username}`,
          username: request.username,
          roles: [role],
          expiresInMs: 86400000,
        }
        setStoredToken(mockToken.token)
        return mockToken
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

  logout: async (): Promise<void> => {
    removeStoredToken()
  },
}
