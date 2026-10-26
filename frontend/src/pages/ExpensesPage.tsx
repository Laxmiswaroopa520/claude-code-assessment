import { useState } from 'react'
import { ApiError } from '../api/client'
import { expensesApi } from '../api/expenses'
import { ExpenseFilters } from '../components/ExpenseFilters'
import { ExpenseForm } from '../components/ExpenseForm'
import { ExpenseTable } from '../components/ExpenseTable'
import { Pager } from '../components/Pager'
import { EmptyState, ErrorMessage, LoadingState, SuccessMessage } from '../components/StatusMessages'
import { useCategories } from '../hooks/useCategories'
import { useExpenses } from '../hooks/useExpenses'
import type { Expense, ExpenseQuery, ExpenseRequest } from '../types/api'

const PAGE_SIZE = 10

export function ExpensesPage() {
  const [query, setQuery] = useState<ExpenseQuery>({ page: 1, pageSize: PAGE_SIZE })
  const [editing, setEditing] = useState<Expense | null>(null)
  const [notices, setNotices] = useState<string[]>([])
  const [actionError, setActionError] = useState<ApiError | undefined>(undefined)
  const categories = useCategories()
  const expenses = useExpenses(query)

  const save = async (request: ExpenseRequest): Promise<void> => {
    setActionError(undefined)
    const saved = editing ? await expensesApi.update(editing.id, request) : await expensesApi.create(request)
    // Soft-budget warnings are shown after a successful save; they are not errors.
    setNotices([editing ? `Saved "${saved.title}".` : `Added "${saved.title}".`, ...saved.warnings])
    setEditing(null)
    expenses.reload()
  }

  const remove = async (expense: Expense): Promise<void> => {
    setActionError(undefined)
    try {
      await expensesApi.remove(expense.id)
      setNotices([`Deleted "${expense.title}".`])
      if (editing?.id === expense.id) {
        setEditing(null)
      }

      expenses.reload()
    } catch (caught: unknown) {
      setActionError(caught instanceof ApiError ? caught : new ApiError(0, 'The expense could not be deleted.', undefined, {}))
    }
  }

  return (
    <section aria-labelledby="expenses-heading">
      <h2 id="expenses-heading">Expenses</h2>
      <SuccessMessage messages={notices} />
      {actionError ? <ErrorMessage error={actionError} /> : null}

      <div className="layout">
        <ExpenseForm
          key={editing ? `edit-${editing.id}` : 'add'}
          categories={categories.data ?? []}
          editing={editing}
          onSubmit={save}
          onCancelEdit={() => setEditing(null)}
        />

        <div className="stack">
          <ExpenseFilters categories={categories.data ?? []} onApply={(next) => setQuery({ ...next, pageSize: PAGE_SIZE })} />
          {expenses.loading ? <LoadingState label="Loading expenses…" /> : null}
          {expenses.error ? <ErrorMessage error={expenses.error} onRetry={expenses.reload} /> : null}
          {!expenses.loading && !expenses.error && expenses.data ? (
            expenses.data.items.length === 0 ? (
              <EmptyState message="No expenses match these filters." />
            ) : (
              <>
                <ExpenseTable expenses={expenses.data.items} onEdit={setEditing} onDelete={remove} />
                <Pager
                  page={expenses.data.page}
                  totalPages={expenses.data.totalPages}
                  totalCount={expenses.data.totalCount}
                  onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
                />
              </>
            )
          ) : null}
        </div>
      </div>
    </section>
  )
}
