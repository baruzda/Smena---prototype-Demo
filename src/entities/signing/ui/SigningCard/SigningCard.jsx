import { BrandMark } from "../../../../shared/ui/BrandMark/BrandMark.jsx";
import { DistanceMark } from "../../../../shared/ui/DistanceMark/DistanceMark.jsx";
import { MetroIcon } from "../../../../shared/ui/MetroIcon/MetroIcon.jsx";
import { resolveSigningPresentation } from "../../model/resolveSigningPresentation.js";
import styles from "./SigningCard.module.css";

export function SigningCard({ booking, onPrimaryAction }) {
  const { task } = booking;
  const presentation = resolveSigningPresentation(booking);
  const canSign = presentation.enabledActions.includes("signing.primary_action");

  return (
    <article className={styles.card} data-card-template={presentation.templateId} data-card-variant={presentation.structuralVariant}>
      <div className={styles.top}>
        <div className={styles.copy}>
          <p className={`${styles.status} ${styles[presentation.status.tone]}`}>
            <span aria-hidden="true" />{presentation.status.label}
          </p>
          <h2>{task.title}</h2>
          <p className={task.metro ? `${styles.address} ${styles.addressWithMetro}` : styles.address}>
            {task.metro && <MetroIcon className={styles.metroIcon} metro={task.metro} />}
            <span>
              {task.metro && <>{task.metro.station} · </>}
              {task.address} · <DistanceMark />{task.distance}
            </span>
          </p>
        </div>
        <BrandMark brand={task.brand} className={styles.brandLogo} />
      </div>
      <div className={styles.divider} />
      <div className={styles.bottom}>
        <div>
          <p className={styles.payment}>{task.payment}</p>
          <p className={styles.rate}>{task.rate}</p>
        </div>
        <div className={styles.date}>
          <p>{presentation.date}</p>
          <p>{task.hours}</p>
        </div>
      </div>
      {presentation.document && <p className={styles.document}>{presentation.document}</p>}
      {presentation.deadline && <p className={styles.deadline}>{presentation.deadline}</p>}
      {presentation.document && canSign && (
        <button className={styles.primaryAction} onClick={onPrimaryAction} type="button">подписать</button>
      )}
    </article>
  );
}
