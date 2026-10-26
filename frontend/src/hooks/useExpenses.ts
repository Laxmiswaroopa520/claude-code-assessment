import { expensesApi } from '../api/expenses'
import type { Expense, ExpenseQuery, PagedResponse } from '../types/api'
import { useApiData } from './useApiData'
import type { ApiData } from './useApiData'

export function useExpenses(query: ExpenseQuery): ApiData<PagedResponse<Expense>> {
  return useApiData<PagedResponse<Expense>>(() => expensesApi.list(query), JSON.stringify(query))
}
