import { assetUrl } from "../../../../shared/lib/assets.js";
import { resolveCatalogStatePresentation } from "../../model/resolveCatalogStatePresentation.js";
import styles from "./CatalogStates.module.css";

export function ServiceCardSkeleton() {
  return (
    <article aria-label="Загрузка заданий" className={styles.skeleton} data-ui-state="service_offer.skeleton">
      <div className={styles.skeletonTop}><span /><i /></div>
      <span className={styles.skeletonTitle} />
      <span className={styles.skeletonAddress} />
      <div className={styles.skeletonDivider} />
      <div className={styles.skeletonBottom}><span /><span /></div>
    </article>
  );
}

export function CatalogLoadingState() {
  return (
    <section aria-label="Загрузка заданий" className={styles.loading} data-ui-state="catalog.loading" role="status">
      <ServiceCardSkeleton />
      <ServiceCardSkeleton />
    </section>
  );
}

function CatalogMessage({
  canChangeFilters,
  canReveal,
  hiddenCount,
  hiddenReason,
  onChangeFilters,
  onRefresh,
  onRetry,
  onSubscribe,
  onShowAll,
  type,
}) {
  const presentation = resolveCatalogStatePresentation({
    canChangeFilters,
    canReveal,
    hiddenCount,
    hiddenReason,
    type,
  });
  const canShowAll = presentation.actions.includes("show_all");
  const canRenderChangeFilters = presentation.actions.includes("change_filters");
  const canRetry = presentation.actions.includes("retry");
  const canRefresh = presentation.actions.includes("refresh");

  return (
    <article
      aria-live={type === "error" ? "assertive" : undefined}
      className={[styles.message, type === "stale" ? styles.stale : "", type === "error" ? styles.error : ""].filter(Boolean).join(" ")}
      data-ui-state={presentation.uiState}
      role={type === "error" ? "alert" : type === "stale" ? "status" : undefined}
    >
      <h3>{presentation.title}</h3>
      {presentation.subtitle && <p>{presentation.subtitle}</p>}
      <div className={styles.actions}>
        {presentation.actions.includes("subscribe") && <button className={styles.subscribe} onClick={onSubscribe} type="button">
          <img alt="" src={assetUrl("task-hidden-star.svg")} />подписаться на новые задания
        </button>}
        {canShowAll && (
          <button className={styles.showAll} onClick={onShowAll} type="button">
            показать остальные <img alt="" src={assetUrl("task-hidden-chevron-down.svg")} />
          </button>
        )}
        {canRenderChangeFilters && (
          <button className={styles.showAll} onClick={onChangeFilters} type="button">
            изменить фильтры
          </button>
        )}
        {canRetry && <button className={styles.primary} onClick={onRetry} type="button">повторить</button>}
        {canRefresh && <button className={styles.primary} onClick={onRefresh} type="button">обновить</button>}
      </div>
    </article>
  );
}

export function FilteredServicesState(props) {
  return <CatalogMessage {...props} type="filtered_empty" />;
}

export function PartiallyHiddenState(props) {
  return (
    <div data-ui-state="catalog.partially_hidden">
      <HiddenServicesState {...props} />
    </div>
  );
}

export function HiddenServicesState({ type = "hidden_services", ...props }) {
  return <CatalogMessage {...props} type={type} />;
}

export function EmptyDayState(props) {
  return <CatalogMessage {...props} type="empty_day" />;
}

export function CatalogErrorState({ onRetry }) {
  return <CatalogMessage onRetry={onRetry} type="error" />;
}

export function CatalogStaleState({ onRefresh }) {
  return <CatalogMessage onRefresh={onRefresh} type="stale" />;
}
