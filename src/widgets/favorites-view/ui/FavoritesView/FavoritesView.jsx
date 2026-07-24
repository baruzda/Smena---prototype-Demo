import { useEffect, useRef, useState } from "react";
import { FavoriteCollectionCard } from "../../../../entities/favorite-collection/ui/FavoriteCollectionCard/FavoriteCollectionCard.jsx";
import { FavoriteStoreCard } from "../../../../entities/favorite-store/ui/FavoriteStoreCard/FavoriteStoreCard.jsx";
import { resolveServiceOfferPresentation } from "../../../../entities/service-offer/model/resolveServiceOfferPresentation.js";
import { ServiceOfferCard } from "../../../../entities/service-offer/ui/ServiceOfferCard/ServiceOfferCard.jsx";
import styles from "./FavoritesView.module.css";

const FAVORITES_SECTIONS = Object.freeze([
  { id: "services", label: "услуги" },
  { id: "stores", label: "магазины" },
  { id: "collections", label: "подборки" },
]);

export function FavoritesView({
  collections,
  defaultBrands,
  favoriteStores,
  onApplyCollection,
  onApplyStore,
  onEditCollection,
  onOpenService,
  onRemoveCollection,
  onRemoveService,
  serviceRecords,
}) {
  const [section, setSection] = useState("services");
  const [stores, setStores] = useState(favoriteStores);
  const [removingServiceIds, setRemovingServiceIds] = useState([]);
  const removeTimersRef = useRef(new Map());
  const onRemoveServiceRef = useRef(onRemoveService);
  onRemoveServiceRef.current = onRemoveService;
  const services = serviceRecords
    .map((record) => ({
      ...record,
      presentation: resolveServiceOfferPresentation(record.service, { surface: "favorites" }),
    }))
    .filter((record) => record.presentation.placement === "favorites")
    .sort((left, right) => left.presentation.order - right.presentation.order);
  const availableServices = services.filter((record) => record.presentation.section === "services_available");
  const unavailableServices = services.filter((record) => record.presentation.section === "services_unavailable");

  useEffect(() => () => {
    for (const [id, timer] of removeTimersRef.current) {
      window.clearTimeout(timer);
      onRemoveServiceRef.current(id);
    }
    removeTimersRef.current.clear();
  }, []);

  function selectSection(nextSection, focus = false) {
    setSection(nextSection);
    if (focus) window.requestAnimationFrame(() => document.getElementById(`favorites-tab-${nextSection}`)?.focus());
  }

  function handleTabKeyDown(event, currentSection) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = FAVORITES_SECTIONS.findIndex(({ id }) => id === currentSection);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? FAVORITES_SECTIONS.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + FAVORITES_SECTIONS.length) % FAVORITES_SECTIONS.length;
    selectSection(FAVORITES_SECTIONS[nextIndex].id, true);
  }

  function handleRemoveService(id) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onRemoveService(id);
      return;
    }
    if (removeTimersRef.current.has(id)) return;
    setRemovingServiceIds((current) => [...current, id]);
    const timer = window.setTimeout(() => {
      removeTimersRef.current.delete(id);
      onRemoveServiceRef.current(id);
      setRemovingServiceIds((current) => current.filter((serviceId) => serviceId !== id));
    }, 180);
    removeTimersRef.current.set(id, timer);
  }

  return (
    <div className={styles.view} data-widget="favorites-view">
      <div aria-label="Разделы избранного" className={styles.tabs} role="tablist">
        {FAVORITES_SECTIONS.map(({ id, label }) => (
          <button
            aria-controls="favorites-panel"
            aria-selected={section === id}
            className={section === id ? styles.activeTab : styles.tab}
            id={`favorites-tab-${id}`}
            key={id}
            onClick={() => selectSection(id)}
            onKeyDown={(event) => handleTabKeyDown(event, id)}
            role="tab"
            tabIndex={section === id ? 0 : -1}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`favorites-tab-${section}`}
        id="favorites-panel"
        role="tabpanel"
        tabIndex={0}
      >
        {section === "services" ? services.length === 0 ? (
          <p className={styles.empty}>Сохранённых услуг пока нет</p>
        ) : (
          <div className={styles.serviceList}>
            {availableServices.length > 0 && (
              <section className={styles.serviceGroup}>
                <h2 className={styles.serviceHeading}>доступные</h2>
                {availableServices.map(({ day, presentation, service }) => (
                  <ServiceOfferCard
                    key={service.id}
                    onOpen={() => onOpenService(service, day)}
                    presentation={presentation}
                    service={service}
                  />
                ))}
              </section>
            )}
            {unavailableServices.length > 0 && (
              <section className={styles.serviceGroup}>
                <h2 className={styles.serviceHeading}>больше недоступны</h2>
                {unavailableServices.map(({ presentation, service }) => (
                  <div
                    className={[
                      styles.serviceCardShell,
                      removingServiceIds.includes(service.id) ? styles.serviceCardLeaving : "",
                    ].filter(Boolean).join(" ")}
                    key={service.id}
                  >
                    <ServiceOfferCard
                      onRemoveFavorite={handleRemoveService}
                      presentation={presentation}
                      service={service}
                    />
                  </div>
                ))}
              </section>
            )}
          </div>
        ) : section === "stores" ? stores.length === 0 ? (
          <p className={styles.empty}>Сохранённых магазинов пока нет</p>
        ) : (
          <div className={styles.list}>
            {stores.map((store) => (
              <FavoriteStoreCard
                key={store.id}
                onApply={() => onApplyStore(store)}
                onRemove={() => setStores((current) => current.filter(({ id }) => id !== store.id))}
                store={store}
              />
            ))}
          </div>
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
    </div>
  );
}
