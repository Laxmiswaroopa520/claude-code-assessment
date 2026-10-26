import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import type { Category, Expense, ExpenseRequest } from '../types/api'
import { toIsoDate } from '../utils/format'
import { validateExpense } from '../utils/validation'
import type { ExpenseFormValues, FieldErrors } from '../utils/validation'
import { CategorySelect } from './CategorySelect'
import { ErrorMessage } from './StatusMessages'
import { DrawerForm } from './ui/Drawer'
import { Field } from './ui/Field'
import { fieldA11y } from './ui/fieldA11y'

interface ExpenseFormProps {
  open: boolean
  categories: Category[]
  /** null = add mode. */
  editing: Expense | null
  onSubmit: (request: ExpenseRequest) => Promise<void>
  onClose: () => void
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

const fields = ['title', 'amount', 'date', 'categoryId', 'notes']

/**
 * Add/edit drawer. Client checks give instant feedback; API 400 field errors and the 422 hard-budget rejection
 * are shown in place, the input is kept, and the drawer only closes after a successful save (done by the caller).
 */
export function ExpenseForm({ open, categories, editing, onSubmit, onClose }: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(() => initialValues(editing))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<{ title: string; message: string } | undefined>(undefined)
  const [saving, setSaving] = useState<boolean>(false)

  const update = (field: keyof ExpenseFormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (saving) {
      return
    }

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
    } catch (caught: unknown) {
      if (caught instanceof ApiError) {
        const serverErrors: FieldErrors = {}
        for (const field of fields) {
          const message = caught.fieldError(field)
          if (message) {
            serverErrors[field] = message
          }
        }

        setErrors(serverErrors)
        if (caught.isBudgetRejection) {
          setFormError({ title: 'Hard budget exceeded', message: caught.detail ?? caught.title })
        } else if (Object.keys(serverErrors).length === 0) {
          setFormError({ title: 'The expense could not be saved', message: caught.detail ?? caught.title })
        }
      } else {
        setFormError({ title: 'The expense could not be saved', message: 'Please try again.' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <DrawerForm
      open={open}
      title={editing ? 'Edit expense' : 'Add expense'}
      description={editing ? `Update “${editing.title}”.` : 'Record a new expense. Budget rules are checked when you save.'}
      submitLabel={editing ? 'Save changes' : 'Add expense'}
      saving={saving}
      onSubmit={(event) => void handleSubmit(event)}
      onClose={onClose}
    >
      {formError ? <ErrorMessage title={formError.title} error={formError.message} /> : null}

      <Field id="expense-title" label="Title" error={errors.title}>
        <input id="expense-title" value={values.title} onChange={(event) => update('title', event.target.value)} maxLength={100} autoComplete="off" data-autofocus {...fieldA11y('expense-title', errors.title)} />
      </Field>

      <div className="form-grid two">
        <Field id="expense-amount" label="Amount" error={errors.amount}>
          <input id="expense-amount" inputMode="decimal" value={values.amount} onChange={(event) => update('amount', event.target.value)} placeholder="0.00" {...fieldA11y('expense-amount', errors.amount)} />
        </Field>
        <Field id="expense-date" label="Date" error={errors.date}>
          <input id="expense-date" type="date" value={values.date} max={toIsoDate()} onChange={(event) => update('date', event.target.value)} {...fieldA11y('expense-date', errors.date)} />
        </Field>
      </div>

      <Field id="expense-categoryId" label="Category" error={errors.categoryId}>
        <CategorySelect id="expense-categoryId" value={values.categoryId} categories={categories} onChange={(value) => update('categoryId', value)} error={errors.categoryId} />
      </Field>

      <Field id="expense-notes" label="Notes (optional)" error={errors.notes} hint="Up to 500 characters.">
        <textarea id="expense-notes" value={values.notes} onChange={(event) => update('notes', event.target.value)} rows={3} {...fieldA11y('expense-notes', errors.notes, 'Up to 500 characters.')} />
      </Field>
    </DrawerForm>
  )
}
