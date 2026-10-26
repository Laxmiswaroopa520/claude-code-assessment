// Contract source: docs/requirements.md (FR-01…FR-16) and backend/ExpenseManagement.Api/Contracts/*.cs.
// Verify against GET /openapi/v1.json when the API is running. JSON is camelCase; money is a number;
// dates are "YYYY-MM-DD" strings; months are "YYYY-MM".

export type BudgetType = 'Hard' | 'Soft'

export type BudgetStatus = 'OnTrack' | 'Warning' | 'Exceeded'

export interface Category {
  id: number
  name: string
  description: string | null
}

export interface CategoryRequest {
  name: string
  description: string | null
}

export interface Expense {
  id: number
  title: string
  amount: number
  date: string
  categoryId: number
  categoryName: string
  notes: string | null
  createdAt: string
  warnings: string[]
}

export interface ExpenseRequest {
  title: string
  amount: number | null
  date: string | null
  categoryId: number | null
  notes: string | null
}

export type SortBy = 'date' | 'amount' | 'title'

export type SortDir = 'asc' | 'desc'

export interface ExpenseQuery {
  q?: string
  categoryId?: number
  from?: string
  to?: string
  minAmount?: number
  maxAmount?: number
  sortBy?: SortBy
  sortDir?: SortDir
  page?: number
  pageSize?: number
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface Budget {
  id: number
  categoryId: number
  categoryName: string
  month: string
  limit: number
  type: BudgetType
  spent: number
  remaining: number
  percentUsed: number
  status: BudgetStatus
}

export interface BudgetRequest {
  categoryId: number | null
  month: string
  limit: number | null
  type: BudgetType
}

export interface MonthlyTotal {
  month: string
  total: number
  count: number
}

export interface CategorySummaryRow {
  categoryId: number
  categoryName: string
  total: number
  count: number
  percentOfTotal: number
  budgetLimit: number | null
  percentUsed: number | null
  status: BudgetStatus | null
}

export interface ReportExpenseRow {
  id: number
  date: string
  title: string
  categoryName: string
  amount: number
  notes: string | null
}

export interface MonthlyReport {
  month: string
  from: string
  to: string
  generatedAt: string
  grandTotal: number
  expenseCount: number
  categories: CategorySummaryRow[]
  expenses: ReportExpenseRow[]
}

/** RFC 7807 body as returned by the API. Extensions (traceId, 422 details) sit next to the standard members. */
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  errors?: Record<string, string[]>
  [extension: string]: unknown
}
