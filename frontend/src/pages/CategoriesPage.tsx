import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { categoriesApi } from '../api/categories'
import { EmptyState, ErrorMessage, LoadingState } from '../components/StatusMessages'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Dialog'
import { DrawerForm } from '../components/ui/Drawer'
import { Field } from '../components/ui/Field'
import { fieldA11y } from '../components/ui/fieldA11y'
import { useToast } from '../components/ui/toastContext'
import { useCategories } from '../hooks/useCategories'
import { PageHeader } from '../layout/PageHeader'
import type { Category } from '../types/api'
import { validateCategoryName } from '../utils/validation'

type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; category: Category }

function CategoryForm({ state, onClose, onSaved }: { state: FormState; onClose: () => void; onSaved: (category: Category, created: boolean) => void }) {
  const editing = state.mode === 'edit' ? state.category : null
  const [name, setName] = useState<string>(editing?.name ?? '')
  const [description, setDescription] = useState<string>(editing?.description ?? '')
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [descriptionError, setDescriptionError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState<boolean>(false)

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (saving) {
      return
    }

    const clientError = validateCategoryName(name)
    setNameError(clientError)
    setDescriptionError(description.trim().length > 250 ? 'Description must be at most 250 characters.' : undefined)
    if (clientError || description.trim().length > 250) {
      return
    }

    setSaving(true)
    try {
      const body = { name: name.trim(), description: description.trim() || null }
      const saved = editing ? await categoriesApi.update(editing.id, body) : await categoriesApi.create(body)
      onSaved(saved, editing === null)
    } catch (caught: unknown) {
      // 409: another category already has this name (compared case-insensitively).
      setNameError(caught instanceof ApiError ? (caught.fieldError('name') ?? caught.detail ?? caught.title) : 'The category could not be saved.')
      if (caught instanceof ApiError) {
        setDescriptionError(caught.fieldError('description'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <DrawerForm
      open={state.mode !== 'closed'}
      title={editing ? 'Rename category' : 'Add category'}
      description={editing ? `Change the name or description of “${editing.name}”.` : 'Names are unique, ignoring upper and lower case.'}
      submitLabel={editing ? 'Save changes' : 'Add category'}
      saving={saving}
      onSubmit={(event) => void submit(event)}
      onClose={onClose}
    >
      <Field id="category-name" label="Name" error={nameError}>
        <input id="category-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={50} autoComplete="off" data-autofocus {...fieldA11y('category-name', nameError)} />
      </Field>
      <Field id="category-description" label="Description (optional)" error={descriptionError}>
        <textarea id="category-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={250} rows={3} {...fieldA11y('category-description', descriptionError)} />
      </Field>
    </DrawerForm>
  )
}

export function CategoriesPage() {
  const categories = useCategories()
  const toast = useToast()
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [formKey, setFormKey] = useState<number>(0)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [deleteBusy, setDeleteBusy] = useState<boolean>(false)

  const openForm = (next: FormState): void => {
    setFormKey((key) => key + 1)
    setForm(next)
  }

  const saved = (category: Category, created: boolean): void => {
    setForm({ mode: 'closed' })
    toast.notify('success', created ? 'Category added' : 'Category updated', `“${category.name}” is saved.`)
    categories.reload()
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deleting) {
      return
    }

    setDeleteBusy(true)
    try {
      await categoriesApi.remove(deleting.id)
      toast.notify('success', 'Category deleted', `“${deleting.name}” and its budgets were removed.`)
      categories.reload()
    } catch (caught: unknown) {
      // 409: the category still has expenses, so the API refuses to delete it.
      toast.notify('error', 'Category not deleted', caught instanceof ApiError ? (caught.detail ?? caught.title) : 'Please try again.')
    } finally {
      setDeleteBusy(false)
      setDeleting(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Categories"
        description="Organise expenses into categories. Categories that still have expenses can't be deleted."
        actions={
          <Button variant="primary" icon="plus" onClick={() => openForm({ mode: 'add' })}>
            Add category
          </Button>
        }
      />

      {categories.loading ? (
        <div className="card">
          <LoadingState label="Loading categories…" />
        </div>
      ) : null}
      {categories.error ? <ErrorMessage title="Categories could not be loaded" error={categories.error} onRetry={categories.reload} /> : null}
      {!categories.loading && categories.data ? (
        categories.data.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="categories"
              title="No categories yet"
              message="Add your first category to start recording expenses."
              action={
                <Button icon="plus" onClick={() => openForm({ mode: 'add' })}>
                  Add category
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="grid-cards" aria-label="Categories" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {categories.data.map((category) => (
              <li key={category.id} className="card card-hover category-card">
                <span className={`category-avatar avatar-${category.id % 6}`} aria-hidden="true">
                  {category.name.charAt(0).toUpperCase()}
                </span>
                <div className="category-text">
                  <h3>{category.name}</h3>
                  <p>{category.description ?? 'No description'}</p>
                </div>
                <div className="row-actions">
                  <Button size="sm" variant="ghost" icon="edit" iconOnly onClick={() => openForm({ mode: 'edit', category })}>
                    {`Rename ${category.name}`}
                  </Button>
                  <Button size="sm" variant="ghost" icon="trash" iconOnly onClick={() => setDeleting(category)}>
                    {`Delete ${category.name}`}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <CategoryForm key={formKey} state={form} onClose={() => setForm({ mode: 'closed' })} onSaved={saved} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete category?"
        confirmLabel="Delete category"
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      >
        {deleting ? (
          <p>
            “{deleting.name}” and any budgets set for it will be deleted. If it still has expenses, the API will refuse and nothing is
            changed.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
