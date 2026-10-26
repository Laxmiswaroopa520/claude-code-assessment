import { useEffect, useRef, useState } from 'react'
import { Button } from './components/ui/Button'
import { Icon } from './components/ui/Icon'
import { ToastProvider } from './components/ui/Toast'
import { Sidebar } from './layout/Sidebar'
import type { PageId } from './layout/navigation'
import { BudgetsPage } from './pages/BudgetsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { OverviewPage } from './pages/OverviewPage'
import { ReportsPage } from './pages/ReportsPage'
import { toMonth } from './utils/format'

const collapsedKey = 'expense-management.sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(collapsedKey) === 'true'
  } catch {
    return false
  }
}

function App() {
  const [page, setPage] = useState<PageId>('overview')
  const [visit, setVisit] = useState<number>(0)
  const [createOnOpen, setCreateOnOpen] = useState<boolean>(false)
  const [month, setMonth] = useState<string>(toMonth())
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(collapsedKey, String(collapsed))
    } catch {
      // Storage can be unavailable (private mode); the preference is only a convenience.
    }
  }, [collapsed])

  useEffect(() => {
    if (!mobileOpen) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const navigate = (next: PageId, options?: { create?: boolean }): void => {
    setPage(next)
    setCreateOnOpen(options?.create === true)
    setVisit((current) => current + 1)
    setMobileOpen(false)
    mainRef.current?.focus()
  }

  return (
    <ToastProvider>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className={`shell${collapsed ? ' is-collapsed' : ''}`}>
        <Sidebar current={page} collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={navigate} onToggleCollapsed={() => setCollapsed((value) => !value)} />
        {mobileOpen ? <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" /> : null}

        <div className="main">
          <div className="topbar">
            <Button variant="ghost" icon="menu" iconOnly onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="app-sidebar">
              Open navigation
            </Button>
            <span className="brand-mark" style={{ width: '1.75rem', height: '1.75rem' }}>
              <Icon name="wallet" size={16} />
            </span>
            <span className="brand-name">Expense Management</span>
          </div>

          <main id="main-content" ref={mainRef} tabIndex={-1} className="content">
            {page === 'overview' ? <OverviewPage key={visit} month={month} onMonthChange={setMonth} onNavigate={navigate} /> : null}
            {page === 'expenses' ? <ExpensesPage key={visit} startWithCreate={createOnOpen} /> : null}
            {page === 'categories' ? <CategoriesPage key={visit} /> : null}
            {page === 'budgets' ? <BudgetsPage key={visit} month={month} onMonthChange={setMonth} /> : null}
            {page === 'reports' ? <ReportsPage key={visit} month={month} onMonthChange={setMonth} /> : null}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

export default App
