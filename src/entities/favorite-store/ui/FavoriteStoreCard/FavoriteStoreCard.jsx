import { useState } from "react";
import { assetUrl } from "../../../../shared/lib/assets.js";
import { BrandMark } from "../../../../shared/ui/BrandMark/BrandMark.jsx";
import { MetroIcon } from "../../../../shared/ui/MetroIcon/MetroIcon.jsx";
import { resolveFavoriteStorePresentation } from "../../model/resolveFavoriteStorePresentation.js";
import styles from "./FavoriteStoreCard.module.css";

export function FavoriteStoreCard({ onApply, onRemove, store }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const presentation = resolveFavoriteStorePresentation(store);

  if (presentation.placement === "excluded") return null;

  return (
    <article className={styles.card} data-card-template={presentation.templateId} data-card-variant={presentation.structuralVariant}>
      <div className={styles.details}>
        <div className={styles.header}>
          <div>
            <h2>{store.title}</h2>
            <div className={styles.storeLocation}>
              <BrandMark brand={store.brand} className={styles.brandLogo} />
              <p>
                {store.metro && <MetroIcon className={styles.metroIcon} metro={store.metro} />}
                {store.metro && <>{store.metro.station} · </>}{store.address}
              </p>
            </div>
          </div>
          <button
            aria-controls={`store-actions-${store.id}`}
            aria-expanded={isMenuOpen}
            aria-label={`Настройки магазина ${store.title}`}
            className={styles.kebab}
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <img alt="" src={assetUrl("kebab.svg")} />
          </button>
          {isMenuOpen && (
            <div aria-label={`Действия магазина ${store.title}`} className={styles.menu} id={`store-actions-${store.id}`} role="group">
              <button onClick={() => { setIsMenuOpen(false); onRemove?.(); }} type="button">удалить магазин</button>
            </div>
          )}
        </div>
        <div className={styles.chipRow}>
          {(store.chips ?? []).map((chip) => <span className={styles.chip} key={chip}>{chip}</span>)}
        </div>
      </div>
      <button className={styles.apply} onClick={onApply} type="button">показать задания</button>
    </article>
  );
}
