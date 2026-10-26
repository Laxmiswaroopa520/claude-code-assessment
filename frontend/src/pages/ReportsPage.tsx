import { useState } from 'react'
import { ApiError } from '../api/client'
import { reportsApi } from '../api/reports'
import { CategoryBreakdown } from '../charts/CategoryBreakdown'
import { MonthlyTrendChart } from '../charts/MonthlyTrendChart'
import { BudgetStatusBadge } from '../components/BudgetStatusBadge'
import { KpiCard, KpiSkeleton } from '../components/KpiCard'
import { EmptyState, ErrorMessage, LoadingState } from '../components/StatusMessages'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/toastContext'
import { useCategorySummary, useMonthlyTotals } from '../hooks/useSummary'
import { PageHeader } from '../layout/PageHeader'
import type { MonthlyReport } from '../types/api'
import { formatDate, formatMoney, formatMonthLabel, formatPercent } from '../utils/format'
import { monthsToShow } from '../utils/period'

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function ReportsPage({ month, onMonthChange }: { month: string; onMonthChange: (month: string) => void }) {
  const year = Number(month.slice(0, 4))
  const summary = useCategorySummary(month)
  const totals = useMonthlyTotals(year)
  const toast = useToast()
  const [report, setReport] = useState<MonthlyReport | undefined>(undefined)
  const [reportError, setReportError] = useState<ApiError | undefined>(undefined)
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null)

  const rows = summary.data ?? []
  const monthTotal = rows.reduce((sum, row) => sum + row.total, 0)
  const monthCount = rows.reduce((sum, row) => sum + row.count, 0)
  // The API sorts rows by total descending, so the first row with spending is the largest category.
  const topCategory = rows.find((row) => row.total > 0)
  const overBudget = rows.filter((row) => row.status === 'Exceeded').length
  const budgeted = rows.filter((row) => row.status !== null).length
  const shownReport = report?.month === month ? report : undefined

  const run = async (kind: 'json' | 'csv', action: () => Promise<void>): Promise<void> => {
    setBusy(kind)
    setReportError(undefined)
    try {
      await action()
    } catch (caught: unknown) {
      setReportError(caught instanceof ApiError ? caught : new ApiError(0, 'The report could not be created.', undefined, {}))
    } finally {
      setBusy(null)
    }
  }

  const viewReport = (): Promise<void> => run('json', async () => setReport(await reportsApi.monthlyJson(month)))

  const downloadCsv = (): Promise<void> =>
    run('csv', async () => {
      const file = await reportsApi.monthlyCsv(month)
      saveBlob(file.blob, file.fileName)
      toast.notify('success', 'CSV downloaded', `Saved ${file.fileName}.`)
    })

  return (
    <div className="page">
      <PageHeader
        title="Summary & Reports"
        description="Monthly totals, category breakdown and exportable reports."
        month={month}
        onMonthChange={onMonthChange}
        actions={
          <>
            <Button icon="file" onClick={() => void viewReport()} loading={busy === 'json'} disabled={busy !== null}>
              View report
            </Button>
            <Button variant="primary" icon="download" onClick={() => void downloadCsv()} loading={busy === 'csv'} disabled={busy !== null}>
              Download CSV
            </Button>
          </>
        }
      />

      {reportError ? <ErrorMessage title="The report could not be created" error={reportError} /> : null}

      <div className="grid-kpi">
        {summary.loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Total spent" value={formatMoney(monthTotal)} note={formatMonthLabel(month)} icon="wallet" tone="indigo" />
            <KpiCard label="Expenses" value={String(monthCount)} note={`Recorded in ${formatMonthLabel(month)}`} icon="receipt" tone="sky" />
            <KpiCard
              label="Largest category"
              value={topCategory ? topCategory.categoryName : '—'}
              note={topCategory ? `${formatMoney(topCategory.total)} · ${formatPercent(topCategory.percentOfTotal)} of the month` : 'No spending this month'}
              icon="categories"
              tone="emerald"
            />
            <KpiCard
              label="Budgets exceeded"
              value={budgeted > 0 ? `${overBudget} of ${budgeted}` : '—'}
              note={budgeted > 0 ? 'Categories above 100% of their budget' : 'No budgets set for this month'}
              icon="gauge"
              tone="rose"
            />
          </>
        )}
      </div>

      <div className="grid-2">
        <Card title={`Monthly totals ${year}`} description="Total spent per month. Hover or focus a column for details.">
          <div className="card-body">
            {totals.loading ? <LoadingState label="Loading monthly totals…" /> : null}
            {totals.error ? <ErrorMessage error={totals.error} onRetry={totals.reload} /> : null}
            {!totals.loading && totals.data ? (
              totals.data.length === 0 ? (
                <EmptyState icon="reports" message={`No expenses in ${year}.`} />
              ) : (
                <MonthlyTrendChart year={year} totals={totals.data} months={monthsToShow(year)} selectedMonth={month} />
              )
            ) : null}
          </div>
        </Card>

        <Card title="By category" description={`Share of ${formatMonthLabel(month)} spending.`}>
          <div className="card-body">
            {summary.loading ? <LoadingState label="Loading summary…" /> : null}
            {summary.error ? <ErrorMessage error={summary.error} onRetry={summary.reload} /> : null}
            {!summary.loading && summary.data ? (
              monthTotal === 0 ? (
                <EmptyState icon="categories" message="No spending recorded for this month." />
              ) : (
                <CategoryBreakdown rows={rows} />
              )
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="Category summary" description="Totals, share of the month and budget status per category.">
        {!summary.loading && summary.data && rows.length > 0 ? (
          <div className="table-wrap">
            <table>
              <caption className="visually-hidden">Category summary for {month}</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="amount">Total</th>
                  <th scope="col" className="amount">Expenses</th>
                  <th scope="col" className="amount">Share</th>
                  <th scope="col" className="amount">Budget</th>
                  <th scope="col" className="amount">Used</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.categoryId}>
                    <td className="cell-title">{row.categoryName}</td>
                    <td className="amount">{formatMoney(row.total)}</td>
                    <td className="amount">{row.count}</td>
                    <td className="amount">{formatPercent(row.percentOfTotal)}</td>
                    <td className="amount">{row.budgetLimit !== null ? formatMoney(row.budgetLimit) : '—'}</td>
                    <td className="amount">{row.percentUsed !== null ? formatPercent(row.percentUsed) : '—'}</td>
                    <td>{row.status ? <BudgetStatusBadge status={row.status} /> : <span className="muted">No budget</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !summary.loading && summary.data ? (
          <EmptyState icon="categories" message="No categories yet." />
        ) : null}
      </Card>

      {shownReport ? (
        <Card title={`Monthly report · ${formatMonthLabel(shownReport.month)}`} description="JSON report returned by the API.">
          <div className="card-body stack" role="region" aria-label={`Report for ${shownReport.month}`}>
            <div className="json-meta">
              <span>
                Period <strong>{formatDate(shownReport.from)} – {formatDate(shownReport.to)}</strong>
              </span>
              <span>
                Total <strong>{formatMoney(shownReport.grandTotal)}</strong>
              </span>
              <span>
                <strong>{shownReport.expenseCount}</strong> {shownReport.expenseCount === 1 ? 'expense' : 'expenses'}
              </span>
              <span>
                Generated <strong>{new Date(shownReport.generatedAt).toLocaleString('en-US')}</strong>
              </span>
            </div>
            {shownReport.expenses.length === 0 ? (
              <EmptyState icon="receipt" message="No expenses in this month." />
            ) : (
              <div className="table-wrap">
                <table>
                  <caption className="visually-hidden">Report expenses</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Title</th>
                      <th scope="col">Category</th>
                      <th scope="col" className="amount">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownReport.expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="date-cell">{formatDate(expense.date)}</td>
                        <td className="cell-title">{expense.title}</td>
                        <td>
                          <span className="badge badge-accent">{expense.categoryName}</span>
                        </td>
                        <td className="amount">{formatMoney(expense.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
