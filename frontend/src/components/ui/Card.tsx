import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  hover?: boolean
  className?: string
  /** Renders as a labelled region for screen readers. */
  labelledBy?: string
}

export function Card({ title, description, actions, children, hover = false, className, labelledBy }: CardProps) {
  const headingId = labelledBy ?? (title ? `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined)
  return (
    <section className={['card', hover ? 'card-hover' : '', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={title ? headingId : undefined}>
      {title || actions ? (
        <div className="card-header">
          <div>
            {title ? <h2 id={headingId}>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}
