/** aria-invalid / aria-describedby for a control inside <Field>. */
export function fieldA11y(id: string, error: string | undefined, hint?: string): { 'aria-invalid'?: true; 'aria-describedby'?: string } {
  if (error) {
    return { 'aria-invalid': true, 'aria-describedby': `${id}-error` }
  }

  return hint ? { 'aria-describedby': `${id}-hint` } : {}
}
