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
  canReveal,
  hiddenCount,
  hiddenReason,
  onChangeFilters,
  onShowAll,
  type,
}) {
  const presentation = resolveCatalogStatePresentation({ canReveal, hiddenCount, hiddenReason, type });
  const canShowAll = presentation.actions.includes("show_all");
  const canChangeFilters = presentation.actions.includes("change_filters");

  return (
    <article className={styles.message} data-ui-state={presentation.uiState}>
      <h3>{presentation.title}</h3>
      {presentation.subtitle && <p>{presentation.subtitle}</p>}
      <div className={styles.actions}>
        <button className={styles.subscribe} type="button">
          <img alt="" src={assetUrl("task-hidden-star.svg")} />подписаться на новые задания
        </button>
        {canShowAll && (
          <button className={styles.showAll} onClick={onShowAll} type="button">
            показать остальные <img alt="" src={assetUrl("task-hidden-chevron-down.svg")} />
          </button>
        )}
        {canChangeFilters && (
          <button className={styles.showAll} onClick={onChangeFilters} type="button">
            изменить фильтры
          </button>
        )}
      </div>
    </article>
  );
}

export function FilteredServicesState(props) {
  return <CatalogMessage {...props} type="filtered_empty" />;
}

export function PartiallyHiddenState(props) {
  return <HiddenServicesState {...props} type="partially_hidden" />;
}

export function HiddenServicesState({ type = "hidden_services", ...props }) {
  return <CatalogMessage {...props} type={type} />;
}

export function EmptyDayState() {
  return <CatalogMessage type="empty_day" />;
}
