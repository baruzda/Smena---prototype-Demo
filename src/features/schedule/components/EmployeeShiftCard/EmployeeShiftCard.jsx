import { Badge, Card } from '../../../../shared/ui/index.js'
import styles from './EmployeeShiftCard.module.css'

export function EmployeeShiftCard({ shiftTitle, title, address, metro, brand, distanceMark, distance, date, weekday, hours, breakInfo }) {
  return (
    <Card className={styles.card} variant="filled">
      <div className={styles.heading}>
        <div>
          <Badge className={styles.badge} tone="neutral">{shiftTitle}</Badge>
          <h3>{title}</h3>
          <p>{metro && <span className={styles.metro}>{metro}</span>}{address} · {distanceMark}{distance}</p>
        </div>
        {brand}
      </div>
      <div className={styles.divider} />
      <div className={styles.details}>
        <div className={styles.date}><p>{date}</p><p>{weekday}</p></div>
        <div className={styles.hours}><p>{hours}</p><p>{breakInfo}</p></div>
      </div>
    </Card>
  )
}
