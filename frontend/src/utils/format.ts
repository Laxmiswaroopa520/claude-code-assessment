const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatMoney(value: number): string {
  return money.format(value)
}

export function formatPercent(value: number): string {
  return `${money.format(value)}%`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Local "YYYY-MM-DD" for a date (default: now). */
export function toIsoDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local "YYYY-MM" for a date (default: now). */
export function toMonth(date: Date = new Date()): string {
  return toIsoDate(date).slice(0, 7)
}

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortMonthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/** "2026-10" → "October 2026". */
export function formatMonthLabel(month: string): string {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`))
}

/** "2026-10" → "Oct". */
export function formatShortMonth(month: string): string {
  return shortMonthFormat.format(new Date(`${month}-01T00:00:00Z`))
}

/** "2026-10-05" → "Oct 5, 2026" (the date is a calendar date, so it is formatted in UTC). */
export function formatDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`))
}

/** Compact axis label: 0, 950, 1.2K, 3.4M. */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${trimZeros(value / 1_000_000)}M`
  }

  if (Math.abs(value) >= 1_000) {
    return `${trimZeros(value / 1_000)}K`
  }

  return trimZeros(value)
}

function trimZeros(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/** Last day of a "YYYY-MM" month as "YYYY-MM-DD". */
export function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return `${month}-${String(day).padStart(2, '0')}`
}
