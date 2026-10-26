import { toMonth } from './format'

/** Months to show in a year chart: up to the current month for this year, all 12 otherwise. */
export function monthsToShow(year: number): number {
  const now = toMonth()
  const currentYear = Number(now.slice(0, 4))
  if (year < currentYear) {
    return 12
  }

  return year === currentYear ? Number(now.slice(5, 7)) : 12
}
