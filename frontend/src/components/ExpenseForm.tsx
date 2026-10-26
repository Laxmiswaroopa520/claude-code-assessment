import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import type { Category, Expense, ExpenseRequest } from '../types/api'
import { toIsoDate } from '../utils/format'
import { validateExpense } from '../utils/validation'
import type { ExpenseFormValues, FieldErrors } from '../utils/validation'
import { CategorySelect } from './CategorySelect'
import { ErrorMessage, FieldError } from './StatusMessages'

interface ExpenseFormProps {
  categories: Category[]
  /** null = add mode. */
  editing: Expense | null
  onSubmit: (request: ExpenseRequest) => Promise<void>
  onCancelEdit: () => void
}

function initialValues(editing: Expense | null): ExpenseFormValues {
  if (!editing) {
    return { title: '', amount: '', date: toIsoDate(), categoryId: '', notes: '' }
  }

  return {
    title: editing.title,
    amount: editing.amount.toFixed(2),
    date: editing.date,
    categoryId: String(editing.categoryId),
    notes: editing.notes ?? '',
  }
}

/** Add/edit form. Client checks give instant feedback; API 400 field errors and 422 budget errors are shown too. */
export function ExpenseForm({ categories, editing, onSubmit, onCancelEdit }: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(() => initialValues(editing))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState<boolean>(false)

  const update = (field: keyof ExpenseFormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setFormError(undefined)
    const clientErrors = validateExpense(values, toIsoDate())
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) {
      return
    }

    const request: ExpenseRequest = {
      title: values.title.trim(),
      amount: Number(values.amount),
      date: values.date,
      categoryId: Number(values.categoryId),
      notes: values.notes.trim().length > 0 ? values.notes.trim() : null,
    }

    setSaving(true)
    try {
      await onSubmit(request)
      if (!editing) {
        setValues(initialValues(null))
      }
    } catch (caught: unknown) {
      if (caught instanceof ApiError) {
        const serverErrors: FieldErrors = {}
        for (const field of ['title', 'amount', 'date', 'categoryId', 'notes']) {
          const message = caught.fieldError(field)
          if (message) {
            serverErrors[field] = message
          }
        }

        setErrors(serverErrors)
        if (caught.isBudgetRejection) {
          setFormError(`Hard budget exceeded: ${caught.detail ?? caught.title}`)
        } else if (Object.keys(serverErrors).length === 0) {
          setFormError(caught.detail ?? caught.title)
        }
      } else {
        setFormError('The expense could not be saved.')
      }
    } finally {
      setSaving(false)
    }
  }

  const fieldProps = (field: string) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `expense-${field}-error` : undefined,
  })

  return (
    <form className="card form" onSubmit={(event) => void handleSubmit(event)} noValidate aria-label={editing ? 'Edit expense' : 'Add expense'}>
      <h2>{editing ? 'Edit expense' : 'Add expense'}</h2>
      {formError ? <ErrorMessage error={formError} /> : null}

      <div className="field">
        <label htmlFor="expense-title">Title</label>
        <input id="expense-title" value={values.title} onChange={(event) => update('title', event.target.value)} maxLength={100} {...fieldProps('title')} />
        <FieldError id="expense-title-error" message={errors.title} />
      </div>

      <div className="field">
        <label htmlFor="expense-amount">Amount</label>
        <input id="expense-amount" inputMode="decimal" value={values.amount} onChange={(event) => update('amount', event.target.value)} {...fieldProps('amount')} />
        <FieldError id="expense-amount-error" message={errors.amount} />
      </div>

      <div className="field">
        <label htmlFor="expense-date">Date</label>
        <input id="expense-date" type="date" value={values.date} max={toIsoDate()} onChange={(event) => update('date', event.target.value)} {...fieldProps('date')} />
        <FieldError id="expense-date-error" message={errors.date} />
      </div>

      <div className="field">
        <CategorySelect
          id="expense-category"
          label="Category"
          value={values.categoryId}
          categories={categories}
          onChange={(value) => update('categoryId', value)}
          describedBy={errors.categoryId ? 'expense-categoryId-error' : undefined}
          invalid={Boolean(errors.categoryId)}
        />
        <FieldError id="expense-categoryId-error" message={errors.categoryId} />
      </div>

      <div className="field">
        <label htmlFor="expense-notes">Notes (optional)</label>
        <textarea id="expense-notes" value={values.notes} onChange={(event) => update('notes', event.target.value)} rows={2} {...fieldProps('notes')} />
        <FieldError id="expense-notes-error" message={errors.notes} />
      </div>

      <div className="actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}
        </button>
        {editing ? (
          <button type="button" onClick={onCancelEdit}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
