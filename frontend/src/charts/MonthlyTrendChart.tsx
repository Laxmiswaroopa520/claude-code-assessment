import { useState } from 'react'
import type { MonthlyTotal } from '../types/api'
import { formatCompact, formatMoney, formatShortMonth } from '../utils/format'

interface MonthlyTrendChartProps {
  year: number
  /** Totals returned by GET /api/summaries/monthly (months without expenses are absent, i.e. zero). */
  totals: MonthlyTotal[]
  /** Number of months to show (12 for past years, up to the current month for this year). */
  months: number
  /** Highlighted month ("YYYY-MM"). */
  selectedMonth?: string
}

const width = 640
const height = 230
const margin = { top: 18, right: 8, bottom: 26, left: 44 }

function niceMax(value: number): number {
  if (value <= 0) {
    return 100
  }

  const exponent = Math.pow(10, Math.floor(Math.log10(value)))
  const fraction = value / exponent
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * exponent
}

/** Column chart of monthly totals: one series, hover/focus tooltip, and a table view. */
export function MonthlyTrendChart({ year, totals, months, selectedMonth }: MonthlyTrendChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const [showTable, setShowTable] = useState<boolean>(false)

  const buckets = Array.from({ length: months }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    const found = totals.find((item) => item.month === month)
    return { month, total: found?.total ?? 0, count: found?.count ?? 0 }
  })

  const max = niceMax(Math.max(...buckets.map((bucket) => bucket.total), 0))
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const band = innerWidth / Math.max(months, 1)
  const barWidth = Math.min(24, band * 0.58)
  const y = (value: number): number => margin.top + innerHeight - (value / max) * innerHeight
  const activeBucket = active === null ? null : buckets[active]

  return (
    <div className="chart">
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTable((value) => !value)} aria-pressed={showTable}>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Monthly totals for {year}</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="amount">Total</th>
                <th scope="col" className="amount">Expenses</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.month}>
                  <td>{bucket.month}</td>
                  <td className="amount">{formatMoney(bucket.total)}</td>
                  <td className="amount">{bucket.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Monthly spending in ${year}`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line className="axis-line" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} />
                <text x={margin.left - 8} y={y(tick) + 4} textAnchor="end">
                  {formatCompact(tick)}
                </text>
              </g>
            ))}
            {buckets.map((bucket, index) => {
              const x = margin.left + band * index + (band - barWidth) / 2
              const top = y(bucket.total)
              const barHeight = margin.top + innerHeight - top
              const radius = Math.min(4, barHeight)
              const path =
                barHeight <= 0
                  ? ''
                  : `M${x},${top + barHeight} V${top + radius} Q${x},${top} ${x + radius},${top} H${x + barWidth - radius} Q${x + barWidth},${top} ${x + barWidth},${top + radius} V${top + barHeight} Z`
              const dim = active !== null && active !== index
              return (
                <g key={bucket.month}>
                  {path ? <path className={`bar${dim ? ' is-dim' : ''}`} d={path} /> : null}
                  <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontWeight={bucket.month === selectedMonth ? 700 : 400}>
                    {formatShortMonth(bucket.month)}
                  </text>
                  <rect
                    className="hit"
                    x={margin.left + band * index}
                    y={margin.top}
                    width={band}
                    height={innerHeight}
                    tabIndex={0}
                    role="img"
                    aria-label={`${formatShortMonth(bucket.month)} ${year}: ${formatMoney(bucket.total)} across ${bucket.count} expenses`}
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                  />
                </g>
              )
            })}
          </svg>
          {activeBucket && active !== null ? (
            <div
              className="tooltip"
              style={{
                left: `${((margin.left + band * active + band / 2) / width) * 100}%`,
                top: `${(y(activeBucket.total) / height) * 100}%`,
              }}
            >
              <strong>
                {formatShortMonth(activeBucket.month)} {year}
              </strong>
              {formatMoney(activeBucket.total)} <span>· {activeBucket.count} {activeBucket.count === 1 ? 'expense' : 'expenses'}</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
