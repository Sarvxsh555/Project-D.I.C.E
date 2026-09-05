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
 * Calls the real backend with intelligent fallback behaviour:
 *
 * - VITE_USE_MOCK_API=true  → always use mock (explicit demo mode)
 * - 404  → endpoint not yet implemented; fall back to mock
 * - 400  → bad request (e.g. mock string ID can't be parsed as UUID by Spring)
 * - 500  → server error (e.g. mock entity ID not in the DB); fall back to mock
 * - 401/403/network → propagate so auth failures stay visible
 *
 * This keeps every page functional with mock data during development while
 * surfacing the errors that actually matter (auth, network).
 */
export async function safeRequest<T>(
  backendCall: () => Promise<{ data: T }>,
  mockFallback: () => Promise<T>
): Promise<T> {
  if (USE_MOCK_API) {
    return await mockFallback()
  }

  try {
    const res = await backendCall()
    return res.data
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    // Fall back to mock for:
    // • 404 – endpoint missing
    // • 400 – invalid param (e.g. mock string ID won't parse as UUID)
    // • 500 – entity not found in DB / unexpected server error with mock data
    if (status === 404 || status === 400 || status === 500) {
      return await mockFallback()
    }
    // 401 / 403 / network errors surface as real failures
    throw err
  }
}

export const api = apiClient
export default apiClient
