import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'warning' | 'error' | 'info'

export interface ToastApi {
  notify: (tone: ToastTone, title: string, message?: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) {
    throw new Error('useToast must be used inside <ToastProvider>.')
  }

  return api
}
