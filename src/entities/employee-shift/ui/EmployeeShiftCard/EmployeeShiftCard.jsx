import { BrandMark } from "../../../../shared/ui/BrandMark/BrandMark.jsx";
import { DistanceMark } from "../../../../shared/ui/DistanceMark/DistanceMark.jsx";
import { MetroIcon } from "../../../../shared/ui/MetroIcon/MetroIcon.jsx";
import { resolveEmployeeShiftPresentation } from "../../model/resolveEmployeeShiftPresentation.js";
import styles from "./EmployeeShiftCard.module.css";

export function EmployeeShiftCard({ day, shift }) {
  const presentation = resolveEmployeeShiftPresentation(shift, day);

  return (
    <article className={styles.card} data-card-template={presentation.templateId} data-card-variant={presentation.structuralVariant}>
      <div className={styles.heading}>
        <div>
          <span className={styles.badge}>{presentation.marker}</span>
          <h3>{shift.title}</h3>
          <p>
            {shift.metro && (
              <span className={styles.metro}>
                <MetroIcon className={styles.metroIcon} metro={shift.metro} />
                {shift.metro.station} ·
              </span>
            )}
            {shift.address} · <DistanceMark />{shift.distance}
          </p>
        </div>
        <BrandMark brand={shift.brand} className={styles.brandLogo} />
      </div>
      <div className={styles.divider} />
      <div className={styles.details}>
        <div className={styles.date}>
          <p>{presentation.date}</p>
          <p>{presentation.secondaryDate}</p>
        </div>
        <div className={styles.hours}>
          <p>{shift.hours}</p>
          <p>{shift.breakInfo ?? "11 ч + 1 ч перерыв"}</p>
        </div>
      </div>
    </article>
  );
}
