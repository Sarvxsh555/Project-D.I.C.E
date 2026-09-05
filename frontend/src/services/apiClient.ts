import axios, { type AxiosError } from 'axios'
import type { ProblemDetail } from '../types/api'

const TOKEN_KEY = 'odoo_dice_auth_token'
const LEGACY_TOKEN_KEY = 'dealflow360_auth_token'

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Ignore in restrictive environments
  }
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Mocks are opt-in only, never a silent default.
 * Odoo X D.I.C.E. decisions come from the real backend, with resilient mock fallback when endpoints are pending.
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetail>) => {
    if (error.response?.status === 401) {
      removeStoredToken()
    }
    return Promise.reject(error)
  }
)

/**
 * Calls the real backend. `mockFallback` only ever runs when VITE_USE_MOCK_API=true
 * is set at build time — an explicit, opt-in demo mode, never a silent default.
 *
 * Previously this swallowed 404/500/502/503/network errors from the real
 * backend and transparently substituted fake data — which meant a genuine
 * server bug (wrong query, missing migration, whatever) rendered as a
 * plausible-looking success instead of a visible failure. Price, discount,
 * margin, risk, approval, stock, invoice and payment status must never come
 * from the frontend; a masked backend error is exactly that, silently.
 * Errors now propagate so the UI's real error state renders, per the actual
 * API/backend failure.
 */
export async function safeRequest<T>(
  backendCall: () => Promise<{ data: T }>,
  mockFallback: () => Promise<T>
): Promise<T> {
  if (USE_MOCK_API) {
    return await mockFallback()
  }

  const res = await backendCall()
  return res.data
}

export const api = apiClient
export default apiClient
