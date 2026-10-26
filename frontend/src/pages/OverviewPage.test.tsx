import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { budget, currentMonth, expense, page, summaryRows } from '../test/fixtures'
import { mockFetch } from '../test/fetchMock'
import type { MockRoute } from '../test/fetchMock'
import { renderWithProviders } from '../test/render'
import { OverviewPage } from './OverviewPage'

const year = currentMonth.slice(0, 4)

const routes: MockRoute[] = [
  { path: /\/api\/summaries\/categories/, response: { body: summaryRows } },
  { path: /\/api\/summaries\/monthly/, response: { body: [{ month: currentMonth, total: 120, count: 3 }] } },
  { path: /\/api\/budgets/, response: { body: [budget(), budget({ id: 4, categoryName: 'Travel', limit: 100, spent: 30, remaining: 70, percentUsed: 30, status: 'OnTrack' })] } },
  { path: /\/api\/expenses/, response: { body: page([expense(), expense({ id: 6, title: 'Taxi', amount: 30 })]) } },
]

describe('OverviewPage', () => {
  it('KPIs → derived only from API data for the month', async () => {
    mockFetch(routes)

    renderWithProviders(<OverviewPage month={currentMonth} onMonthChange={vi.fn()} onNavigate={vi.fn()} />)

    expect(await screen.findByText('120.00', { selector: '.hero-value' })).toBeInTheDocument()
    expect(screen.getByText('3', { selector: '.kpi-value' })).toBeInTheDocument()
    expect(screen.getByText('Food', { selector: '.kpi-value' })).toBeInTheDocument()
    expect(screen.getByText('40.00', { selector: '.kpi-value' })).toBeInTheDocument()
    // (170 + 30) spent of (200 + 100) budgeted = 66.67 %
    expect(await screen.findByText('66.67%', { selector: '.kpi-value' })).toBeInTheDocument()
    expect(screen.getByText('200.00 of 300.00 across 2 budgeted categories')).toBeInTheDocument()
  })

  it('no expenses and no budgets → zero KPIs and empty states, no invented numbers', async () => {
    mockFetch([
      { path: /\/api\/summaries\/categories/, response: { body: summaryRows.map((row) => ({ ...row, total: 0, count: 0, percentOfTotal: 0 })) } },
      { path: /\/api\/summaries\/monthly/, response: { body: [] } },
      { path: /\/api\/budgets/, response: { body: [] } },
      { path: /\/api\/expenses/, response: { body: page([]) } },
    ])

    renderWithProviders(<OverviewPage month={currentMonth} onMonthChange={vi.fn()} onNavigate={vi.fn()} />)

    expect(await screen.findByText('No expenses this month')).toBeInTheDocument()
    expect(screen.getByText('0.00', { selector: '.hero-value' })).toBeInTheDocument()
    expect(await screen.findByText('No budgets set for this month')).toBeInTheDocument()
    expect(await screen.findByText(`No expenses recorded in ${year} yet.`)).toBeInTheDocument()
    expect(await screen.findByText('No expenses yet.')).toBeInTheDocument()
  })

  it('recent expenses and budget status → listed from the API', async () => {
    mockFetch(routes)

    renderWithProviders(<OverviewPage month={currentMonth} onMonthChange={vi.fn()} onNavigate={vi.fn()} />)

    expect(await screen.findByRole('cell', { name: 'Taxi' })).toBeInTheDocument()
    expect(await screen.findByRole('progressbar', { name: 'Travel budget used' })).toHaveAttribute('aria-valuetext', '30.00% used, On track')
  })

  it('trend chart → tooltip on focus and a table view', async () => {
    mockFetch(routes)
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage month={currentMonth} onMonthChange={vi.fn()} onNavigate={vi.fn()} />)
    const chart = await screen.findByRole('group', { name: `Monthly spending in ${year}` })

    const bars = within(chart).getAllByRole('img')
    bars[bars.length - 1].focus()
    expect(await screen.findByText(/· 3 expenses/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show table' }))
    const table = screen.getByRole('table', { name: `Monthly totals for ${year}` })
    expect(within(table).getByRole('cell', { name: currentMonth })).toBeInTheDocument()
  })

  it('hero → month-over-month change only from real previous-month totals', async () => {
    const [y, mm] = currentMonth.split('-').map(Number)
    mockFetch([
      routes[0],
      { path: /\/api\/summaries\/monthly/, response: { body: mm > 1 ? [{ month: `${y}-${String(mm - 1).padStart(2, '0')}`, total: 100, count: 2 }, { month: currentMonth, total: 120, count: 3 }] : [] } },
      routes[2],
      routes[3],
    ])

    renderWithProviders(<OverviewPage month={currentMonth} onMonthChange={vi.fn()} onNavigate={vi.fn()} />)

    if (mm > 1) {
      expect(await screen.findByText(/▲ 20.00% vs/)).toBeInTheDocument()
    } else {
      expect(screen.queryByText(/vs/)).not.toBeInTheDocument()
    }
  })

  it('Add expense → navigates to Expenses with the form open', async () => {
    mockFetch(routes)
    const onNavigate = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage month={currentMonth} onMonthChange={vi.fn()} onNavigate={onNavigate} />)

    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(onNavigate).toHaveBeenCalledWith('expenses', { create: true })
  })
})
