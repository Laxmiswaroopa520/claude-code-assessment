import { budgetsApi } from '../api/budgets'
import type { Budget } from '../types/api'
import { useApiData } from './useApiData'
import type { ApiData } from './useApiData'

export function useBudgets(month: string): ApiData<Budget[]> {
  return useApiData<Budget[]>(() => budgetsApi.list(month), `budgets:${month}`)
}
