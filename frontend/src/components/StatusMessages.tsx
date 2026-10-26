import type { ApiError } from '../api/client'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="state state-loading" role="status" aria-live="polite">
      {label}
    </p>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <p className="state state-empty">{message}</p>
}

export function ErrorMessage({ error, onRetry }: { error: ApiError | string; onRetry?: () => void }) {
  const text = typeof error === 'string' ? error : (error.detail ?? error.title)
  return (
    <div className="state state-error" role="alert">
      <p>{text}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function SuccessMessage({ messages }: { messages: string[] }) {
  if (messages.length === 0) {
    return null
  }

  return (
    <div className="state state-warning" role="status" aria-live="polite">
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  )
}

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) {
    return null
  }

  return (
    <span id={id} className="field-error">
      {message}
    </span>
  )
}
