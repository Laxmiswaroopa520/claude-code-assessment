import type { IconName } from './ui/Icon'
import { Icon } from './ui/Icon'

export type KpiTone = 'indigo' | 'sky' | 'emerald' | 'amber' | 'rose'

export function KpiCard({ label, value, note, icon, tone = 'indigo' }: { label: string; value: string; note?: string; icon: IconName; tone?: KpiTone }) {
  return (
    <div className={`card card-hover kpi kpi-${tone}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <span className="kpi-icon">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <span className="kpi-value">{value}</span>
      {note ? <span className="kpi-note">{note}</span> : null}
    </div>
  )
}

export function KpiSkeleton() {
  return (
    <div className="card kpi" aria-hidden="true">
      <span className="skeleton" style={{ height: '0.9rem', width: '45%' }} />
      <span className="skeleton" style={{ height: '1.8rem', width: '60%' }} />
      <span className="skeleton" style={{ height: '0.8rem', width: '70%' }} />
    </div>
  )
}
