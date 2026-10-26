import type { Expense } from '../types/api'
import { formatDate, formatMoney } from '../utils/format'
import { Button } from './ui/Button'

interface ExpenseTableProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  /** Hide the actions column (for read-only lists such as "recent expenses"). */
  readOnly?: boolean
}

export function ExpenseTable({ expenses, onEdit, onDelete, readOnly = false }: ExpenseTableProps) {
  return (
    <div className="table-wrap">
      <table className="responsive-table">
        <caption className="visually-hidden">Expenses</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Expense</th>
            <th scope="col">Category</th>
            <th scope="col" className="amount">Amount</th>
            {readOnly ? null : (
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className="date-cell">{formatDate(expense.date)}</td>
              <td>
                <div className="cell-title">{expense.title}</div>
                {expense.notes ? <div className="cell-sub">{expense.notes}</div> : null}
              </td>
              <td>
                <span className="badge badge-accent">{expense.categoryName}</span>
              </td>
              <td className="amount">{formatMoney(expense.amount)}</td>
              {readOnly ? null : (
                <td className="row-actions-cell">
                  <div className="row-actions">
                    <Button size="sm" variant="ghost" icon="edit" iconOnly onClick={() => onEdit(expense)}>
                      {`Edit ${expense.title}`}
                    </Button>
                    <Button size="sm" variant="ghost" icon="trash" iconOnly onClick={() => onDelete(expense)}>
                      {`Delete ${expense.title}`}
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
