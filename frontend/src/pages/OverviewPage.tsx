import { CategoryBreakdown } from '../charts/CategoryBreakdown'
import { MonthlyTrendChart } from '../charts/MonthlyTrendChart'
import { BudgetProgress } from '../components/BudgetStatusBadge'
import { ExpenseTable } from '../components/ExpenseTable'
import { KpiCard, KpiSkeleton } from '../components/KpiCard'
import { OverviewHero } from '../components/OverviewHero'
import { EmptyState, ErrorMessage, LoadingState } from '../components/StatusMessages'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useBudgets } from '../hooks/useBudgets'
import { useExpenses } from '../hooks/useExpenses'
import { useCategorySummary, useMonthlyTotals } from '../hooks/useSummary'
import { PageHeader } from '../layout/PageHeader'
import type { PageId } from '../layout/navigation'
import type { BudgetStatus } from '../types/api'
import { formatMoney, formatMonthLabel, formatPercent } from '../utils/format'
import { monthsToShow } from '../utils/period'

interface OverviewPageProps {
  month: string
  onMonthChange: (month: string) => void
  onNavigate: (page: PageId, options?: { create?: boolean }) => void
}

const statusLabels: Record<BudgetStatus, string> = { OnTrack: 'On track', Warning: 'Warning', Exceeded: 'Exceeded' }

export function OverviewPage({ month, onMonthChange, onNavigate }: OverviewPageProps) {
  const year = Number(month.slice(0, 4))
  const summary = useCategorySummary(month)
  const budgets = useBudgets(month)
  const totals = useMonthlyTotals(year)
  const recent = useExpenses({ page: 1, pageSize: 5 })

  // Every figure below is derived from API rows for the selected month; nothing is estimated.
  const rows = summary.data ?? []
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const count = rows.reduce((sum, row) => sum + row.count, 0)
  const budgetList = budgets.data ?? []
  const budgeted = budgetList.reduce((sum, budget) => sum + budget.limit, 0)
  const budgetSpent = budgetList.reduce((sum, budget) => sum + budget.spent, 0)
  // The API sorts summary rows by total descending.
  const topCategory = rows.find((row) => row.total > 0)

  return (
    <div className="page">
      <PageHeader
        title="Overview"
        description={`Your spending at a glance for ${formatMonthLabel(month)}.`}
        month={month}
        onMonthChange={onMonthChange}
      />

      <OverviewHero
        month={month}
        total={total}
        count={count}
        yearTotals={totals.data}
        budgetsOnTrack={budgetList.filter((budget) => budget.status === 'OnTrack').length}
        budgetCount={budgetList.length}
        loading={summary.loading}
        onAddExpense={() => onNavigate('expenses', { create: true })}
      />

      {summary.error ? <ErrorMessage title="The monthly summary could not be loaded" error={summary.error} onRetry={summary.reload} /> : null}

      <div className="grid-kpi">
        {summary.loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Expenses" value={String(count)} note="Recorded this month" icon="receipt" tone="sky" />
            <KpiCard label="Average expense" value={count > 0 ? formatMoney(total / count) : '—'} note={count > 0 ? 'Total ÷ number of expenses' : 'No expenses this month'} icon="calculator" tone="emerald" />
            <KpiCard
              label="Largest category"
              value={topCategory ? topCategory.categoryName : '—'}
              note={topCategory ? `${formatMoney(topCategory.total)} · ${formatPercent(topCategory.percentOfTotal)} of spending` : 'No spending this month'}
              icon="categories"
              tone="indigo"
            />
          </>
        )}
        {budgets.loading ? (
          <KpiSkeleton />
        ) : budgetList.length > 0 ? (
          <KpiCard
            label="Budget used"
            value={formatPercent((budgetSpent / budgeted) * 100)}
            note={`${formatMoney(budgetSpent)} of ${formatMoney(budgeted)} across ${budgetList.length} budgeted ${budgetList.length === 1 ? 'category' : 'categories'}`}
            icon="gauge"
            tone="amber"
          />
        ) : (
          <KpiCard label="Budget used" value="—" note="No budgets set for this month" icon="gauge" tone="amber" />
        )}
      </div>

      <div className="grid-2">
        <Card title={`Spending trend ${year}`} description="Monthly totals from the API.">
          <div className="card-body">
            {totals.loading ? <LoadingState label="Loading spending trend…" /> : null}
            {totals.error ? <ErrorMessage error={totals.error} onRetry={totals.reload} /> : null}
            {!totals.loading && totals.data ? (
              totals.data.length === 0 ? (
                <EmptyState icon="reports" message={`No expenses recorded in ${year} yet.`} />
              ) : (
                <MonthlyTrendChart year={year} totals={totals.data} months={monthsToShow(year)} selectedMonth={month} />
              )
            ) : null}
          </div>
        </Card>

        <Card title="Top categories" description={`Share of ${formatMonthLabel(month)} spending.`}>
          <div className="card-body">
            {summary.loading ? <LoadingState label="Loading categories…" /> : null}
            {!summary.loading && summary.data ? (
              total === 0 ? <EmptyState icon="categories" message="No spending recorded for this month." /> : <CategoryBreakdown rows={rows} limit={6} />
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card
          title="Recent expenses"
          description="The latest five expenses."
          actions={
            <Button size="sm" variant="ghost" onClick={() => onNavigate('expenses')}>
              View all
            </Button>
          }
        >
          {recent.loading ? <LoadingState label="Loading recent expenses…" /> : null}
          {recent.error ? (
            <div className="card-body">
              <ErrorMessage error={recent.error} onRetry={recent.reload} />
            </div>
          ) : null}
          {!recent.loading && recent.data ? (
            recent.data.items.length === 0 ? (
              <EmptyState icon="receipt" message="No expenses yet." />
            ) : (
              <ExpenseTable expenses={recent.data.items} onEdit={() => undefined} onDelete={() => undefined} readOnly />
            )
          ) : null}
        </Card>

        <Card
          title="Budget status"
          description={formatMonthLabel(month)}
          actions={
            <Button size="sm" variant="ghost" onClick={() => onNavigate('budgets')}>
              Manage
            </Button>
          }
        >
          <div className="card-body stack">
            {budgets.loading ? <LoadingState label="Loading budgets…" /> : null}
            {budgets.error ? <ErrorMessage error={budgets.error} onRetry={budgets.reload} /> : null}
            {!budgets.loading && budgets.data ? (
              budgetList.length === 0 ? (
                <EmptyState icon="budgets" message="No budgets set for this month." />
              ) : (
                <>
                  <div className="status-summary">
                    {(['OnTrack', 'Warning', 'Exceeded'] as BudgetStatus[]).map((status) => (
                      <div key={status} className={`status-tile tile-${status}`}>
                        <span className="muted">{statusLabels[status]}</span>
                        <strong>{budgetList.filter((budget) => budget.status === status).length}</strong>
                      </div>
                    ))}
                  </div>
                  {budgetList.slice(0, 4).map((budget) => (
                    <div key={budget.id}>
                      <div className="hbar-head">
                        <span>{budget.categoryName}</span>
                        <span className="muted">
                          {formatMoney(budget.spent)} / {formatMoney(budget.limit)}
                        </span>
                      </div>
                      <BudgetProgress percentUsed={budget.percentUsed} status={budget.status} label={`${budget.categoryName} budget used`} />
                    </div>
                  ))}
                </>
              )
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}
