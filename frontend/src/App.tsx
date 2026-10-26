import { useState } from 'react'
import { BudgetsPage } from './pages/BudgetsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { ReportsPage } from './pages/ReportsPage'

type PageId = 'expenses' | 'categories' | 'budgets' | 'reports'

const pages: { id: PageId; label: string }[] = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'categories', label: 'Categories' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'reports', label: 'Summary & Reports' },
]

function App() {
  const [page, setPage] = useState<PageId>('expenses')

  return (
    <>
      <header className="app-header">
        <h1>Expense Management</h1>
        <nav aria-label="Main">
          <ul>
            {pages.map((item) => (
              <li key={item.id}>
                <button type="button" aria-current={page === item.id ? 'page' : undefined} onClick={() => setPage(item.id)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main>
        {page === 'expenses' ? <ExpensesPage /> : null}
        {page === 'categories' ? <CategoriesPage /> : null}
        {page === 'budgets' ? <BudgetsPage /> : null}
        {page === 'reports' ? <ReportsPage /> : null}
      </main>
    </>
  )
}

export default App
