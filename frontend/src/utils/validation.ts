// Client-side checks mirror the backend limits (VR-01…VR-09) for instant feedback only.
// The API stays authoritative: its 400 field errors are always shown too.

export type FieldErrors = Record<string, string>

export const MAX_AMOUNT = 1_000_000

function decimalPlaces(text: string): number {
  const dot = text.indexOf('.')
  return dot < 0 ? 0 : text.length - dot - 1
}

/** Validates a money input string; returns a message or undefined. */
export function validateMoney(text: string, label: string, max?: number): string | undefined {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return `${label} is required.`
  }

  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    return `${label} must be a number.`
  }

  if (value <= 0) {
    return `${label} must be greater than 0.`
  }

  if (max !== undefined && value > max) {
    return `${label} must be at most ${max.toLocaleString('en-US')}.`
  }

  if (decimalPlaces(trimmed) > 2) {
    return `${label} must have at most 2 decimal places.`
  }

  return undefined
}

export interface ExpenseFormValues {
  title: string
  amount: string
  date: string
  categoryId: string
  notes: string
}

export function validateExpense(values: ExpenseFormValues, today: string): FieldErrors {
  const errors: FieldErrors = {}
  const title = values.title.trim()
  if (title.length === 0) {
    errors.title = 'Title is required.'
  } else if (title.length > 100) {
    errors.title = 'Title must be at most 100 characters.'
  }

  const amountError = validateMoney(values.amount, 'Amount', MAX_AMOUNT)
  if (amountError) {
    errors.amount = amountError
  }

  if (values.date.length === 0) {
    errors.date = 'Date is required.'
  } else if (values.date > today) {
    errors.date = 'Date cannot be in the future.'
  }

  if (values.categoryId.length === 0) {
    errors.categoryId = 'Category is required.'
  }

  if (values.notes.trim().length > 500) {
    errors.notes = 'Notes must be at most 500 characters.'
  }

  return errors
}

export function validateCategoryName(name: string): string | undefined {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return 'Name is required.'
  }

  return trimmed.length > 50 ? 'Name must be at most 50 characters.' : undefined
}
