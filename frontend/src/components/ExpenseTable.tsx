import type { Expense } from '../types/api'
import { formatMoney } from '../utils/format'
import { ConfirmButton } from './ConfirmButton'

interface ExpenseTableProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => Promise<void>
}

export function ExpenseTable({ expenses, onEdit, onDelete }: ExpenseTableProps) {
  return (
    <table>
      <caption className="visually-hidden">Expenses</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Title</th>
          <th scope="col">Category</th>
          <th scope="col" className="number">Amount</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <td>{expense.date}</td>
            <td>
              {expense.title}
              {expense.notes ? <div className="muted">{expense.notes}</div> : null}
            </td>
            <td>{expense.categoryName}</td>
            <td className="number">{formatMoney(expense.amount)}</td>
            <td className="actions">
              <button type="button" onClick={() => onEdit(expense)} aria-label={`Edit ${expense.title}`}>
                Edit
              </button>
              <ConfirmButton label="Delete" confirmLabel="Confirm delete" ariaLabel={`Delete ${expense.title}`} onConfirm={() => onDelete(expense)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
