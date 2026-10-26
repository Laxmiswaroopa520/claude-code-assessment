import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Category, ExpenseQuery, SortBy, SortDir } from '../types/api'
import { CategorySelect } from './CategorySelect'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { Icon } from './ui/Icon'

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

function activeCount(values: FilterValues): number {
  const keys: (keyof FilterValues)[] = ['categoryId', 'from', 'to', 'minAmount', 'maxAmount']
  return keys.filter((key) => values[key] !== '').length + (values.sortBy !== 'date' || values.sortDir !== 'desc' ? 1 : 0)
}

/** Search box plus a collapsible filter panel. Builds the backend query (q, categoryId, from, to, minAmount, maxAmount, sortBy, sortDir). */
export function ExpenseFilters({ categories, onApply }: { categories: Category[]; onApply: (query: ExpenseQuery) => void }) {
  const [values, setValues] = useState<FilterValues>(empty)
  const [open, setOpen] = useState<boolean>(false)
  const count = activeCount(values)

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
    <form onSubmit={apply} aria-label="Filter expenses">
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <label htmlFor="filter-q" className="visually-hidden">
            Search
          </label>
          <input id="filter-q" type="search" value={values.q} onChange={(event) => update('q', event.target.value)} placeholder="Search title or notes" />
        </div>
        <Button icon="filter" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="expense-filter-panel">
          Filters{count > 0 ? ` (${count})` : ''}
        </Button>
        <Button type="submit" variant="primary">
          Apply filters
        </Button>
        <Button variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
      <div id="expense-filter-panel" className="filter-panel" hidden={!open}>
        <Field id="filter-category" label="Category">
          <CategorySelect id="filter-category" value={values.categoryId} categories={categories} onChange={(value) => update('categoryId', value)} allLabel="All categories" />
        </Field>
        <Field id="filter-from" label="From">
          <input id="filter-from" type="date" value={values.from} onChange={(event) => update('from', event.target.value)} />
        </Field>
        <Field id="filter-to" label="To">
          <input id="filter-to" type="date" value={values.to} onChange={(event) => update('to', event.target.value)} />
        </Field>
        <Field id="filter-min" label="Min amount">
          <input id="filter-min" inputMode="decimal" value={values.minAmount} onChange={(event) => update('minAmount', event.target.value)} />
        </Field>
        <Field id="filter-max" label="Max amount">
          <input id="filter-max" inputMode="decimal" value={values.maxAmount} onChange={(event) => update('maxAmount', event.target.value)} />
        </Field>
        <Field id="filter-sort-by" label="Sort by">
          <select id="filter-sort-by" value={values.sortBy} onChange={(event) => update('sortBy', event.target.value as SortBy)}>
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="title">Title</option>
          </select>
        </Field>
        <Field id="filter-sort-dir" label="Direction">
          <select id="filter-sort-dir" value={values.sortDir} onChange={(event) => update('sortDir', event.target.value as SortDir)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </Field>
      </div>
    </form>
  )
}
