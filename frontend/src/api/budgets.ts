import type { Budget, BudgetRequest } from '../types/api'
import { request, toQueryString } from './client'

export const budgetsApi = {
  list: (month?: string): Promise<Budget[]> => request<Budget[]>('GET', `/api/budgets${toQueryString({ month })}`),
  create: (body: BudgetRequest): Promise<Budget> => request<Budget>('POST', '/api/budgets', body),
  update: (id: number, body: BudgetRequest): Promise<Budget> => request<Budget>('PUT', `/api/budgets/${id}`, body),
  remove: (id: number): Promise<void> => request<void>('DELETE', `/api/budgets/${id}`),
}
