import axios from 'axios'

// Base axios client. TODO: attach the bearer token from an auth store once
// one exists, and handle RFC 9457 ProblemDetail error bodies from the backend
// (see backend GlobalExceptionHandler) in a response interceptor.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
})
