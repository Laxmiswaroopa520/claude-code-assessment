import { useState } from 'react'

interface ConfirmButtonProps {
  label: string
  confirmLabel: string
  /** Accessible name for the first button, e.g. "Delete Lunch". */
  ariaLabel?: string
  onConfirm: () => void | Promise<void>
  disabled?: boolean
}

/** Two-step inline confirmation (no window.confirm), keyboard accessible. */
export function ConfirmButton({ label, confirmLabel, ariaLabel, onConfirm, disabled = false }: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState<boolean>(false)

  if (!confirming) {
    return (
      <button type="button" aria-label={ariaLabel} onClick={() => setConfirming(true)} disabled={disabled}>
        {label}
      </button>
    )
  }

  return (
    <span className="confirm" role="group" aria-label="Confirm action">
      <button
        type="button"
        className="danger"
        onClick={() => {
          setConfirming(false)
          void onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  )
}
