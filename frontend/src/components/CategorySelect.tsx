import type { Category } from '../types/api'

interface CategorySelectProps {
  id: string
  label: string
  value: string
  categories: Category[]
  onChange: (value: string) => void
  allLabel?: string
  describedBy?: string
  invalid?: boolean
}

export function CategorySelect({ id, label, value, categories, onChange, allLabel, describedBy, invalid }: CategorySelectProps) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
      >
        <option value="">{allLabel ?? 'Select a category'}</option>
        {categories.map((category) => (
          <option key={category.id} value={String(category.id)}>
            {category.name}
          </option>
        ))}
      </select>
    </>
  )
}
