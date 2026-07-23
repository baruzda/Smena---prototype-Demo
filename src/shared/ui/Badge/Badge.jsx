import { createElement } from 'react'
import styles from './Badge.module.css'

const cx = (...values) => values.filter(Boolean).join(' ')

export function Badge({
  tone = 'neutral',
  size = 'medium',
  variant = 'solid',
  leadingIcon = null,
  trailingIcon = null,
  className,
  children,
  ...props
}) {
  return createElement(
    'span',
    {
      ...props,
      className: cx(styles.badge, styles[`tone-${tone}`], styles[`size-${size}`], styles[`variant-${variant}`], className),
    },
    leadingIcon && createElement('span', { className: styles.icon, 'aria-hidden': true }, leadingIcon),
    children,
    trailingIcon && createElement('span', { className: styles.icon, 'aria-hidden': true }, trailingIcon),
  )
}
