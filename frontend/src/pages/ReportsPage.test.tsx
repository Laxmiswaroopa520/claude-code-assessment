import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { currentMonth, summaryRows } from '../test/fixtures'
import { mockFetch, problem } from '../test/fetchMock'
import type { MockRoute } from '../test/fetchMock'
import type { MonthlyReport } from '../types/api'
import { ReportsPage } from './ReportsPage'

const year = currentMonth.slice(0, 4)

const baseRoutes: MockRoute[] = [
  { path: /\/api\/summaries\/categories/, response: { body: summaryRows } },
  { path: /\/api\/summaries\/monthly/, response: { body: [{ month: `${year}-01`, total: 40, count: 2 }, { month: currentMonth, total: 120, count: 3 }] } },
]

const report: MonthlyReport = {
  month: currentMonth,
  from: `${currentMonth}-01`,
  to: `${currentMonth}-31`,
  generatedAt: '2026-10-15T12:00:00Z',
  grandTotal: 120,
  expenseCount: 1,
  categories: summaryRows,
  expenses: [{ id: 1, date: `${currentMonth}-02`, title: 'Lunch', categoryName: 'Food', amount: 120, notes: null }],
}

describe('ReportsPage', () => {
  it('summary → totals, percentages and budget status per category', async () => {
    const fetchMock = mockFetch(baseRoutes)

    render(<ReportsPage />)

    expect(await screen.findByRole('cell', { name: 'Food' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '75.00%' })).toBeInTheDocument()
    expect(screen.getByText('120.00', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Food budget used' })).toHaveAttribute('aria-valuetext', '90.00% used, Warning')
    expect(screen.getByText('No budget')).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: `${year}-01` })).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.url === `/api/summaries/categories?month=${currentMonth}`)).toBe(true)
    expect(fetchMock.calls.some((call) => call.url === `/api/summaries/monthly?year=${year}`)).toBe(true)
  })

  it('view report → renders the JSON report', async () => {
    mockFetch([...baseRoutes, { path: /\/api\/reports\/monthly\?.*format=json/, response: { body: report } }])
    const user = userEvent.setup()
    render(<ReportsPage />)
    await screen.findByRole('cell', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'View report' }))

    const region = await screen.findByRole('region', { name: `Report for ${currentMonth}` })
    expect(region).toHaveTextContent('120.00 across 1 expense')
    expect(region).toHaveTextContent('Lunch')
  })

  it('download CSV → saves the file with the server file name', async () => {
    mockFetch([
      ...baseRoutes,
      {
        path: /\/api\/reports\/monthly\?.*format=csv/,
        response: {
          text: 'Date,Title,Category,Amount\r\n',
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename=expenses-${currentMonth}.csv` },
        },
      },
    ])
    const createObjectUrl = vi.fn((blob: Blob) => (blob.size > 0 ? 'blob:report' : 'blob:empty'))
    const revokeObjectUrl = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(<ReportsPage />)
    await screen.findByRole('cell', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'Download CSV' }))

    expect(await screen.findByText(`Downloaded expenses-${currentMonth}.csv.`)).toBeInTheDocument()
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:report')
  })

  it('report API validation error → shown as an alert', async () => {
    mockFetch([...baseRoutes, { path: /\/api\/reports\/monthly/, response: problem(400, 'One or more validation errors occurred.', { detail: 'format must be json or csv.' }) }])
    const user = userEvent.setup()
    render(<ReportsPage />)
    await screen.findByRole('cell', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'View report' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('format must be json or csv.')
  })

  it('summary API failure → error state', async () => {
    mockFetch([
      { path: /\/api\/summaries\/categories/, response: problem(500, 'An unexpected error occurred.') },
      { path: /\/api\/summaries\/monthly/, response: { body: [] } },
    ])

    render(<ReportsPage />)

    expect(await screen.findByText('An unexpected error occurred.')).toBeInTheDocument()
    expect(await screen.findByText(`No expenses in ${year}.`)).toBeInTheDocument()
  })
})
