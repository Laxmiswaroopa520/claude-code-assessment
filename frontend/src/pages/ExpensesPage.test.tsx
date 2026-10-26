import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { categories, expense, page } from '../test/fixtures'
import { mockFetch, problem } from '../test/fetchMock'
import type { MockRoute } from '../test/fetchMock'
import { renderWithProviders } from '../test/render'
import { ExpensesPage } from './ExpensesPage'

const categoriesRoute: MockRoute = { path: '/api/categories', response: { body: categories } }

function listRoute(body: unknown): MockRoute {
  return { path: /\/api\/expenses(\?|$)/, response: { body } }
}

async function openAddDrawer(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(screen.getAllByRole('button', { name: 'Add expense' })[0])
  return screen.findByRole('dialog', { name: 'Add expense' })
}

async function fillValid(user: ReturnType<typeof userEvent.setup>, drawer: HTMLElement, title: string, amount: string): Promise<void> {
  await user.type(within(drawer).getByLabelText('Title'), title)
  await user.type(within(drawer).getByLabelText('Amount'), amount)
  await user.selectOptions(within(drawer).getByLabelText('Category'), '1')
}

describe('ExpensesPage', () => {
  it('loading then rows → shows the expense table and pager', async () => {
    mockFetch([categoriesRoute, listRoute(page([expense()]))])

    renderWithProviders(<ExpensesPage />)

    expect(screen.getByText('Loading expenses…')).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: 'Lunch' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '12.50' })).toBeInTheDocument()
    expect(screen.getByText('Food', { selector: '.badge' })).toBeInTheDocument()
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument()
  })

  it('no results → empty state', async () => {
    mockFetch([categoriesRoute, listRoute(page([]))])

    renderWithProviders(<ExpensesPage />)

    expect(await screen.findByText('No expenses found')).toBeInTheDocument()
  })

  it('API failure → error state with a working retry', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      { path: /\/api\/expenses/, once: true, response: problem(500, 'An unexpected error occurred.') },
      listRoute(page([expense()])),
    ])
    const user = userEvent.setup()

    renderWithProviders(<ExpensesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('cell', { name: 'Lunch' })).toBeInTheDocument()
    expect(fetchMock.calls.filter((call) => call.url.startsWith('/api/expenses')).length).toBe(2)
  })

  it('startWithCreate → opens the add drawer immediately', async () => {
    mockFetch([categoriesRoute, listRoute(page([]))])

    renderWithProviders(<ExpensesPage startWithCreate />)

    expect(await screen.findByRole('dialog', { name: 'Add expense' })).toBeInTheDocument()
  })

  it('empty form submit → client validation messages and no POST', async () => {
    const fetchMock = mockFetch([categoriesRoute, listRoute(page([]))])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByText('No expenses found')
    const drawer = await openAddDrawer(user)

    await user.click(within(drawer).getByRole('button', { name: 'Add expense' }))

    expect(within(drawer).getByText('Title is required.')).toBeInTheDocument()
    expect(within(drawer).getByText('Amount is required.')).toBeInTheDocument()
    expect(within(drawer).getByText('Category is required.')).toBeInTheDocument()
    expect(within(drawer).getByLabelText('Title')).toHaveAttribute('aria-describedby', 'expense-title-error')
    expect(fetchMock.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('valid submit → POSTs, closes the drawer, shows a success toast and soft-budget warnings', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      listRoute(page([])),
      {
        method: 'POST',
        path: '/api/expenses',
        response: { status: 201, body: expense({ title: 'Dinner', amount: 20, warnings: ["Budget exceeded for 'Food' in 2026-10: 110.00 / 100.00"] }) },
      },
    ])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByText('No expenses found')
    const drawer = await openAddDrawer(user)

    await fillValid(user, drawer, 'Dinner', '20')
    await user.click(within(drawer).getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByText('Expense added')).toBeInTheDocument()
    expect(screen.getByText("Budget exceeded for 'Food' in 2026-10: 110.00 / 100.00")).toBeInTheDocument()
    expect(screen.getByText('Budget warning')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add expense' })).not.toBeInTheDocument())
    const post = fetchMock.calls.find((call) => call.method === 'POST')
    expect(post?.body).toMatchObject({ title: 'Dinner', amount: 20, categoryId: 1, notes: null })
  })

  it('hard budget 422 → error inside the drawer, input kept, drawer stays open', async () => {
    mockFetch([
      categoriesRoute,
      listRoute(page([])),
      { method: 'POST', path: '/api/expenses', response: problem(422, 'Budget exceeded', { detail: "Hard budget for 'Food' in 2026-10 would be exceeded." }) },
    ])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByText('No expenses found')
    const drawer = await openAddDrawer(user)

    await fillValid(user, drawer, 'Flight', '500')
    await user.click(within(drawer).getByRole('button', { name: 'Add expense' }))

    const alert = await within(drawer).findByRole('alert')
    expect(alert).toHaveTextContent('Hard budget exceeded')
    expect(alert).toHaveTextContent("Hard budget for 'Food' in 2026-10 would be exceeded.")
    expect(within(drawer).getByLabelText('Title')).toHaveValue('Flight')
    expect(screen.getByRole('dialog', { name: 'Add expense' })).toBeInTheDocument()
  })

  it('server 400 field error → shown under the matching input', async () => {
    mockFetch([
      categoriesRoute,
      listRoute(page([])),
      { method: 'POST', path: '/api/expenses', response: problem(400, 'One or more validation errors occurred.', { errors: { CategoryId: ['Category 1 does not exist.'] } }) },
    ])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByText('No expenses found')
    const drawer = await openAddDrawer(user)

    await fillValid(user, drawer, 'Taxi', '15')
    await user.click(within(drawer).getByRole('button', { name: 'Add expense' }))

    expect(await within(drawer).findByText('Category 1 does not exist.')).toHaveAttribute('id', 'expense-categoryId-error')
  })

  it('Escape → closes the drawer without saving', async () => {
    const fetchMock = mockFetch([categoriesRoute, listRoute(page([]))])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByText('No expenses found')
    await openAddDrawer(user)

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add expense' })).not.toBeInTheDocument())
    expect(fetchMock.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('applying filters → requests the API with the backend query parameter names', async () => {
    const fetchMock = mockFetch([categoriesRoute, listRoute(page([expense()]))])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByRole('cell', { name: 'Lunch' })
    const filters = screen.getByRole('form', { name: 'Filter expenses' })

    await user.type(within(filters).getByLabelText('Search'), 'taxi')
    await user.click(within(filters).getByRole('button', { name: 'Filters' }))
    await user.selectOptions(within(filters).getByLabelText('Category'), '2')
    await user.type(within(filters).getByLabelText('Min amount'), '10')
    await user.selectOptions(within(filters).getByLabelText('Sort by'), 'amount')
    await user.selectOptions(within(filters).getByLabelText('Direction'), 'asc')
    await user.click(within(filters).getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => {
      const last = fetchMock.calls.filter((call) => call.url.startsWith('/api/expenses')).at(-1)
      expect(last?.url).toBe('/api/expenses?q=taxi&categoryId=2&minAmount=10&sortBy=amount&sortDir=asc&page=1&pageSize=10')
    })
    expect(within(filters).getByRole('button', { name: 'Filters (3)' })).toBeInTheDocument()
  })

  it('delete → confirmation dialog first, then DELETE and a success toast', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      listRoute(page([expense()])),
      { method: 'DELETE', path: '/api/expenses/5', response: { status: 204 } },
    ])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByRole('cell', { name: 'Lunch' })

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete expense?' })
    expect(dialog).toHaveTextContent('“Lunch” (12.50')
    expect(fetchMock.calls.some((call) => call.method === 'DELETE')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Delete expense' }))

    expect(await screen.findByText('Expense deleted')).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.method === 'DELETE' && call.url === '/api/expenses/5')).toBe(true)
  })

  it('delete cancelled → nothing is deleted', async () => {
    const fetchMock = mockFetch([categoriesRoute, listRoute(page([expense()]))])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByRole('cell', { name: 'Lunch' })

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(fetchMock.calls.some((call) => call.method === 'DELETE')).toBe(false)
  })

  it('delete failure → error toast', async () => {
    mockFetch([
      categoriesRoute,
      listRoute(page([expense()])),
      { method: 'DELETE', path: '/api/expenses/5', response: problem(404, 'Not Found', { detail: 'Expense 5 was not found.' }) },
    ])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByRole('cell', { name: 'Lunch' })

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete expense' }))

    expect(await screen.findByText('Expense 5 was not found.')).toBeInTheDocument()
  })

  it('edit → pre-fills the drawer and PUTs the change', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      listRoute(page([expense()])),
      { method: 'PUT', path: '/api/expenses/5', response: { body: expense({ title: 'Team lunch' }) } },
    ])
    const user = userEvent.setup()
    renderWithProviders(<ExpensesPage />)
    await screen.findByRole('cell', { name: 'Lunch' })

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    const drawer = await screen.findByRole('dialog', { name: 'Edit expense' })
    expect(within(drawer).getByLabelText('Amount')).toHaveValue('12.50')
    await user.clear(within(drawer).getByLabelText('Title'))
    await user.type(within(drawer).getByLabelText('Title'), 'Team lunch')
    await user.click(within(drawer).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Expense updated')).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'PUT')?.body).toMatchObject({ title: 'Team lunch', amount: 12.5, categoryId: 1 })
  })
})
