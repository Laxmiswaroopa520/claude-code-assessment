import type { Category, CategoryRequest } from '../types/api'
import { request } from './client'

export const categoriesApi = {
  list: (): Promise<Category[]> => request<Category[]>('GET', '/api/categories'),
  create: (body: CategoryRequest): Promise<Category> => request<Category>('POST', '/api/categories', body),
  update: (id: number, body: CategoryRequest): Promise<Category> => request<Category>('PUT', `/api/categories/${id}`, body),
  remove: (id: number): Promise<void> => request<void>('DELETE', `/api/categories/${id}`),
}
