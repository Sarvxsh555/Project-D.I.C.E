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
    // Ignore in restrictive storage environments
  }
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore in restrictive storage environments
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Request Interceptor: Attach JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: RFC 9457 ProblemDetail extraction
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetail>) => {
    if (error.response?.status === 401) {
      // Clear expired token on unauthorized
      removeStoredToken()
    }
    return Promise.reject(error)
  }
)

/**
 * Safe fetch wrapper that handles fallback to mock adapter if the backend is offline.
 */
export async function safeRequest<T>(
  apiFn: () => Promise<{ data: T }>,
  mockFallbackFn: () => Promise<T>
): Promise<T> {
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
        `[Odoo X D.I.C.E.] Backend status ${status ?? axiosErr.code}. Serving response via mock resilience layer.`
      )
      return await mockFallbackFn()
    }
    throw err
  }
}

export default api
