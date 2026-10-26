import type { CategorySummaryRow, MonthlyTotal } from '../types/api'
import { request, toQueryString } from './client'

export const summariesApi = {
  monthlyTotals: (year: number): Promise<MonthlyTotal[]> =>
    request<MonthlyTotal[]>('GET', `/api/summaries/monthly${toQueryString({ year })}`),
  categories: (month: string): Promise<CategorySummaryRow[]> =>
    request<CategorySummaryRow[]>('GET', `/api/summaries/categories${toQueryString({ month })}`),
}
