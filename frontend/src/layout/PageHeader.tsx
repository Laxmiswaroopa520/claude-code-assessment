import type { ReactNode } from 'react'
import { Icon } from '../components/ui/Icon'

interface PageHeaderProps {
  title: string
  description: string
  /** Reporting period: shows a month picker bound to the app-wide month. */
  month?: string
  onMonthChange?: (month: string) => void
  actions?: ReactNode
}

export function PageHeader({ title, description, month, onMonthChange, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <ol>
            <li>Expense Management</li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="page-header-actions">
        {month && onMonthChange ? (
          <div className="period">
            <Icon name="calendar" size={16} />
            <input
              id="period-month"
              type="month"
              aria-label="Reporting month"
              value={month}
              onChange={(event) => {
                if (event.target.value) {
                  onMonthChange(event.target.value)
                }
              }}
            />
          </div>
        ) : null}
        {actions}
      </div>
    </header>
  )
}
