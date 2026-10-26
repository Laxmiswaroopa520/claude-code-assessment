import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { categories, page } from './test/fixtures'
import { mockFetch } from './test/fetchMock'

describe('App', () => {
  it('renders the application heading and main navigation', () => {
    mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { path: /\/api\/expenses/, response: { body: page([]) } },
    ])

    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Expense Management' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page')
  })

  it('clicking a navigation button → switches page', async () => {
    mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { path: /\/api\/expenses/, response: { body: page([]) } },
      { path: /\/api\/budgets/, response: { body: [] } },
    ])
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Budgets' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Budgets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page')
  })
})
