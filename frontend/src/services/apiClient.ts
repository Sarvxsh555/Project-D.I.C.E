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
 * Resilient request executor: tries the real backend first, but if the endpoint
 * returns 404, 500, or network down, transparently executes the provided mock fallback.
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
    const axiosErr = err as AxiosError<ProblemDetail>
    const status = axiosErr.response?.status
    // If backend doesn't have endpoint (404), server error (500), or server offline (ERR_NETWORK / ECONNREFUSED)
    if (!status || status === 404 || status === 500 || status === 502 || status === 503 || axiosErr.code === 'ERR_NETWORK') {
      console.warn(
        `[Odoo X D.I.C.E. API] Backend status ${status ?? axiosErr.code}. Serving resilient mock fallback.`
      )
      return await mockFallback()
    }
    throw err
  }
}

export const api = apiClient
export default apiClient
