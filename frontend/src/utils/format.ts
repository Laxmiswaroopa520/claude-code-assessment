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
