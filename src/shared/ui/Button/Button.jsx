import { createElement } from 'react'
import styles from './Button.module.css'

const cx = (...values) => values.filter(Boolean).join(' ')

export function Button({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  leadingIcon = null,
  trailingIcon = null,
  type = 'button',
  className,
  children,
  ...props
}) {
  const isDisabled = disabled || loading

  return createElement(
    'button',
    {
      ...props,
      type,
      disabled: isDisabled,
      'aria-busy': loading || undefined,
      className: cx(styles.button, styles[`variant-${variant}`], styles[`size-${size}`], fullWidth && styles.fullWidth, loading && styles.loading, className),
    },
    leadingIcon && createElement('span', { className: styles.icon, 'aria-hidden': true }, leadingIcon),
    createElement('span', { className: styles.label }, children),
    trailingIcon && createElement('span', { className: styles.icon, 'aria-hidden': true }, trailingIcon),
    loading && createElement('span', { className: styles.spinner, role: 'status', 'aria-label': 'Загрузка' }),
  )
}
