import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'sm'
  icon?: IconName
  /** Shows a spinner and disables the button (prevents duplicate submissions). */
  loading?: boolean
  /** Icon-only button: children become the accessible name. */
  iconOnly?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  iconOnly = false,
  type = 'button',
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    variant === 'secondary' ? '' : `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    iconOnly ? 'btn-icon' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {iconOnly ? <span className="visually-hidden">{children}</span> : children}
    </button>
  )
}
