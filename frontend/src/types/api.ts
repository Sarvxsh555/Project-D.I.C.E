export interface Page<T> {
  content: T[]
  pageable: {
    pageNumber: number
    pageSize: number
    sort?: {
      empty: boolean
      sorted: boolean
      unsorted: boolean
    }
    offset: number
    paged: boolean
    unpaged: boolean
  }
  last: boolean
  totalPages: number
  totalElements: number
  size: number
  number: number
  first: boolean
  numberOfElements: number
  empty: boolean
}

export interface PageableParams {
  page?: number
  size?: number
  sort?: string
}

export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  properties?: Record<string, unknown>
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success?: boolean
}
