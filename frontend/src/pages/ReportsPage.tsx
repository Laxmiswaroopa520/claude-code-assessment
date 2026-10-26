import { useState } from 'react'
import { ApiError } from '../api/client'
import { reportsApi } from '../api/reports'
import { BudgetProgress } from '../components/BudgetStatusBadge'
import { EmptyState, ErrorMessage, LoadingState } from '../components/StatusMessages'
import { useCategorySummary, useMonthlyTotals } from '../hooks/useSummary'
import type { MonthlyReport } from '../types/api'
import { formatMoney, formatPercent, toMonth } from '../utils/format'

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

export function ReportsPage() {
  const [month, setMonth] = useState<string>(toMonth())
  const year = Number(month.slice(0, 4))
  const summary = useCategorySummary(month)
  const totals = useMonthlyTotals(year)
  const [report, setReport] = useState<MonthlyReport | undefined>(undefined)
  const [reportError, setReportError] = useState<ApiError | undefined>(undefined)
  const [busy, setBusy] = useState<boolean>(false)
  const [notice, setNotice] = useState<string | undefined>(undefined)

  const monthTotal = summary.data?.reduce((sum, row) => sum + row.total, 0) ?? 0

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true)
    setReportError(undefined)
    setNotice(undefined)
    try {
      await action()
    } catch (caught: unknown) {
      setReportError(caught instanceof ApiError ? caught : new ApiError(0, 'The report could not be created.', undefined, {}))
    } finally {
      setBusy(false)
    }
  }

  const viewReport = (): Promise<void> => run(async () => setReport(await reportsApi.monthlyJson(month)))

  const downloadCsv = (): Promise<void> =>
    run(async () => {
      const file = await reportsApi.monthlyCsv(month)
      saveBlob(file.blob, file.fileName)
      setNotice(`Downloaded ${file.fileName}.`)
    })

  return (
    <section aria-labelledby="reports-heading">
      <h2 id="reports-heading">Summary &amp; Reports</h2>
      <div className="field month-picker">
        <label htmlFor="report-month">Month</label>
        <input
          id="report-month"
          type="month"
          value={month}
          onChange={(event) => {
            if (event.target.value) {
              setMonth(event.target.value)
              setReport(undefined)
            }
          }}
        />
      </div>

      <div className="card">
        <h3>Category summary for {month}</h3>
        {summary.loading ? <LoadingState label="Loading summary…" /> : null}
        {summary.error ? <ErrorMessage error={summary.error} onRetry={summary.reload} /> : null}
        {!summary.loading && summary.data ? (
          summary.data.length === 0 ? (
            <EmptyState message="No categories yet." />
          ) : (
            <>
              <p>
                Total spent: <strong>{formatMoney(monthTotal)}</strong>
              </p>
              <table>
                <caption className="visually-hidden">Category summary</caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col" className="number">Total</th>
                    <th scope="col" className="number">Expenses</th>
                    <th scope="col" className="number">Share</th>
                    <th scope="col">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.data.map((row) => (
                    <tr key={row.categoryId}>
                      <td>{row.categoryName}</td>
                      <td className="number">{formatMoney(row.total)}</td>
                      <td className="number">{row.count}</td>
                      <td className="number">{formatPercent(row.percentOfTotal)}</td>
                      <td>
                        {row.budgetLimit !== null && row.percentUsed !== null && row.status !== null ? (
                          <>
                            <span className="muted">Limit {formatMoney(row.budgetLimit)}</span>
                            <BudgetProgress percentUsed={row.percentUsed} status={row.status} label={`${row.categoryName} budget used`} />
                          </>
                        ) : (
                          <span className="muted">No budget</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        ) : null}
      </div>

      <div className="card">
        <h3>Monthly totals for {year}</h3>
        {totals.loading ? <LoadingState label="Loading monthly totals…" /> : null}
        {totals.error ? <ErrorMessage error={totals.error} onRetry={totals.reload} /> : null}
        {!totals.loading && totals.data ? (
          totals.data.length === 0 ? (
            <EmptyState message={`No expenses in ${year}.`} />
          ) : (
            <table>
              <caption className="visually-hidden">Monthly totals</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col" className="number">Total</th>
                  <th scope="col" className="number">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {totals.data.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td className="number">{formatMoney(row.total)}</td>
                    <td className="number">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </div>

      <div className="card">
        <h3>Monthly report</h3>
        <div className="actions">
          <button type="button" onClick={() => void viewReport()} disabled={busy}>
            View report
          </button>
          <button type="button" onClick={() => void downloadCsv()} disabled={busy}>
            Download CSV
          </button>
        </div>
        {reportError ? <ErrorMessage error={reportError} /> : null}
        {notice ? (
          <p role="status" className="state">
            {notice}
          </p>
        ) : null}
        {report ? (
          <div aria-label={`Report for ${report.month}`} role="region">
            <p>
              {report.from} to {report.to}: <strong>{formatMoney(report.grandTotal)}</strong> across {report.expenseCount}{' '}
              {report.expenseCount === 1 ? 'expense' : 'expenses'}.
            </p>
            {report.expenses.length === 0 ? (
              <EmptyState message="No expenses in this month." />
            ) : (
              <table>
                <caption className="visually-hidden">Report expenses</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Title</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="number">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.date}</td>
                      <td>{expense.title}</td>
                      <td>{expense.categoryName}</td>
                      <td className="number">{formatMoney(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
