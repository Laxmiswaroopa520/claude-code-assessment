import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const focusable = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal focus handling: focuses the first field (or the element marked data-autofocus), traps Tab inside,
 * closes on Escape, and returns focus to the element that opened the overlay.
 */
export function useOverlayFocus(open: boolean, containerRef: RefObject<HTMLElement | null>, onClose: () => void): void {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const container = containerRef.current
    const preferred = container?.querySelector<HTMLElement>('[data-autofocus]')
    const first = preferred ?? container?.querySelector<HTMLElement>(focusable)
    first?.focus()

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }

      if (event.key !== 'Tab' || !container) {
        return
      }

      const items = Array.from(container.querySelectorAll<HTMLElement>(focusable))
      if (items.length === 0) {
        return
      }

      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [open, containerRef])
}
