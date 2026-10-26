import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { budgetsApi } from '../api/budgets'
import { BudgetProgress } from '../components/BudgetStatusBadge'
import { CategorySelect } from '../components/CategorySelect'
import { EmptyState, ErrorMessage, LoadingState } from '../components/StatusMessages'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Dialog'
import { DrawerForm } from '../components/ui/Drawer'
import { Field } from '../components/ui/Field'
import { fieldA11y } from '../components/ui/fieldA11y'
import { useToast } from '../components/ui/toastContext'
import { useBudgets } from '../hooks/useBudgets'
import { useCategories } from '../hooks/useCategories'
import { PageHeader } from '../layout/PageHeader'
import type { Budget, BudgetStatus, BudgetType, Category } from '../types/api'
import { formatMoney, formatMonthLabel } from '../utils/format'
import { validateMoney } from '../utils/validation'

type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; budget: Budget }

const typeHelp: Record<BudgetType, string> = {
  Hard: 'Expenses that would go over the limit are rejected (HTTP 422).',
  Soft: 'Expenses over the limit are saved with a warning.',
}

interface BudgetFormProps {
  state: FormState
  month: string
  categories: Category[]
  onClose: () => void
  onSaved: (budget: Budget, created: boolean) => void
}

function BudgetForm({ state, month, categories, onClose, onSaved }: BudgetFormProps) {
  const editing = state.mode === 'edit' ? state.budget : null
  const targetMonth = editing?.month ?? month
  const [categoryId, setCategoryId] = useState<string>(editing ? String(editing.categoryId) : '')
  const [limit, setLimit] = useState<string>(editing ? editing.limit.toFixed(2) : '')
  const [type, setType] = useState<BudgetType>(editing?.type ?? 'Hard')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState<boolean>(false)

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (saving) {
      return
    }

    setFormError(undefined)
    const nextErrors: Record<string, string | undefined> = {
      categoryId: categoryId === '' ? 'Category is required.' : undefined,
      limit: validateMoney(limit, 'Limit'),
    }
    setErrors(nextErrors)
    if (nextErrors.categoryId || nextErrors.limit) {
      return
    }

    setSaving(true)
    try {
      const body = { categoryId: Number(categoryId), month: targetMonth, limit: Number(limit), type }
      const saved = editing ? await budgetsApi.update(editing.id, body) : await budgetsApi.create(body)
      onSaved(saved, editing === null)
    } catch (caught: unknown) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) {
        setErrors({ categoryId: caught.fieldError('categoryId'), limit: caught.fieldError('limit') ?? caught.fieldError('month') })
      } else {
        // 409: a budget already exists for this category and month.
        setFormError(caught instanceof ApiError ? (caught.detail ?? caught.title) : 'The budget could not be saved.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <DrawerForm
      open={state.mode !== 'closed'}
      title={editing ? `Edit ${editing.categoryName} budget` : 'Add budget'}
      description={`Budget for ${formatMonthLabel(targetMonth)}. One budget per category per month.`}
      submitLabel={editing ? 'Save changes' : 'Add budget'}
      saving={saving}
      onSubmit={(event) => void submit(event)}
      onClose={onClose}
    >
      {formError ? <ErrorMessage title="The budget could not be saved" error={formError} /> : null}
      <Field id="budget-categoryId" label="Category" error={errors.categoryId}>
        <CategorySelect id="budget-categoryId" value={categoryId} categories={categories} onChange={setCategoryId} error={errors.categoryId} />
      </Field>
      <Field id="budget-limit" label="Monthly limit" error={errors.limit}>
        <input id="budget-limit" inputMode="decimal" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="0.00" data-autofocus={editing ? true : undefined} {...fieldA11y('budget-limit', errors.limit)} />
      </Field>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: '0.35rem' }}>
          Enforcement
        </legend>
        <div className="segmented">
          {(['Hard', 'Soft'] as BudgetType[]).map((option) => (
            <label key={option}>
              <input type="radio" name="budget-type" value={option} checked={type === option} onChange={() => setType(option)} />
              <strong>{option}</strong>
              <span>{typeHelp[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </DrawerForm>
  )
}

const statusOrder: BudgetStatus[] = ['OnTrack', 'Warning', 'Exceeded']
const statusLabels: Record<BudgetStatus, string> = { OnTrack: 'On track', Warning: 'Warning', Exceeded: 'Exceeded' }

export function BudgetsPage({ month, onMonthChange }: { month: string; onMonthChange: (month: string) => void }) {
  const categories = useCategories()
  const budgets = useBudgets(month)
  const toast = useToast()
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [formKey, setFormKey] = useState<number>(0)
  const [deleting, setDeleting] = useState<Budget | null>(null)
  const [deleteBusy, setDeleteBusy] = useState<boolean>(false)

  const openForm = (next: FormState): void => {
    setFormKey((key) => key + 1)
    setForm(next)
  }

  const saved = (budget: Budget, created: boolean): void => {
    setForm({ mode: 'closed' })
    toast.notify('success', created ? 'Budget added' : 'Budget updated', `${budget.type} budget of ${formatMoney(budget.limit)} for ${budget.categoryName} in ${budget.month}.`)
    budgets.reload()
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deleting) {
      return
    }

    setDeleteBusy(true)
    try {
      await budgetsApi.remove(deleting.id)
      toast.notify('success', 'Budget deleted', `The ${deleting.categoryName} budget for ${deleting.month} was removed.`)
      budgets.reload()
    } catch (caught: unknown) {
      toast.notify('error', 'Budget not deleted', caught instanceof ApiError ? (caught.detail ?? caught.title) : 'Please try again.')
    } finally {
      setDeleteBusy(false)
      setDeleting(null)
    }
  }

  const list = budgets.data ?? []

  return (
    <div className="page">
      <PageHeader
        title="Budgets"
        description="Monthly limits per category. Status: below 80% on track, 80–100% warning, above 100% exceeded."
        month={month}
        onMonthChange={onMonthChange}
        actions={
          <Button variant="primary" icon="plus" onClick={() => openForm({ mode: 'add' })}>
            Add budget
          </Button>
        }
      />

      {budgets.loading ? (
        <div className="card">
          <LoadingState label="Loading budgets…" />
        </div>
      ) : null}
      {budgets.error ? <ErrorMessage title="Budgets could not be loaded" error={budgets.error} onRetry={budgets.reload} /> : null}

      {!budgets.loading && budgets.data ? (
        list.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="budgets"
              title={`No budgets for ${formatMonthLabel(month)}`}
              message="Set a Hard budget to block overspending, or a Soft budget to get warnings."
              action={
                <Button icon="plus" onClick={() => openForm({ mode: 'add' })}>
                  Add budget
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="status-summary" aria-label="Budget status counts">
              {statusOrder.map((status) => (
                <div key={status} className={`status-tile tile-${status}`}>
                  <span className="muted">{statusLabels[status]}</span>
                  <strong>{list.filter((budget) => budget.status === status).length}</strong>
                </div>
              ))}
            </div>
            <ul className="grid-cards" aria-label="Budgets" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {list.map((budget) => (
                <li key={budget.id} className={`card card-hover budget-card is-${budget.status}`}>
                  <div className="budget-card-head">
                    <div>
                      <h3>{budget.categoryName}</h3>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>
                        {budget.type} budget · {typeHelp[budget.type]}
                      </span>
                    </div>
                    <div className="row-actions">
                      <Button size="sm" variant="ghost" icon="edit" iconOnly onClick={() => openForm({ mode: 'edit', budget })}>
                        {`Edit ${budget.categoryName} budget`}
                      </Button>
                      <Button size="sm" variant="ghost" icon="trash" iconOnly onClick={() => setDeleting(budget)}>
                        {`Delete ${budget.categoryName} budget`}
                      </Button>
                    </div>
                  </div>
                  <div className="budget-amounts">
                    <strong>{formatMoney(budget.spent)}</strong>
                    <span className="muted">of {formatMoney(budget.limit)}</span>
                  </div>
                  <BudgetProgress percentUsed={budget.percentUsed} status={budget.status} label={`${budget.categoryName} budget used`} />
                  <div className="budget-stats">
                    <div>
                      Spent
                      <strong>{formatMoney(budget.spent)}</strong>
                    </div>
                    <div>
                      {budget.remaining < 0 ? 'Over by' : 'Remaining'}
                      <strong>{formatMoney(Math.abs(budget.remaining))}</strong>
                    </div>
                    <div>
                      Limit
                      <strong>{formatMoney(budget.limit)}</strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}

      <BudgetForm key={formKey} state={form} month={month} categories={categories.data ?? []} onClose={() => setForm({ mode: 'closed' })} onSaved={saved} />

      <ConfirmDialog open={deleting !== null} title="Delete budget?" confirmLabel="Delete budget" busy={deleteBusy} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)}>
        {deleting ? (
          <p>
            The {deleting.type} budget for {deleting.categoryName} in {formatMonthLabel(deleting.month)} will be deleted. Expenses are not
            affected.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
