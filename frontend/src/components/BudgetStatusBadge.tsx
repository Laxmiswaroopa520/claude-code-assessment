import type { BudgetStatus } from '../types/api'
import { formatPercent } from '../utils/format'
import { Icon } from './ui/Icon'

const labels: Record<BudgetStatus, string> = {
  OnTrack: 'On track',
  Warning: 'Warning',
  Exceeded: 'Exceeded',
}

const tone: Record<BudgetStatus, 'good' | 'warning' | 'critical'> = {
  OnTrack: 'good',
  Warning: 'warning',
  Exceeded: 'critical',
}

/** Status from the API (never recalculated here), shown with an icon and a text label, not colour alone. */
export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  return (
    <span className={`badge badge-${tone[status]}`}>
      <Icon name={status === 'OnTrack' ? 'check' : 'alert'} size={13} />
      {labels[status]}
    </span>
  )
}

/** Progress bar: width capped at 100 %, the real percentage in text and aria-valuetext. */
export function BudgetProgress({ percentUsed, status, label }: { percentUsed: number; status: BudgetStatus; label: string }) {
  const width = Math.min(Math.max(percentUsed, 0), 100)
  return (
    <div>
      <div
        className={`progress is-${tone[status]}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-valuetext={`${formatPercent(percentUsed)} used, ${labels[status]}`}
      >
        <div className="progress-fill" style={{ width: `${width}%` }} />
      </div>
      <div className="meter-meta">
        <span>{formatPercent(percentUsed)} used</span>
        <BudgetStatusBadge status={status} />
      </div>
    </div>
  )
}
