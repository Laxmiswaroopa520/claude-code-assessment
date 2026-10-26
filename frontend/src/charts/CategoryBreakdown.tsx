import type { CategorySummaryRow } from '../types/api'
import { formatMoney, formatPercent } from '../utils/format'

/** Horizontal bars of category totals for a month, using the API's percentOfTotal. Every bar is labelled. */
export function CategoryBreakdown({ rows, limit }: { rows: CategorySummaryRow[]; limit?: number }) {
  const spent = rows.filter((row) => row.total > 0)
  const shown = limit ? spent.slice(0, limit) : spent
  return (
    <ul className="hbars" aria-label="Spending by category" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {shown.map((row) => (
        <li key={row.categoryId} className="hbar-row">
          <div className="hbar-head">
            <span>{row.categoryName}</span>
            <span>
              <strong>{formatMoney(row.total)}</strong> <span className="muted">· {formatPercent(row.percentOfTotal)}</span>
            </span>
          </div>
          <div className="hbar-track" aria-hidden="true">
            <div className="hbar-fill" style={{ width: `${Math.min(row.percentOfTotal, 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
