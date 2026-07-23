import { assetUrl } from "../../../../shared/lib/assets.js";
import { BrandMark } from "../../../../shared/ui/BrandMark/BrandMark.jsx";
import { resolveFavoriteStorePresentation } from "../../model/resolveFavoriteStorePresentation.js";
import styles from "./FavoriteStoreCard.module.css";

export function FavoriteStoreCard({ onApply }) {
  const chips = ["уборка урожая пшеницы", "1, 2, 3 июня", "Пн, Ср, Пт", "от 1500 ₽"];
  const presentation = resolveFavoriteStorePresentation({ isPresent: true });

  return (
    <article className={styles.card} data-card-template={presentation.templateId} data-card-variant={presentation.structuralVariant}>
      <div className={styles.details}>
        <div className={styles.header}>
          <div>
            <h2>название подборки конкретного магазина</h2>
            <div className={styles.storeLocation}>
              <BrandMark brand="pyaterochka" className={styles.brandLogo} />
              <p>
                <img alt="" aria-hidden="true" className={styles.metroIcon} src={assetUrl("collection-metro.svg")} />
                Площадь Восстания · Косой переулок 5, к. 8
              </p>
            </div>
          </div>
          <button aria-label="Настройки подборки магазина" className={styles.kebab} type="button">
            <img alt="" src={assetUrl("kebab.svg")} />
          </button>
        </div>
        <div className={styles.chipRow}>
          {chips.map((chip) => <span className={styles.chip} key={chip}>{chip}</span>)}
        </div>
      </div>
      <button className={styles.apply} onClick={onApply} type="button">показать задания</button>
    </article>
  );
}
