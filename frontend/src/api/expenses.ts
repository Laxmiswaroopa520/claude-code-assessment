import type { Expense, ExpenseQuery, ExpenseRequest, PagedResponse } from '../types/api'
import { request, toQueryString } from './client'

export function buildExpenseQuery(query: ExpenseQuery): string {
  return toQueryString({
    q: query.q?.trim(),
    categoryId: query.categoryId,
    from: query.from,
    to: query.to,
    minAmount: query.minAmount,
    maxAmount: query.maxAmount,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    page: query.page,
    pageSize: query.pageSize,
  })
}

export const expensesApi = {
  list: (query: ExpenseQuery): Promise<PagedResponse<Expense>> =>
    request<PagedResponse<Expense>>('GET', `/api/expenses${buildExpenseQuery(query)}`),
  create: (body: ExpenseRequest): Promise<Expense> => request<Expense>('POST', '/api/expenses', body),
  update: (id: number, body: ExpenseRequest): Promise<Expense> => request<Expense>('PUT', `/api/expenses/${id}`, body),
  remove: (id: number): Promise<void> => request<void>('DELETE', `/api/expenses/${id}`),
}
