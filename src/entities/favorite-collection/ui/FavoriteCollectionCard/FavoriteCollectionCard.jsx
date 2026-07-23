import { assetUrl } from "../../../../shared/lib/assets.js";
import { BrandMark } from "../../../../shared/ui/BrandMark/BrandMark.jsx";
import { resolveFavoriteCollectionPresentation } from "../../model/resolveFavoriteCollectionPresentation.js";
import styles from "./FavoriteCollectionCard.module.css";

export function FavoriteCollectionCard({
  collection,
  defaultBrands,
  onApply,
  onEdit,
  onRemove,
}) {
  const presentation = resolveFavoriteCollectionPresentation(collection, defaultBrands);

  return (
    <article className={styles.card} data-card-template={presentation.templateId} data-card-variant={presentation.structuralVariant}>
      <div className={styles.header}>
        <h2>{collection.title}</h2>
        <button aria-label={`Настройки подборки ${collection.title}`} className={styles.kebab} onClick={onEdit} type="button">
          <img alt="" src={assetUrl("kebab.svg")} />
        </button>
      </div>
      <div className={styles.brandRow}>
        {presentation.brands.map((brand) => <BrandMark brand={brand} className={styles.brandLogo} key={brand} />)}
      </div>
      <div className={styles.chipRow}>
        {presentation.chips.map((chip) => <span className={styles.chip} key={chip}>{chip}</span>)}
      </div>
      <button className={styles.apply} onClick={onApply} type="button">показать задания</button>
      <button aria-label={`Удалить подборку ${collection.title}`} className={styles.delete} onClick={onRemove} type="button">
        <img alt="" src={assetUrl("trash.svg")} />
      </button>
    </article>
  );
}
