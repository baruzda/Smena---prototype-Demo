import { createElement } from 'react'
import styles from './Card.module.css'

const cx = (...values) => values.filter(Boolean).join(' ')

export function Card({
  as = 'article',
  variant = 'outlined',
  padding = 'medium',
  interactive = false,
  selected = false,
  disabled = false,
  className,
  children,
  onClick,
  onKeyDown,
  ...props
}) {
  const handleKeyDown = (event) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || !interactive || disabled || !onClick || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onClick(event)
  }

  return createElement(as, {
    ...props,
    className: cx(styles.card, styles[`variant-${variant}`], styles[`padding-${padding}`], interactive && styles.interactive, selected && styles.selected, disabled && styles.disabled, className),
    onClick: disabled ? undefined : onClick,
    onKeyDown: handleKeyDown,
    role: interactive ? props.role ?? 'button' : props.role,
    tabIndex: interactive ? props.tabIndex ?? 0 : props.tabIndex,
    'aria-disabled': disabled || undefined,
  }, children)
}
