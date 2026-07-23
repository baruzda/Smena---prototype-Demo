import { Card } from '../../../../shared/ui/index.js'
import styles from './TaskCardShell.module.css'

export function TaskCardShell({ ariaLabel, className, onOpen, header, brand, details, restrictions, action }) {
  return <Card aria-label={ariaLabel} className={`${styles.card} ${className ?? ''}`} interactive={Boolean(onOpen)} onClick={onOpen} padding="medium">
    <div className={styles.header}><div className={styles.copy}>{header}</div><div className={styles.brand}>{brand}</div></div>
    <div className={styles.divider} />
    <div className={styles.details}>{details}</div>
    {restrictions && <div className={styles.restrictions}>{restrictions}</div>}
    {action && <div className={styles.actions}>{action}</div>}
  </Card>
}

export const TaskCardParts = { styles }
