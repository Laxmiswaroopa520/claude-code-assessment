import type { ReactNode } from 'react'
import type { ApiError } from '../api/client'
import { Button } from './ui/Button'
import { EmptyIllustration } from './illustrations'
import type { EmptyArt } from './illustrations'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'

/** Skeleton placeholder rows with an accessible loading status. */
export function LoadingState({ label = 'Loading…', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className="skeleton-rows" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton" style={{ height: '1.1rem', width: `${92 - index * 9}%` }} aria-hidden="true" />
      ))}
    </div>
  )
}

const artFor: Partial<Record<IconName, EmptyArt>> = {
  receipt: 'receipt',
  reports: 'chart',
  categories: 'folder',
  budgets: 'target',
}

export function EmptyState({ title, message, icon = 'info', action }: { title?: string; message: string; icon?: IconName; action?: ReactNode }) {
  const art = artFor[icon]
  return (
    <div className="empty">
      {art ? (
        <EmptyIllustration kind={art} />
      ) : (
        <span className="empty-icon">
          <Icon name={icon} size={22} />
        </span>
      )}
      {title ? <h3>{title}</h3> : null}
      <p>{message}</p>
      {action}
    </div>
  )
}

/** Error alert for a failed load or action; shows the API's detail when available. */
export function ErrorMessage({ error, onRetry, title }: { error: ApiError | string; onRetry?: () => void; title?: string }) {
  const text = typeof error === 'string' ? error : (error.detail ?? error.title)
  return (
    <div className="alert alert-critical" role="alert">
      <Icon name="alert" />
      <div>
        {title ? <p className="alert-title">{title}</p> : null}
        <p>{text}</p>
        {onRetry ? (
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  )
}
