import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { budget, categories, currentMonth } from '../test/fixtures'
import { mockFetch, problem } from '../test/fetchMock'
import { BudgetsPage } from './BudgetsPage'

const categoriesRoute = { path: '/api/categories', response: { body: categories } }

describe('BudgetsPage', () => {
  it('budget → status as text plus an accessible progress bar', async () => {
    const fetchMock = mockFetch([categoriesRoute, { path: /\/api\/budgets\?month=/, response: { body: [budget()] } }])

    render(<BudgetsPage />)

    expect(await screen.findByRole('heading', { name: 'Food' })).toBeInTheDocument()
    const progress = screen.getByRole('progressbar', { name: 'Food budget used' })
    expect(progress).toHaveAttribute('aria-valuenow', '85')
    expect(progress).toHaveAttribute('aria-valuetext', '85.00% used, Warning')
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('170.00 spent of 200.00 · 30.00 remaining')).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.url === `/api/budgets?month=${currentMonth}`)).toBe(true)
  })

  it('exceeded budget → bar capped at 100 but text shows the real percentage', async () => {
    mockFetch([categoriesRoute, { path: /\/api\/budgets/, response: { body: [budget({ percentUsed: 125, status: 'Exceeded', spent: 250, remaining: -50 })] } }])

    render(<BudgetsPage />)

    const progress = await screen.findByRole('progressbar', { name: 'Food budget used' })
    expect(progress).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('Exceeded')).toBeInTheDocument()
  })

  it('no budgets → empty state for the month', async () => {
    mockFetch([categoriesRoute, { path: /\/api\/budgets/, response: { body: [] } }])

    render(<BudgetsPage />)

    expect(await screen.findByText(`No budgets for ${currentMonth}.`)).toBeInTheDocument()
  })

  it('add → POSTs category, month, limit and Soft type', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      { path: /\/api\/budgets/, response: { body: [] } },
      { method: 'POST', path: '/api/budgets', response: { status: 201, body: budget({ type: 'Soft', categoryName: 'Travel' }) } },
    ])
    const user = userEvent.setup()
    render(<BudgetsPage />)
    await screen.findByText(`No budgets for ${currentMonth}.`)

    await user.selectOptions(screen.getByLabelText('Category'), '2')
    await user.type(screen.getByLabelText('Limit'), '300')
    await user.selectOptions(screen.getByLabelText('Type'), 'Soft')
    await user.click(screen.getByRole('button', { name: 'Add budget' }))

    expect(await screen.findByText(`Added a Soft budget for Travel in ${currentMonth}.`)).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'POST')?.body).toEqual({ categoryId: 2, month: currentMonth, limit: 300, type: 'Soft' })
  })

  it('invalid limit → client error and no POST', async () => {
    const fetchMock = mockFetch([categoriesRoute, { path: /\/api\/budgets/, response: { body: [] } }])
    const user = userEvent.setup()
    render(<BudgetsPage />)
    await screen.findByText(`No budgets for ${currentMonth}.`)

    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.type(screen.getByLabelText('Limit'), '0')
    await user.click(screen.getByRole('button', { name: 'Add budget' }))

    expect(screen.getByText('Limit must be greater than 0.')).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('duplicate budget 409 → page-level message', async () => {
    mockFetch([
      categoriesRoute,
      { path: /\/api\/budgets/, response: { body: [] } },
      { method: 'POST', path: '/api/budgets', response: problem(409, 'Conflict', { detail: `A budget for 'Food' in ${currentMonth} already exists.` }) },
    ])
    const user = userEvent.setup()
    render(<BudgetsPage />)
    await screen.findByText(`No budgets for ${currentMonth}.`)

    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.type(screen.getByLabelText('Limit'), '100')
    await user.click(screen.getByRole('button', { name: 'Add budget' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(`A budget for 'Food' in ${currentMonth} already exists.`)
  })
})
