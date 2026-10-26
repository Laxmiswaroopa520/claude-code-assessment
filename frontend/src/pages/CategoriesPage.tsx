import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { categoriesApi } from '../api/categories'
import { ConfirmButton } from '../components/ConfirmButton'
import { EmptyState, ErrorMessage, FieldError, LoadingState, SuccessMessage } from '../components/StatusMessages'
import { useCategories } from '../hooks/useCategories'
import type { Category } from '../types/api'
import { validateCategoryName } from '../utils/validation'

function messageOf(caught: unknown, fallback: string): string {
  if (caught instanceof ApiError) {
    return caught.fieldError('name') ?? caught.detail ?? caught.title
  }

  return fallback
}

function CategoryRow({ category, onChanged, onError }: { category: Category; onChanged: (message: string) => void; onError: (message: string) => void }) {
  const [editing, setEditing] = useState<boolean>(false)
  const [name, setName] = useState<string>(category.name)
  const [error, setError] = useState<string | undefined>(undefined)

  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const clientError = validateCategoryName(name)
    setError(clientError)
    if (clientError) {
      return
    }

    try {
      await categoriesApi.update(category.id, { name: name.trim(), description: category.description })
      setEditing(false)
      onChanged(`Renamed to "${name.trim()}".`)
    } catch (caught: unknown) {
      setError(messageOf(caught, 'The category could not be renamed.'))
    }
  }

  const remove = async (): Promise<void> => {
    try {
      await categoriesApi.remove(category.id)
      onChanged(`Deleted "${category.name}".`)
    } catch (caught: unknown) {
      // 409: the category still has expenses.
      onError(messageOf(caught, 'The category could not be deleted.'))
    }
  }

  return (
    <tr>
      <td>
        {editing ? (
          <form onSubmit={(event) => void save(event)} className="inline-form">
            <label htmlFor={`rename-${category.id}`} className="visually-hidden">
              New name for {category.name}
            </label>
            <input
              id={`rename-${category.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `rename-${category.id}-error` : undefined}
            />
            <button type="submit">Save</button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setName(category.name)
                setError(undefined)
              }}
            >
              Cancel
            </button>
            <FieldError id={`rename-${category.id}-error`} message={error} />
          </form>
        ) : (
          category.name
        )}
      </td>
      <td>{category.description ?? ''}</td>
      <td className="actions">
        {editing ? null : (
          <button type="button" onClick={() => setEditing(true)} aria-label={`Rename ${category.name}`}>
            Rename
          </button>
        )}
        <ConfirmButton label="Delete" confirmLabel="Confirm delete" ariaLabel={`Delete ${category.name}`} onConfirm={remove} />
      </td>
    </tr>
  )
}

export function CategoriesPage() {
  const categories = useCategories()
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState<string | undefined>(undefined)
  const [pageError, setPageError] = useState<string | undefined>(undefined)

  const add = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setPageError(undefined)
    const clientError = validateCategoryName(name)
    setNameError(clientError)
    if (clientError) {
      return
    }

    try {
      const created = await categoriesApi.create({ name: name.trim(), description: description.trim() || null })
      setName('')
      setDescription('')
      setNotice(`Added "${created.name}".`)
      categories.reload()
    } catch (caught: unknown) {
      setNameError(messageOf(caught, 'The category could not be added.'))
    }
  }

  const changed = (message: string): void => {
    setPageError(undefined)
    setNotice(message)
    categories.reload()
  }

  return (
    <section aria-labelledby="categories-heading">
      <h2 id="categories-heading">Categories</h2>
      {notice ? <SuccessMessage messages={[notice]} /> : null}
      {pageError ? <ErrorMessage error={pageError} /> : null}

      <form className="card form" onSubmit={(event) => void add(event)} noValidate aria-label="Add category">
        <div className="field">
          <label htmlFor="category-name">Name</label>
          <input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'category-name-error' : undefined}
          />
          <FieldError id="category-name-error" message={nameError} />
        </div>
        <div className="field">
          <label htmlFor="category-description">Description (optional)</label>
          <input id="category-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={250} />
        </div>
        <div className="actions">
          <button type="submit">Add category</button>
        </div>
      </form>

      {categories.loading ? <LoadingState label="Loading categories…" /> : null}
      {categories.error ? <ErrorMessage error={categories.error} onRetry={categories.reload} /> : null}
      {!categories.loading && categories.data ? (
        categories.data.length === 0 ? (
          <EmptyState message="No categories yet. Add one above." />
        ) : (
          <table>
            <caption className="visually-hidden">Categories</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Description</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.data.map((category) => (
                <CategoryRow key={`${category.id}-${category.name}`} category={category} onChanged={changed} onError={setPageError} />
              ))}
            </tbody>
          </table>
        )
      ) : null}
    </section>
  )
}
