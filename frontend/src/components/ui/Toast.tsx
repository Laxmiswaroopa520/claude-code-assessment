import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { ToastContext } from './toastContext'
import type { ToastApi, ToastTone } from './toastContext'

interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  message?: string
}

const icons: Record<ToastTone, 'check' | 'alert' | 'info'> = { success: 'check', warning: 'alert', error: 'alert', info: 'info' }

/** Toasts live in one polite live region; warnings and errors stay a little longer. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef<number>(1)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const notify = useCallback(
    (tone: ToastTone, title: string, message?: string) => {
      const id = nextId.current++
      setItems((current) => [...current.slice(-3), { id, tone, title, message }])
      timers.current.set(id, setTimeout(() => dismiss(id), tone === 'success' || tone === 'info' ? 4500 : 8000))
    },
    [dismiss],
  )

  useEffect(() => {
    const active = timers.current
    return () => active.forEach((timer) => clearTimeout(timer))
  }, [])

  const api = useMemo<ToastApi>(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ol className="toasts" aria-live="polite" aria-label="Notifications">
        {items.map((item) => (
          <li key={item.id} className={`toast toast-${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}>
            <Icon name={icons[item.tone]} />
            <div className="toast-text">
              <span className="toast-title">{item.title}</span>
              {item.message ? <span className="toast-message">{item.message}</span> : null}
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => dismiss(item.id)}>
              <Icon name="close" size={14} />
              <span className="visually-hidden">Dismiss notification</span>
            </button>
          </li>
        ))}
      </ol>
    </ToastContext.Provider>
  )
}
