export type Role =
  | 'SALES_REP'
  | 'SALES_MANAGER'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'ADMIN'
  | 'CUSTOMER'

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  token: string
  username: string
  roles: Role[]
  expiresInMs: number
}

export interface CurrentUser {
  username: string
  roles: Role[]
}

export interface UserSession {
  username: string
  role: Role
  token: string
  name: string
  email: string
}
