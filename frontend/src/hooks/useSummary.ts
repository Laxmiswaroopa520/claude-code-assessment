import { summariesApi } from '../api/summaries'
import type { CategorySummaryRow, MonthlyTotal } from '../types/api'
import { useApiData } from './useApiData'
import type { ApiData } from './useApiData'

export function useCategorySummary(month: string): ApiData<CategorySummaryRow[]> {
  return useApiData<CategorySummaryRow[]>(() => summariesApi.categories(month), `summary:${month}`)
}

export function useMonthlyTotals(year: number): ApiData<MonthlyTotal[]> {
  return useApiData<MonthlyTotal[]>(() => summariesApi.monthlyTotals(year), `totals:${year}`)
}
