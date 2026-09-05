import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { Product, Customer } from '../types/product'

export const productService = {
  list: async (): Promise<Product[]> => {
    return safeRequest(
      () => api.get<Product[]>('/products'),
      () => mockAdapter.listProducts()
    )
  },

  listProducts: async (): Promise<Product[]> => {
    return productService.list()
  },

  get: async (id: string): Promise<Product> => {
    return safeRequest(
      () => api.get<Product>(`/products/${id}`),
      async () => {
        const list = await mockAdapter.listProducts()
        return list.find((p) => p.id === id) || list[0]
      }
    )
  },

  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    return safeRequest(
      () => api.post<Product>('/products', product),
      () => mockAdapter.createProduct(product)
    )
  },

  update: async (id: string, updates: Partial<Product>): Promise<Product> => {
    return safeRequest(
      () => api.patch<Product>(`/products/${id}`, updates),
      () => mockAdapter.updateProduct(id, updates)
    )
  },

  delete: async (id: string): Promise<void> => {
    return safeRequest(
      () => api.delete<void>(`/products/${id}`),
      () => mockAdapter.deleteProduct(id)
    )
  },

  listCustomers: async (): Promise<Customer[]> => {
    return safeRequest(
      () => api.get<Customer[]>('/customers'),
      () => mockAdapter.listCustomers()
    )
  },
}

export default productService
