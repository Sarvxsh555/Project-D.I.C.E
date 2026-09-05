import { AxiosError } from 'axios'
import type { ProblemDetail } from '../types/api'

export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback

  if (typeof error === 'string') return error

  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as Partial<ProblemDetail> & { message?: string; error?: string }
    if (data.detail) return data.detail
    if (data.title) return data.title
    if (data.message) return data.message
    if (data.error) return data.error
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
