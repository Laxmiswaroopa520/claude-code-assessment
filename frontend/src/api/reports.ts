import type { MonthlyReport } from '../types/api'
import { download, request, toQueryString } from './client'
import type { DownloadedFile } from './client'

export const reportsApi = {
  monthlyJson: (month: string): Promise<MonthlyReport> =>
    request<MonthlyReport>('GET', `/api/reports/monthly${toQueryString({ month, format: 'json' })}`),
  monthlyCsv: (month: string): Promise<DownloadedFile> =>
    download(`/api/reports/monthly${toQueryString({ month, format: 'csv' })}`, `expenses-${month}.csv`),
}
