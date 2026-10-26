import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import { usePresence } from './usePresence'
import { useOverlayFocus } from './useOverlayFocus'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}

/** Destructive-action confirmation (role="alertdialog"). Cancel is focused first. */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, busy = false }: ConfirmDialogProps) {
  const { mounted, closing } = usePresence(open)
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const bodyId = useId()
  useOverlayFocus(open, ref, () => {
    if (!busy) {
      onCancel()
    }
  })

  if (!mounted) {
    return null
  }

  return createPortal(
    <div
      className={`overlay${closing ? ' is-closing' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel()
        }
      }}
    >
      <div ref={ref} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <div className="dialog-body">
          <span className="dialog-icon">
            <Icon name="trash" />
          </span>
          <h2 id={titleId}>{title}</h2>
          <div id={bodyId} className="secondary">
            {children}
          </div>
        </div>
        <div className="dialog-footer">
          <Button onClick={onCancel} disabled={busy} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
