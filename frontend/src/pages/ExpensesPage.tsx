import { useState } from 'react'
import { ApiError } from '../api/client'
import { expensesApi } from '../api/expenses'
import { ExpenseFilters } from '../components/ExpenseFilters'
import { ExpenseForm } from '../components/ExpenseForm'
import { ExpenseTable } from '../components/ExpenseTable'
import { Pager } from '../components/Pager'
import { EmptyState, ErrorMessage, LoadingState } from '../components/StatusMessages'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Dialog'
import { useToast } from '../components/ui/toastContext'
import { useCategories } from '../hooks/useCategories'
import { useExpenses } from '../hooks/useExpenses'
import { PageHeader } from '../layout/PageHeader'
import type { Expense, ExpenseQuery, ExpenseRequest } from '../types/api'
import { formatDate, formatMoney } from '../utils/format'

const PAGE_SIZE = 10

type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; expense: Expense }

export function ExpensesPage({ startWithCreate = false }: { startWithCreate?: boolean }) {
  const [query, setQuery] = useState<ExpenseQuery>({ page: 1, pageSize: PAGE_SIZE })
  const [form, setForm] = useState<FormState>(startWithCreate ? { mode: 'add' } : { mode: 'closed' })
  const [formKey, setFormKey] = useState<number>(0)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [deleteBusy, setDeleteBusy] = useState<boolean>(false)
  const toast = useToast()
  const categories = useCategories()
  const expenses = useExpenses(query)

  const openForm = (next: FormState): void => {
    setFormKey((key) => key + 1)
    setForm(next)
  }

  const editing = form.mode === 'edit' ? form.expense : null

  const save = async (request: ExpenseRequest): Promise<void> => {
    const saved = editing ? await expensesApi.update(editing.id, request) : await expensesApi.create(request)
    setForm({ mode: 'closed' })
    toast.notify('success', editing ? 'Expense updated' : 'Expense added', `“${saved.title}” · ${formatMoney(saved.amount)}`)
    // Soft-budget warnings: the expense was saved, so they are shown as warnings, not errors.
    for (const warning of saved.warnings) {
      toast.notify('warning', 'Budget warning', warning)
    }

    expenses.reload()
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deleting) {
      return
    }

    setDeleteBusy(true)
    try {
      await expensesApi.remove(deleting.id)
      toast.notify('success', 'Expense deleted', `“${deleting.title}” was removed.`)
      setDeleting(null)
      expenses.reload()
    } catch (caught: unknown) {
      toast.notify('error', 'Could not delete the expense', caught instanceof ApiError ? (caught.detail ?? caught.title) : 'Please try again.')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  const data = expenses.data

  return (
    <div className="page">
      <PageHeader
        title="Expenses"
        description="Search, filter and manage every expense."
        actions={
          <Button variant="primary" icon="plus" onClick={() => openForm({ mode: 'add' })}>
            Add expense
          </Button>
        }
      />

      <section className="card" aria-label="Expense list">
        <ExpenseFilters categories={categories.data ?? []} onApply={(next) => setQuery({ ...next, pageSize: PAGE_SIZE })} />
        {expenses.loading ? <LoadingState label="Loading expenses…" rows={5} /> : null}
        {expenses.error ? (
          <div className="card-body">
            <ErrorMessage title="Expenses could not be loaded" error={expenses.error} onRetry={expenses.reload} />
          </div>
        ) : null}
        {!expenses.loading && !expenses.error && data ? (
          data.items.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="No expenses found"
              message="No expenses match these filters. Try widening the date range or resetting the filters."
              action={
                <Button icon="plus" onClick={() => openForm({ mode: 'add' })}>
                  Add expense
                </Button>
              }
            />
          ) : (
            <>
              <ExpenseTable expenses={data.items} onEdit={(expense) => openForm({ mode: 'edit', expense })} onDelete={setDeleting} />
              <Pager
                page={data.page}
                pageSize={data.pageSize}
                totalPages={data.totalPages}
                totalCount={data.totalCount}
                onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
              />
            </>
          )
        ) : null}
      </section>

      <ExpenseForm key={formKey} open={form.mode !== 'closed'} categories={categories.data ?? []} editing={editing} onSubmit={save} onClose={() => setForm({ mode: 'closed' })} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete expense?"
        confirmLabel="Delete expense"
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      >
        {deleting ? (
          <p>
            “{deleting.title}” ({formatMoney(deleting.amount)} on {formatDate(deleting.date)}) will be permanently deleted. Budget usage for
            its month is recalculated. This can’t be undone.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
