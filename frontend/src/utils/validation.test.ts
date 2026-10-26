import { describe, expect, it } from 'vitest'
import { validateCategoryName, validateExpense, validateMoney } from './validation'
import type { ExpenseFormValues } from './validation'

const valid: ExpenseFormValues = { title: 'Lunch', amount: '12.50', date: '2026-10-15', categoryId: '1', notes: '' }

describe('validation', () => {
  it.each([
    ['', 'Amount is required.'],
    ['abc', 'Amount must be a number.'],
    ['0', 'Amount must be greater than 0.'],
    ['-1', 'Amount must be greater than 0.'],
    ['1000000.01', 'Amount must be at most 1,000,000.'],
    ['10.123', 'Amount must have at most 2 decimal places.'],
  ])('validateMoney(%s) → %s', (input, message) => {
    expect(validateMoney(input, 'Amount', 1_000_000)).toBe(message)
  })

  it.each(['0.01', '1000000', '12.5'])('validateMoney(%s) → valid', (input) => {
    expect(validateMoney(input, 'Amount', 1_000_000)).toBeUndefined()
  })

  it('valid expense → no errors', () => {
    expect(validateExpense(valid, '2026-10-15')).toEqual({})
  })

  it('future date, long title, missing category, long notes → field errors', () => {
    const errors = validateExpense({ title: 'a'.repeat(101), amount: '5', date: '2026-10-16', categoryId: '', notes: 'n'.repeat(501) }, '2026-10-15')

    expect(errors).toEqual({
      title: 'Title must be at most 100 characters.',
      date: 'Date cannot be in the future.',
      categoryId: 'Category is required.',
      notes: 'Notes must be at most 500 characters.',
    })
  })

  it('category name rules → required and max 50', () => {
    expect(validateCategoryName('   ')).toBe('Name is required.')
    expect(validateCategoryName('a'.repeat(51))).toBe('Name must be at most 50 characters.')
    expect(validateCategoryName('Food')).toBeUndefined()
  })
})
