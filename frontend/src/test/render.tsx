import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ToastProvider } from '../components/ui/Toast'

/** Renders a page inside the providers the app shell supplies. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(<ToastProvider>{ui}</ToastProvider>)
}
