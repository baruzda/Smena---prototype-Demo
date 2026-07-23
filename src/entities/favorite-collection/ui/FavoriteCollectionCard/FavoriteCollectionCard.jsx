import { useState } from "react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const presentation = resolveFavoriteCollectionPresentation(collection, defaultBrands);
  const canApply = presentation.enabledActions.includes("collection.apply");
  const canDelete = presentation.enabledActions.includes("collection.delete");
  const canEdit = presentation.enabledActions.includes("collection.edit");
  const isEmpty = presentation.structuralVariant === "empty_collection";

  if (presentation.placement === "excluded") return null;
  if (isEmpty) {
    return (
      <article className={styles.emptyCard} data-card-template={presentation.templateId} data-card-variant={presentation.structuralVariant}>
        <div className={styles.emptyHeader}>
          <h2>{collection.title}</h2>
          {canDelete && <button
            aria-controls={`collection-actions-${collection.id}`}
            aria-expanded={isMenuOpen}
            aria-label={`Настройки подборки ${collection.title}`}
            className={styles.emptyKebab}
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <img alt="" src={assetUrl("kebab.svg")} />
          </button>}
          {isMenuOpen && (
            <div
              aria-label={`Действия подборки ${collection.title}`}
              className={styles.emptyMenu}
              id={`collection-actions-${collection.id}`}
              role="group"
            >
              {canDelete && <button onClick={() => { setIsMenuOpen(false); onRemove?.(); }} type="button">
                удалить подборку
              </button>}
            </div>
          )}
        </div>
        <div className={styles.emptyBrandRow}>
          {presentation.brands.map((brand) => <BrandMark brand={brand} className={styles.brandLogo} key={brand} />)}
        </div>
        <div className={styles.emptyChipRow}>
          {presentation.chips.map((chip) => <span className={styles.emptyChip} key={chip}>{chip}</span>)}
        </div>
        <div className={styles.emptyState} role="status">
          <strong>сейчас подходящих заданий нет</strong>
          <p>измените условия подборки — покажем новые варианты</p>
        </div>
        {canEdit && <button className={styles.emptyEditAction} onClick={onEdit} type="button">изменить подборку</button>}
      </article>
    );
  }

  return (
    <article className={styles.card} data-card-template={presentation.templateId} data-card-variant={presentation.structuralVariant}>
      <div className={styles.header}>
        <h2>{collection.title}</h2>
        {(canEdit || canDelete) && <button
          aria-controls={`collection-actions-${collection.id}`}
          aria-expanded={isMenuOpen}
          aria-label={`Настройки подборки ${collection.title}`}
          className={styles.kebab}
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          <img alt="" src={assetUrl("kebab.svg")} />
        </button>}
        {isMenuOpen && (
          <div
            aria-label={`Действия подборки ${collection.title}`}
            className={styles.menu}
            id={`collection-actions-${collection.id}`}
            role="group"
          >
            {canEdit && <button onClick={() => { setIsMenuOpen(false); onEdit?.(); }} type="button">
              изменить подборку
            </button>}
            {canDelete && <button onClick={() => { setIsMenuOpen(false); onRemove?.(); }} type="button">
              удалить подборку
            </button>}
          </div>
        )}
      </div>
      <div className={styles.brandRow}>
        {presentation.brands.map((brand) => <BrandMark brand={brand} className={styles.brandLogo} key={brand} />)}
      </div>
      <div className={styles.chipRow}>
        {presentation.chips.map((chip) => <span className={styles.chip} key={chip}>{chip}</span>)}
      </div>
      {canApply && <button className={styles.apply} onClick={onApply} type="button">показать задания</button>}
    </article>
  );
}
