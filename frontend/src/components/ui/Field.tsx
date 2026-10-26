import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

/** Label + control + hint + error. The control should use `fieldA11y(id, error)` for aria wiring. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error ? (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="field-error">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : null}
    </div>
  )
}
