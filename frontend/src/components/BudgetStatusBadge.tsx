import type { BudgetStatus } from '../types/api'
import { formatPercent } from '../utils/format'

const labels: Record<BudgetStatus, string> = {
  OnTrack: 'On track',
  Warning: 'Warning',
  Exceeded: 'Exceeded',
}

/** Status is always shown as text; colour is only an extra cue. */
export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{labels[status]}</span>
}

/** Progress bar capped at 100 % visually, with the real percentage as text and in aria-valuetext. */
export function BudgetProgress({ percentUsed, status, label }: { percentUsed: number; status: BudgetStatus; label: string }) {
  const width = Math.min(Math.max(percentUsed, 0), 100)
  return (
    <div className="progress-row">
      <div
        className="progress"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-valuetext={`${formatPercent(percentUsed)} used, ${labels[status]}`}
      >
        <div className={`progress-fill progress-${status.toLowerCase()}`} style={{ width: `${width}%` }} />
      </div>
      <span>
        {formatPercent(percentUsed)} used · <BudgetStatusBadge status={status} />
      </span>
    </div>
  )
}
