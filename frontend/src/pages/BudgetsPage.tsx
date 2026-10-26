import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { budgetsApi } from '../api/budgets'
import { BudgetProgress } from '../components/BudgetStatusBadge'
import { CategorySelect } from '../components/CategorySelect'
import { ConfirmButton } from '../components/ConfirmButton'
import { EmptyState, ErrorMessage, FieldError, LoadingState, SuccessMessage } from '../components/StatusMessages'
import { useBudgets } from '../hooks/useBudgets'
import { useCategories } from '../hooks/useCategories'
import type { Budget, BudgetType } from '../types/api'
import { formatMoney, toMonth } from '../utils/format'
import { validateMoney } from '../utils/validation'

interface BudgetFormValues {
  categoryId: string
  limit: string
  type: BudgetType
}

function apiMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? (caught.detail ?? caught.title) : fallback
}

function BudgetRow({ budget, onChanged, onError }: { budget: Budget; onChanged: (message: string) => void; onError: (message: string) => void }) {
  const [editing, setEditing] = useState<boolean>(false)
  const [limit, setLimit] = useState<string>(budget.limit.toFixed(2))
  const [type, setType] = useState<BudgetType>(budget.type)
  const [error, setError] = useState<string | undefined>(undefined)

  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const limitError = validateMoney(limit, 'Limit')
    setError(limitError)
    if (limitError) {
      return
    }

    try {
      await budgetsApi.update(budget.id, { categoryId: budget.categoryId, month: budget.month, limit: Number(limit), type })
      setEditing(false)
      onChanged(`Updated the ${budget.categoryName} budget.`)
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? (caught.fieldError('limit') ?? caught.detail ?? caught.title) : 'The budget could not be saved.')
    }
  }

  const remove = async (): Promise<void> => {
    try {
      await budgetsApi.remove(budget.id)
      onChanged(`Deleted the ${budget.categoryName} budget.`)
    } catch (caught: unknown) {
      onError(apiMessage(caught, 'The budget could not be deleted.'))
    }
  }

  return (
    <li className="card budget">
      <div className="budget-header">
        <h3>{budget.categoryName}</h3>
        <span className="muted">{budget.type} budget</span>
      </div>
      <p>
        {formatMoney(budget.spent)} spent of {formatMoney(budget.limit)} · {formatMoney(budget.remaining)} remaining
      </p>
      <BudgetProgress percentUsed={budget.percentUsed} status={budget.status} label={`${budget.categoryName} budget used`} />
      {editing ? (
        <form className="inline-form" onSubmit={(event) => void save(event)} noValidate>
          <label htmlFor={`budget-limit-${budget.id}`}>Limit</label>
          <input
            id={`budget-limit-${budget.id}`}
            inputMode="decimal"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `budget-limit-${budget.id}-error` : undefined}
          />
          <label htmlFor={`budget-type-${budget.id}`}>Type</label>
          <select id={`budget-type-${budget.id}`} value={type} onChange={(event) => setType(event.target.value as BudgetType)}>
            <option value="Hard">Hard (reject overspending)</option>
            <option value="Soft">Soft (warn only)</option>
          </select>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <FieldError id={`budget-limit-${budget.id}-error`} message={error} />
        </form>
      ) : (
        <div className="actions">
          <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${budget.categoryName} budget`}>
            Edit
          </button>
          <ConfirmButton label="Delete" confirmLabel="Confirm delete" ariaLabel={`Delete ${budget.categoryName} budget`} onConfirm={remove} />
        </div>
      )}
    </li>
  )
}

export function BudgetsPage() {
  const [month, setMonth] = useState<string>(toMonth())
  const categories = useCategories()
  const budgets = useBudgets(month)
  const [values, setValues] = useState<BudgetFormValues>({ categoryId: '', limit: '', type: 'Hard' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | undefined>(undefined)
  const [pageError, setPageError] = useState<string | undefined>(undefined)

  const add = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setPageError(undefined)
    const nextErrors: Record<string, string> = {}
    if (values.categoryId.length === 0) {
      nextErrors.categoryId = 'Category is required.'
    }

    const limitError = validateMoney(values.limit, 'Limit')
    if (limitError) {
      nextErrors.limit = limitError
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      const created = await budgetsApi.create({ categoryId: Number(values.categoryId), month, limit: Number(values.limit), type: values.type })
      setValues({ categoryId: '', limit: '', type: 'Hard' })
      setNotice(`Added a ${created.type} budget for ${created.categoryName} in ${created.month}.`)
      budgets.reload()
    } catch (caught: unknown) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) {
        setErrors({
          categoryId: caught.fieldError('categoryId') ?? '',
          limit: caught.fieldError('limit') ?? '',
          month: caught.fieldError('month') ?? '',
        })
      } else {
        // 409: a budget already exists for this category and month.
        setPageError(apiMessage(caught, 'The budget could not be added.'))
      }
    }
  }

  const changed = (message: string): void => {
    setPageError(undefined)
    setNotice(message)
    budgets.reload()
  }

  return (
    <section aria-labelledby="budgets-heading">
      <h2 id="budgets-heading">Budgets</h2>
      <div className="field month-picker">
        <label htmlFor="budget-month">Month</label>
        <input id="budget-month" type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} />
      </div>
      {notice ? <SuccessMessage messages={[notice]} /> : null}
      {pageError ? <ErrorMessage error={pageError} /> : null}

      <form className="card form" onSubmit={(event) => void add(event)} noValidate aria-label="Add budget">
        <h3>Add a budget for {month}</h3>
        <div className="field">
          <CategorySelect
            id="budget-category"
            label="Category"
            value={values.categoryId}
            categories={categories.data ?? []}
            onChange={(value) => setValues((current) => ({ ...current, categoryId: value }))}
            describedBy={errors.categoryId ? 'budget-category-error' : undefined}
            invalid={Boolean(errors.categoryId)}
          />
          <FieldError id="budget-category-error" message={errors.categoryId || undefined} />
        </div>
        <div className="field">
          <label htmlFor="budget-limit">Limit</label>
          <input
            id="budget-limit"
            inputMode="decimal"
            value={values.limit}
            onChange={(event) => setValues((current) => ({ ...current, limit: event.target.value }))}
            aria-invalid={errors.limit ? true : undefined}
            aria-describedby={errors.limit ? 'budget-limit-error' : undefined}
          />
          <FieldError id="budget-limit-error" message={errors.limit || errors.month || undefined} />
        </div>
        <div className="field">
          <label htmlFor="budget-type">Type</label>
          <select id="budget-type" value={values.type} onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as BudgetType }))}>
            <option value="Hard">Hard (reject overspending)</option>
            <option value="Soft">Soft (warn only)</option>
          </select>
        </div>
        <div className="actions">
          <button type="submit">Add budget</button>
        </div>
      </form>

      {budgets.loading ? <LoadingState label="Loading budgets…" /> : null}
      {budgets.error ? <ErrorMessage error={budgets.error} onRetry={budgets.reload} /> : null}
      {!budgets.loading && budgets.data ? (
        budgets.data.length === 0 ? (
          <EmptyState message={`No budgets for ${month}.`} />
        ) : (
          <ul className="budget-list">
            {budgets.data.map((budget) => (
              <BudgetRow key={`${budget.id}-${budget.limit}-${budget.type}`} budget={budget} onChanged={changed} onError={setPageError} />
            ))}
          </ul>
        )
      ) : null}
    </section>
  )
}
