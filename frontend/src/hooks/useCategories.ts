import { categoriesApi } from '../api/categories'
import type { Category } from '../types/api'
import { useApiData } from './useApiData'
import type { ApiData } from './useApiData'

export function useCategories(): ApiData<Category[]> {
  return useApiData<Category[]>(() => categoriesApi.list(), 'categories')
}
