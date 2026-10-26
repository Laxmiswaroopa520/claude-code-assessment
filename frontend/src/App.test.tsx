import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { categories, page } from './test/fixtures'
import { mockFetch } from './test/fetchMock'
import type { MockRoute } from './test/fetchMock'

const routes: MockRoute[] = [
  { path: '/api/categories', response: { body: categories } },
  { path: /\/api\/expenses/, response: { body: page([]) } },
  { path: /\/api\/budgets/, response: { body: [] } },
  { path: /\/api\/summaries\/categories/, response: { body: [] } },
  { path: /\/api\/summaries\/monthly/, response: { body: [] } },
]

describe('App', () => {
  it('renders the shell with sidebar navigation and the Overview page', () => {
    mockFetch(routes)

    render(<App />)

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('button')).toHaveLength(5)
    expect(within(nav).getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
  })

  it('clicking a navigation item → switches page and marks it current', async () => {
    mockFetch(routes)
    const user = userEvent.setup()
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'Main' })

    await user.click(within(nav).getByRole('button', { name: 'Budgets' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Budgets' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page')
  })

  it('Overview "Add expense" → opens the Expenses page with the form drawer', async () => {
    mockFetch(routes)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument()
    expect(await screen.findByRole('dialog', { name: 'Add expense' })).toBeInTheDocument()
  })

  it('sidebar collapse and mobile menu buttons → toggle their expanded state', async () => {
    mockFetch(routes)
    const user = userEvent.setup()
    render(<App />)

    const collapse = screen.getByRole('button', { name: 'Collapse sidebar' })
    await user.click(collapse)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')

    const menu = screen.getByRole('button', { name: 'Open navigation' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    await user.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(menu).toHaveAttribute('aria-expanded', 'false')
  })
})
