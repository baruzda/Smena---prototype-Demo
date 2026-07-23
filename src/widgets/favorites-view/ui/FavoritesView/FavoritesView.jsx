import { useState } from "react";
import { FavoriteCollectionCard } from "../../../../entities/favorite-collection/ui/FavoriteCollectionCard/FavoriteCollectionCard.jsx";
import { FavoriteStoreCard } from "../../../../entities/favorite-store/ui/FavoriteStoreCard/FavoriteStoreCard.jsx";
import styles from "./FavoritesView.module.css";

export function FavoritesView({
  collections,
  defaultBrands,
  onApplyCollection,
  onEditCollection,
  onRemoveCollection,
}) {
  const [section, setSection] = useState("stores");

  return (
    <div className={styles.view} data-widget="favorites-view">
      <div aria-label="Разделы избранного" className={styles.tabs} role="tablist">
        <button aria-selected={section === "stores"} className={section === "stores" ? styles.activeTab : styles.tab} onClick={() => setSection("stores")} role="tab" type="button">
          магазины
        </button>
        <button aria-selected={section === "collections"} className={section === "collections" ? styles.activeTab : styles.tab} onClick={() => setSection("collections")} role="tab" type="button">
          подборки
        </button>
      </div>

      {section === "stores" ? (
        <FavoriteStoreCard onApply={() => setSection("collections")} />
      ) : collections.length === 0 ? (
        <p className={styles.empty}>Сохранённых подборок пока нет</p>
      ) : (
        <div className={styles.list}>
          {collections.map((collection) => (
            <FavoriteCollectionCard
              collection={collection}
              defaultBrands={defaultBrands}
              key={collection.id}
              onApply={() => onApplyCollection(collection)}
              onEdit={() => onEditCollection(collection)}
              onRemove={() => onRemoveCollection(collection.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
