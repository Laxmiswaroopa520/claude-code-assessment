import type { Category } from '../types/api'
import { fieldA11y } from './ui/fieldA11y'

interface CategorySelectProps {
  id: string
  value: string
  categories: Category[]
  onChange: (value: string) => void
  allLabel?: string
  error?: string
  disabled?: boolean
}

/** Category <select>. The caller renders the <label> (usually via <Field>). */
export function CategorySelect({ id, value, categories, onChange, allLabel, error, disabled }: CategorySelectProps) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} {...fieldA11y(id, error)}>
      <option value="">{allLabel ?? 'Select a category'}</option>
      {categories.map((category) => (
        <option key={category.id} value={String(category.id)}>
          {category.name}
        </option>
      ))}
    </select>
  )
}
