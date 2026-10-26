import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { categories, expense, page } from '../test/fixtures'
import { mockFetch, problem } from '../test/fetchMock'
import type { MockRoute } from '../test/fetchMock'
import { ExpensesPage } from './ExpensesPage'

const categoriesRoute: MockRoute = { path: '/api/categories', response: { body: categories } }

function listRoute(body: unknown): MockRoute {
  return { path: /\/api\/expenses(\?|$)/, response: { body } }
}

function addForm(): HTMLElement {
  return screen.getByRole('form', { name: 'Add expense' })
}

describe('ExpensesPage', () => {
  it('loading then rows → shows the expense table and pager', async () => {
    mockFetch([categoriesRoute, listRoute(page([expense()]))])

    render(<ExpensesPage />)

    expect(screen.getByText('Loading expenses…')).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: 'Lunch' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '12.50' })).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1 (1 expense)')).toBeInTheDocument()
  })

  it('no results → empty state', async () => {
    mockFetch([categoriesRoute, listRoute(page([]))])

    render(<ExpensesPage />)

    expect(await screen.findByText('No expenses match these filters.')).toBeInTheDocument()
  })

  it('API failure → error state with a working retry', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      { path: /\/api\/expenses/, once: true, response: problem(500, 'An unexpected error occurred.') },
      listRoute(page([expense()])),
    ])
    const user = userEvent.setup()

    render(<ExpensesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('cell', { name: 'Lunch' })).toBeInTheDocument()
    expect(fetchMock.calls.filter((call) => call.url.startsWith('/api/expenses')).length).toBe(2)
  })

  it('empty form submit → client validation messages and no POST', async () => {
    const fetchMock = mockFetch([categoriesRoute, listRoute(page([]))])
    const user = userEvent.setup()
    render(<ExpensesPage />)
    await screen.findByText('No expenses match these filters.')

    await user.click(within(addForm()).getByRole('button', { name: 'Add expense' }))

    expect(screen.getByText('Title is required.')).toBeInTheDocument()
    expect(screen.getByText('Amount is required.')).toBeInTheDocument()
    expect(screen.getByText('Category is required.')).toBeInTheDocument()
    expect(within(addForm()).getByLabelText('Title')).toHaveAttribute('aria-describedby', 'expense-title-error')
    expect(fetchMock.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('valid submit → POSTs the body and shows soft-budget warnings', async () => {
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
    render(<ExpensesPage />)
    await screen.findByText('No expenses match these filters.')
    const form = addForm()

    await user.type(within(form).getByLabelText('Title'), 'Dinner')
    await user.type(within(form).getByLabelText('Amount'), '20')
    await user.selectOptions(within(form).getByLabelText('Category'), '1')
    await user.click(within(form).getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByText("Budget exceeded for 'Food' in 2026-10: 110.00 / 100.00")).toBeInTheDocument()
    expect(screen.getByText('Added "Dinner".')).toBeInTheDocument()
    const post = fetchMock.calls.find((call) => call.method === 'POST')
    expect(post?.body).toMatchObject({ title: 'Dinner', amount: 20, categoryId: 1, notes: null })
  })

  it('hard budget 422 → form-level error and nothing added', async () => {
    mockFetch([
      categoriesRoute,
      listRoute(page([])),
      { method: 'POST', path: '/api/expenses', response: problem(422, 'Budget exceeded', { detail: "Hard budget for 'Food' in 2026-10 would be exceeded." }) },
    ])
    const user = userEvent.setup()
    render(<ExpensesPage />)
    await screen.findByText('No expenses match these filters.')
    const form = addForm()

    await user.type(within(form).getByLabelText('Title'), 'Flight')
    await user.type(within(form).getByLabelText('Amount'), '500')
    await user.selectOptions(within(form).getByLabelText('Category'), '1')
    await user.click(within(form).getByRole('button', { name: 'Add expense' }))

    expect(await within(form).findByRole('alert')).toHaveTextContent("Hard budget exceeded: Hard budget for 'Food' in 2026-10 would be exceeded.")
    expect(within(form).getByLabelText('Title')).toHaveValue('Flight')
  })

  it('server 400 field error → shown under the matching input', async () => {
    mockFetch([
      categoriesRoute,
      listRoute(page([])),
      { method: 'POST', path: '/api/expenses', response: problem(400, 'One or more validation errors occurred.', { errors: { CategoryId: ['Category 1 does not exist.'] } }) },
    ])
    const user = userEvent.setup()
    render(<ExpensesPage />)
    await screen.findByText('No expenses match these filters.')
    const form = addForm()

    await user.type(within(form).getByLabelText('Title'), 'Taxi')
    await user.type(within(form).getByLabelText('Amount'), '15')
    await user.selectOptions(within(form).getByLabelText('Category'), '1')
    await user.click(within(form).getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByText('Category 1 does not exist.')).toHaveAttribute('id', 'expense-categoryId-error')
  })

  it('applying filters → requests the API with the matching query string', async () => {
    const fetchMock = mockFetch([categoriesRoute, listRoute(page([expense()]))])
    const user = userEvent.setup()
    render(<ExpensesPage />)
    await screen.findByRole('cell', { name: 'Lunch' })
    const filters = screen.getByRole('form', { name: 'Filter expenses' })

    await user.type(within(filters).getByLabelText('Search'), 'taxi')
    await user.selectOptions(within(filters).getByLabelText('Category'), '2')
    await user.type(within(filters).getByLabelText('Min amount'), '10')
    await user.selectOptions(within(filters).getByLabelText('Sort by'), 'amount')
    await user.selectOptions(within(filters).getByLabelText('Direction'), 'asc')
    await user.click(within(filters).getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => {
      const last = fetchMock.calls.filter((call) => call.url.startsWith('/api/expenses')).at(-1)
      expect(last?.url).toBe('/api/expenses?q=taxi&categoryId=2&minAmount=10&sortBy=amount&sortDir=asc&page=1&pageSize=10')
    })
  })

  it('delete → asks for confirmation before calling DELETE', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      listRoute(page([expense()])),
      { method: 'DELETE', path: '/api/expenses/5', response: { status: 204 } },
    ])
    const user = userEvent.setup()
    render(<ExpensesPage />)
    await screen.findByRole('cell', { name: 'Lunch' })

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    expect(fetchMock.calls.some((call) => call.method === 'DELETE')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    expect(await screen.findByText('Deleted "Lunch".')).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.method === 'DELETE' && call.url === '/api/expenses/5')).toBe(true)
  })

  it('edit → pre-fills the form and PUTs the change', async () => {
    const fetchMock = mockFetch([
      categoriesRoute,
      listRoute(page([expense()])),
      { method: 'PUT', path: '/api/expenses/5', response: { body: expense({ title: 'Team lunch' }) } },
    ])
    const user = userEvent.setup()
    render(<ExpensesPage />)
    await screen.findByRole('cell', { name: 'Lunch' })

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    const form = screen.getByRole('form', { name: 'Edit expense' })
    expect(within(form).getByLabelText('Amount')).toHaveValue('12.50')
    await user.clear(within(form).getByLabelText('Title'))
    await user.type(within(form).getByLabelText('Title'), 'Team lunch')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved "Team lunch".')).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'PUT')?.body).toMatchObject({ title: 'Team lunch', amount: 12.5, categoryId: 1 })
  })
})
