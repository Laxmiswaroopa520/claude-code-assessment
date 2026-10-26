import type { MonthlyTotal } from '../types/api'
import { formatMoney, formatMonthLabel, formatPercent } from '../utils/format'
import { HeroIllustration } from './illustrations'
import { Button } from './ui/Button'

interface OverviewHeroProps {
  month: string
  total: number
  count: number
  /** Monthly totals for the selected month's year (from the API), used for the month-over-month change. */
  yearTotals: MonthlyTotal[] | undefined
  budgetsOnTrack: number
  budgetCount: number
  loading: boolean
  onAddExpense: () => void
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Good morning'
  }

  return hour < 18 ? 'Good afternoon' : 'Good evening'
}

function previousMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 2, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Overview banner. The headline is this month's total; the change is shown only when the previous month is in
 * the same year's API totals (otherwise it is omitted rather than guessed).
 */
export function OverviewHero({ month, total, count, yearTotals, budgetsOnTrack, budgetCount, loading, onAddExpense }: OverviewHeroProps) {
  const previous = previousMonth(month)
  const sameYear = previous.slice(0, 4) === month.slice(0, 4)
  const previousTotal = sameYear && yearTotals ? (yearTotals.find((item) => item.month === previous)?.total ?? 0) : undefined
  const change = previousTotal !== undefined && previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : undefined

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-text">
        <p className="hero-eyebrow">{greeting()}</p>
        <h2 id="hero-title" className="hero-label">
          Total spent in {formatMonthLabel(month)}
        </h2>
        <p className="hero-value">{loading ? '—' : formatMoney(total)}</p>
        <div className="hero-chips">
          {change !== undefined ? (
            <span className={`hero-chip ${change > 0 ? 'is-up' : 'is-down'}`}>
              {change > 0 ? '▲' : '▼'} {formatPercent(Math.abs(change))} vs {formatMonthLabel(previous).split(' ')[0]}
            </span>
          ) : null}
          <span className="hero-chip">
            {count} {count === 1 ? 'expense' : 'expenses'}
          </span>
          {budgetCount > 0 ? (
            <span className="hero-chip">
              {budgetsOnTrack} of {budgetCount} budgets on track
            </span>
          ) : null}
        </div>
        <div className="hero-actions">
          <Button className="btn-hero" icon="plus" onClick={onAddExpense}>
            Add expense
          </Button>
        </div>
      </div>
      <HeroIllustration />
    </section>
  )
}
