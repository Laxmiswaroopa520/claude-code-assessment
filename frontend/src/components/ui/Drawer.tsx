import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { FormEvent, ReactNode } from 'react'
import { Button } from './Button'
import { usePresence } from './usePresence'
import { useOverlayFocus } from './useOverlayFocus'

interface DrawerFormProps {
  open: boolean
  title: string
  description?: string
  submitLabel: string
  saving: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
  children: ReactNode
}

/**
 * Side sheet holding a form (bottom sheet on small screens). It closes only through Cancel, Escape, the close
 * button or the backdrop; a successful save is closed by the caller. While saving it cannot be dismissed.
 */
export function DrawerForm({ open, title, description, submitLabel, saving, onSubmit, onClose, children }: DrawerFormProps) {
  const { mounted, closing } = usePresence(open, 180)
  const ref = useRef<HTMLFormElement>(null)
  const titleId = useId()
  const close = (): void => {
    if (!saving) {
      onClose()
    }
  }
  useOverlayFocus(open, ref, close)

  if (!mounted) {
    return null
  }

  return createPortal(
    <div
      className={`overlay${closing ? ' is-closing' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close()
        }
      }}
    >
      <form ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={onSubmit} noValidate>
        <div className="drawer-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <Button variant="ghost" icon="close" iconOnly onClick={close} disabled={saving}>
            Close
          </Button>
        </div>
        <div className="drawer-body">{children}</div>
        <div className="drawer-footer">
          <Button onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
