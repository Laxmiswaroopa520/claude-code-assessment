import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Category, ExpenseQuery, SortBy, SortDir } from '../types/api'
import { CategorySelect } from './CategorySelect'

interface FilterValues {
  q: string
  categoryId: string
  from: string
  to: string
  minAmount: string
  maxAmount: string
  sortBy: SortBy
  sortDir: SortDir
}

const empty: FilterValues = { q: '', categoryId: '', from: '', to: '', minAmount: '', maxAmount: '', sortBy: 'date', sortDir: 'desc' }

function toNumber(text: string): number | undefined {
  return text.trim().length === 0 ? undefined : Number(text)
}

/** Builds the API query from the filter form. Applied on submit, not on every keystroke. */
export function ExpenseFilters({ categories, onApply }: { categories: Category[]; onApply: (query: ExpenseQuery) => void }) {
  const [values, setValues] = useState<FilterValues>(empty)

  const update = <K extends keyof FilterValues>(field: K, value: FilterValues[K]): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const apply = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    onApply({
      q: values.q.trim() || undefined,
      categoryId: toNumber(values.categoryId),
      from: values.from || undefined,
      to: values.to || undefined,
      minAmount: toNumber(values.minAmount),
      maxAmount: toNumber(values.maxAmount),
      sortBy: values.sortBy,
      sortDir: values.sortDir,
      page: 1,
    })
  }

  const reset = (): void => {
    setValues(empty)
    onApply({ page: 1 })
  }

  return (
    <form className="card filters" onSubmit={apply} aria-label="Filter expenses">
      <div className="field">
        <label htmlFor="filter-q">Search</label>
        <input id="filter-q" type="search" value={values.q} onChange={(event) => update('q', event.target.value)} placeholder="Title or notes" />
      </div>
      <div className="field">
        <CategorySelect id="filter-category" label="Category" value={values.categoryId} categories={categories} onChange={(value) => update('categoryId', value)} allLabel="All categories" />
      </div>
      <div className="field">
        <label htmlFor="filter-from">From</label>
        <input id="filter-from" type="date" value={values.from} onChange={(event) => update('from', event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="filter-to">To</label>
        <input id="filter-to" type="date" value={values.to} onChange={(event) => update('to', event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="filter-min">Min amount</label>
        <input id="filter-min" inputMode="decimal" value={values.minAmount} onChange={(event) => update('minAmount', event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="filter-max">Max amount</label>
        <input id="filter-max" inputMode="decimal" value={values.maxAmount} onChange={(event) => update('maxAmount', event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="filter-sort-by">Sort by</label>
        <select id="filter-sort-by" value={values.sortBy} onChange={(event) => update('sortBy', event.target.value as SortBy)}>
          <option value="date">Date</option>
          <option value="amount">Amount</option>
          <option value="title">Title</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-sort-dir">Direction</label>
        <select id="filter-sort-dir" value={values.sortDir} onChange={(event) => update('sortDir', event.target.value as SortDir)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
      <div className="actions">
        <button type="submit">Apply filters</button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </form>
  )
}
