import { Card } from '../../../../shared/ui/index.js'
import styles from './MyTaskCard.module.css'

export function MyTaskCard({ status, title, address, metro, brand, distanceMark, distance, payment, rate, date, hours }) {
  return (
    <Card className={styles.card} variant="outlined">
      <div className={styles.top}>
        <div className={styles.copy}>
          <p className={`${styles.status} ${styles[`status-${status.tone}`]}`}><span aria-hidden="true" />{status.label}</p>
          <h2>{title}</h2>
          <p className={metro ? `${styles.address} ${styles.addressWithMetro}` : styles.address}>
            {metro}
            <span>{address} · {distanceMark}{distance}</span>
          </p>
        </div>
        {brand}
      </div>
      <div className={styles.divider} />
      <div className={styles.bottom}>
        <div>
          <p className={styles.payment}>{payment}</p>
          <p className={styles.rate}>{rate}</p>
        </div>
        <div className={styles.date}>
          <p>{date}</p>
          <p>{hours}</p>
        </div>
      </div>
    </Card>
  )
}
