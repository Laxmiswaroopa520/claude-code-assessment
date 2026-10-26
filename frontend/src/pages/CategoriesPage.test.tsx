import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { categories } from '../test/fixtures'
import { mockFetch, problem } from '../test/fetchMock'
import { CategoriesPage } from './CategoriesPage'

describe('CategoriesPage', () => {
  it('categories → listed in a table', async () => {
    mockFetch([{ path: '/api/categories', response: { body: categories } }])

    render(<CategoriesPage />)

    expect(await screen.findByRole('cell', { name: 'Food' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Trips' })).toBeInTheDocument()
  })

  it('no categories → empty state', async () => {
    mockFetch([{ path: '/api/categories', response: { body: [] } }])

    render(<CategoriesPage />)

    expect(await screen.findByText('No categories yet. Add one above.')).toBeInTheDocument()
  })

  it('add → POSTs the trimmed name and shows a confirmation', async () => {
    const fetchMock = mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { method: 'POST', path: '/api/categories', response: { status: 201, body: { id: 3, name: 'Health', description: null } } },
    ])
    const user = userEvent.setup()
    render(<CategoriesPage />)
    await screen.findByRole('cell', { name: 'Food' })

    await user.type(screen.getByLabelText('Name'), '  Health  ')
    await user.click(screen.getByRole('button', { name: 'Add category' }))

    expect(await screen.findByText('Added "Health".')).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'POST')?.body).toEqual({ name: 'Health', description: null })
  })

  it('duplicate name 409 → message under the name field', async () => {
    mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { method: 'POST', path: '/api/categories', response: problem(409, 'Conflict', { detail: "A category named 'food' already exists." }) },
    ])
    const user = userEvent.setup()
    render(<CategoriesPage />)
    await screen.findByRole('cell', { name: 'Food' })

    await user.type(screen.getByLabelText('Name'), 'food')
    await user.click(screen.getByRole('button', { name: 'Add category' }))

    expect(await screen.findByText("A category named 'food' already exists.")).toHaveAttribute('id', 'category-name-error')
  })

  it('delete a category in use 409 → explains why it was not deleted', async () => {
    mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { method: 'DELETE', path: '/api/categories/1', response: problem(409, 'Conflict', { detail: "Category 'Food' has expenses and cannot be deleted." }) },
    ])
    const user = userEvent.setup()
    render(<CategoriesPage />)
    await screen.findByRole('cell', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'Delete Food' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Category 'Food' has expenses and cannot be deleted.")
  })

  it('rename → PUTs the new name', async () => {
    const fetchMock = mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { method: 'PUT', path: '/api/categories/2', response: { body: { id: 2, name: 'Trips', description: 'Trips' } } },
    ])
    const user = userEvent.setup()
    render(<CategoriesPage />)
    await screen.findByRole('cell', { name: 'Travel' })

    await user.click(screen.getByRole('button', { name: 'Rename Travel' }))
    const input = screen.getByLabelText('New name for Travel')
    await user.clear(input)
    await user.type(input, 'Trips')
    await user.click(within(input.closest('form') ?? document.body).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Renamed to "Trips".')).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'PUT')?.body).toEqual({ name: 'Trips', description: 'Trips' })
  })
})
