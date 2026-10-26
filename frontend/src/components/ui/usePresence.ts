import { useEffect, useState } from 'react'

/** Keeps an element mounted for `exitMs` after `open` turns false so its exit animation can play. */
export function usePresence(open: boolean, exitMs = 160): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState<boolean>(open)

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(frame)
    }

    const timer = setTimeout(() => setMounted(false), exitMs)
    return () => clearTimeout(timer)
  }, [open, exitMs])

  return { mounted: open || mounted, closing: !open && mounted }
}
