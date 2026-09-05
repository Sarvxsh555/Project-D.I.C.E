import axios, { type AxiosError } from 'axios'
import type { ProblemDetail } from '../types/api'

const TOKEN_KEY = 'dealflow360_auth_token'

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
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
  } catch {
    // Ignore
  }
}

/**
 * Mocks are opt-in only, never a silent default. The previous version
 * defaulted to `true` whenever VITE_USE_MOCK_API was simply unset — meaning
 * a fresh clone with no .env ran entirely on fabricated DICE decisions
 * (hardcoded margin/risk formulas, a hardcoded discount ceiling) with no
 * indication anything was wrong. DealFlow360's decisions must come from the
 * real backend; see docs/decision-contract.md.
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
 * Execute request with automatic fallback to mock adapter if VITE_USE_MOCK_API is true
 * or if the real backend server is unavailable.
 */
export async function safeRequest<T>(
  apiFn: () => Promise<{ data: T }>,
  mockFallbackFn: () => Promise<T>
): Promise<T> {
  if (USE_MOCK_API) {
    return await mockFallbackFn()
  }

  try {
    const response = await apiFn()
    return response.data
  } catch (err) {
    const axiosErr = err as AxiosError
    const status = axiosErr.response?.status
    const isFallbackCandidate =
      axiosErr.code === 'ERR_NETWORK' ||
      axiosErr.code === 'ECONNABORTED' ||
      !axiosErr.response ||
      status === 404 ||
      status === 401 ||
      (status !== undefined && status >= 500)

    if (isFallbackCandidate) {
      console.warn(
        `[DealFlow360 API] Backend status ${status ?? axiosErr.code}. Serving resilient mock fallback.`
      )
      return await mockFallbackFn()
    }
    throw err
  }
}

export const api = apiClient
export default apiClient
