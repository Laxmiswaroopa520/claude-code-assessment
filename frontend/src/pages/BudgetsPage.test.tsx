import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { budget, categories, currentMonth } from '../test/fixtures'
import { mockFetch, problem } from '../test/fetchMock'
import { renderWithProviders } from '../test/render'
import { BudgetsPage } from './BudgetsPage'

const categoriesRoute = { path: '/api/categories', response: { body: categories } }

function renderPage(onMonthChange: (month: string) => void = vi.fn()) {
  return renderWithProviders(<BudgetsPage month={currentMonth} onMonthChange={onMonthChange} />)
}

async function openAdd(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(screen.getAllByRole('button', { name: 'Add budget' })[0])
  return screen.findByRole('dialog', { name: 'Add budget' })
}

describe('BudgetsPage', () => {
  it('budget → API status as text, accessible progress bar and amounts', async () => {
    const fetchMock = mockFetch([categoriesRoute, { path: /\/api\/budgets\?month=/, response: { body: [budget()] } }])

    renderPage()

    const card = (await screen.findByRole('heading', { name: 'Food' })).closest('li') ?? document.body
    const progress = within(card).getByRole('progressbar', { name: 'Food budget used' })
    expect(progress).toHaveAttribute('aria-valuenow', '85')
    expect(progress).toHaveAttribute('aria-valuetext', '85.00% used, Warning')
    expect(within(card).getByText('Warning', { selector: '.badge' })).toBeInTheDocument()
    expect(within(card).getByText('30.00')).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.url === `/api/budgets?month=${currentMonth}`)).toBe(true)
  })

  it('exceeded budget → bar capped at 100, text shows the real percentage and the overspend', async () => {
    mockFetch([categoriesRoute, { path: /\/api\/budgets/, response: { body: [budget({ percentUsed: 125, status: 'Exceeded', spent: 250, remaining: -50 })] } }])

    renderPage()

    const progress = await screen.findByRole('progressbar', { name: 'Food budget used' })
    expect(progress).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('125.00% used')).toBeInTheDocument()
    expect(screen.getByText('Over by')).toBeInTheDocument()
  })

  it('no budgets → empty state for the month', async () => {
    mockFetch([categoriesRoute, { path: /\/api\/budgets/, response: { body: [] } }])

    renderPage()

    expect(await screen.findByText(/No budgets for/)).toBeInTheDocument()
  })

  it('changing the reporting month → calls onMonthChange', () => {
    mockFetch([categoriesRoute, { path: /\/api\/budgets/, response: { body: [] } }])
    const onMonthChange = vi.fn()
    renderPage(onMonthChange)
    const input = screen.getByLabelText('Reporting month')

    fireEvent.change(input, { target: { value: '2026-09' } })

    expect(onMonthChange).toHaveBeenCalledWith('2026-09')
  })

  it('add → POSTs category, month, limit and Soft type and shows a toast', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      { path: /\/api\/budgets/, response: { body: [] } },
      { method: 'POST', path: '/api/budgets', response: { status: 201, body: budget({ type: 'Soft', categoryName: 'Travel', limit: 300 }) } },
    ])
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/No budgets for/)
    const drawer = await openAdd(user)

    await user.selectOptions(within(drawer).getByLabelText('Category'), '2')
    await user.type(within(drawer).getByLabelText('Monthly limit'), '300')
    await user.click(within(drawer).getByRole('radio', { name: /Soft/ }))
    await user.click(within(drawer).getByRole('button', { name: 'Add budget' }))

    expect(await screen.findByText('Budget added')).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'POST')?.body).toEqual({ categoryId: 2, month: currentMonth, limit: 300, type: 'Soft' })
  })

  it('invalid limit → client error and no POST', async () => {
    const fetchMock = mockFetch([categoriesRoute, { path: /\/api\/budgets/, response: { body: [] } }])
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/No budgets for/)
    const drawer = await openAdd(user)

    await user.selectOptions(within(drawer).getByLabelText('Category'), '1')
    await user.type(within(drawer).getByLabelText('Monthly limit'), '0')
    await user.click(within(drawer).getByRole('button', { name: 'Add budget' }))

    expect(within(drawer).getByText('Limit must be greater than 0.')).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('duplicate budget 409 → error inside the drawer', async () => {
    mockFetch([
      categoriesRoute,
      { path: /\/api\/budgets/, response: { body: [] } },
      { method: 'POST', path: '/api/budgets', response: problem(409, 'Conflict', { detail: `A budget for 'Food' in ${currentMonth} already exists.` }) },
    ])
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/No budgets for/)
    const drawer = await openAdd(user)

    await user.selectOptions(within(drawer).getByLabelText('Category'), '1')
    await user.type(within(drawer).getByLabelText('Monthly limit'), '100')
    await user.click(within(drawer).getByRole('button', { name: 'Add budget' }))

    expect(await within(drawer).findByRole('alert')).toHaveTextContent(`A budget for 'Food' in ${currentMonth} already exists.`)
  })

  it('edit → pre-fills limit and type and PUTs the change', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      { path: /\/api\/budgets/, response: { body: [budget()] } },
      { method: 'PUT', path: '/api/budgets/3', response: { body: budget({ limit: 250, type: 'Hard' }) } },
    ])
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'Edit Food budget' }))
    const drawer = await screen.findByRole('dialog', { name: 'Edit Food budget' })
    expect(within(drawer).getByRole('radio', { name: /Soft/ })).toBeChecked()
    await user.clear(within(drawer).getByLabelText('Monthly limit'))
    await user.type(within(drawer).getByLabelText('Monthly limit'), '250')
    await user.click(within(drawer).getByRole('radio', { name: /Hard/ }))
    await user.click(within(drawer).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Budget updated')).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'PUT')?.body).toEqual({ categoryId: 1, month: currentMonth, limit: 250, type: 'Hard' })
  })

  it('delete → confirmation dialog then DELETE', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      { path: /\/api\/budgets/, response: { body: [budget()] } },
      { method: 'DELETE', path: '/api/budgets/3', response: { status: 204 } },
    ])
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'Delete Food budget' }))
    await user.click(within(await screen.findByRole('alertdialog', { name: 'Delete budget?' })).getByRole('button', { name: 'Delete budget' }))

    expect(await screen.findByText('Budget deleted')).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.method === 'DELETE' && call.url === '/api/budgets/3')).toBe(true)
  })
})
