import type { Budget, Category, CategorySummaryRow, Expense, PagedResponse } from '../types/api'
import { toIsoDate, toMonth } from '../utils/format'

export const today: string = toIsoDate()
export const currentMonth: string = toMonth()

export const categories: Category[] = [
  { id: 1, name: 'Food', description: null },
  { id: 2, name: 'Travel', description: 'Trips' },
]

export function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 5,
    title: 'Lunch',
    amount: 12.5,
    date: today,
    categoryId: 1,
    categoryName: 'Food',
    notes: null,
    createdAt: '2026-10-15T12:00:00Z',
    warnings: [],
    ...overrides,
  }
}

export function page(items: Expense[], overrides: Partial<PagedResponse<Expense>> = {}): PagedResponse<Expense> {
  return { items, page: 1, pageSize: 10, totalCount: items.length, totalPages: items.length === 0 ? 0 : 1, ...overrides }
}

export function budget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 3,
    categoryId: 1,
    categoryName: 'Food',
    month: currentMonth,
    limit: 200,
    type: 'Soft',
    spent: 170,
    remaining: 30,
    percentUsed: 85,
    status: 'Warning',
    ...overrides,
  }
}

export const summaryRows: CategorySummaryRow[] = [
  { categoryId: 1, categoryName: 'Food', total: 90, count: 2, percentOfTotal: 75, budgetLimit: 100, percentUsed: 90, status: 'Warning' },
  { categoryId: 2, categoryName: 'Travel', total: 30, count: 1, percentOfTotal: 25, budgetLimit: null, percentUsed: null, status: null },
]
