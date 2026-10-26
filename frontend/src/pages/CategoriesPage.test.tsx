import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { categories } from '../test/fixtures'
import { mockFetch, problem } from '../test/fetchMock'
import { renderWithProviders } from '../test/render'
import { CategoriesPage } from './CategoriesPage'

describe('CategoriesPage', () => {
  it('categories → shown as cards with name and description', async () => {
    mockFetch([{ path: '/api/categories', response: { body: categories } }])

    renderWithProviders(<CategoriesPage />)

    expect(await screen.findByRole('heading', { name: 'Food' })).toBeInTheDocument()
    expect(screen.getByText('Trips')).toBeInTheDocument()
    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('no categories → empty state', async () => {
    mockFetch([{ path: '/api/categories', response: { body: [] } }])

    renderWithProviders(<CategoriesPage />)

    expect(await screen.findByText('No categories yet')).toBeInTheDocument()
  })

  it('load failure → error state', async () => {
    mockFetch([{ path: '/api/categories', response: problem(500, 'An unexpected error occurred.') }])

    renderWithProviders(<CategoriesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Categories could not be loaded')
  })

  it('add → POSTs the trimmed name and shows a success toast', async () => {
    const fetchMock = mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { method: 'POST', path: '/api/categories', response: { status: 201, body: { id: 3, name: 'Health', description: null } } },
    ])
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage />)
    await screen.findByRole('heading', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'Add category' }))
    const drawer = await screen.findByRole('dialog', { name: 'Add category' })
    await user.type(within(drawer).getByLabelText('Name'), '  Health  ')
    await user.click(within(drawer).getByRole('button', { name: 'Add category' }))

    expect(await screen.findByText('Category added')).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'POST')?.body).toEqual({ name: 'Health', description: null })
  })

  it('empty name → client error, no POST', async () => {
    const fetchMock = mockFetch([{ path: '/api/categories', response: { body: categories } }])
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage />)
    await screen.findByRole('heading', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'Add category' }))
    const drawer = await screen.findByRole('dialog', { name: 'Add category' })
    await user.click(within(drawer).getByRole('button', { name: 'Add category' }))

    expect(within(drawer).getByText('Name is required.')).toBeInTheDocument()
    expect(fetchMock.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('duplicate name 409 → message under the name field, drawer stays open', async () => {
    mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { method: 'POST', path: '/api/categories', response: problem(409, 'Conflict', { detail: "A category named 'food' already exists." }) },
    ])
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage />)
    await screen.findByRole('heading', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'Add category' }))
    const drawer = await screen.findByRole('dialog', { name: 'Add category' })
    await user.type(within(drawer).getByLabelText('Name'), 'food')
    await user.click(within(drawer).getByRole('button', { name: 'Add category' }))

    expect(await within(drawer).findByText("A category named 'food' already exists.")).toHaveAttribute('id', 'category-name-error')
  })

  it('delete a category in use 409 → error toast explains why', async () => {
    mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { method: 'DELETE', path: '/api/categories/1', response: problem(409, 'Conflict', { detail: "Category 'Food' has expenses and cannot be deleted." }) },
    ])
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage />)
    await screen.findByRole('heading', { name: 'Food' })

    await user.click(screen.getByRole('button', { name: 'Delete Food' }))
    await user.click(within(await screen.findByRole('alertdialog', { name: 'Delete category?' })).getByRole('button', { name: 'Delete category' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Category 'Food' has expenses and cannot be deleted.")
  })

  it('rename → PUTs the new name and keeps the description', async () => {
    const fetchMock = mockFetch([
      { path: '/api/categories', response: { body: categories } },
      { method: 'PUT', path: '/api/categories/2', response: { body: { id: 2, name: 'Trips', description: 'Trips' } } },
    ])
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage />)
    await screen.findByRole('heading', { name: 'Travel' })

    await user.click(screen.getByRole('button', { name: 'Rename Travel' }))
    const drawer = await screen.findByRole('dialog', { name: 'Rename category' })
    const input = within(drawer).getByLabelText('Name')
    expect(input).toHaveValue('Travel')
    await user.clear(input)
    await user.type(input, 'Trips')
    await user.click(within(drawer).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Category updated')).toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.method === 'PUT')?.body).toEqual({ name: 'Trips', description: 'Trips' })
  })
})
