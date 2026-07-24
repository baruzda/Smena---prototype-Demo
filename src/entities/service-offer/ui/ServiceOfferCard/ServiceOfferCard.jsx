import { useEffect, useState } from "react";
import { BrandMark } from "../../../../shared/ui/BrandMark/BrandMark.jsx";
import { DistanceMark } from "../../../../shared/ui/DistanceMark/DistanceMark.jsx";
import { MetroIcon } from "../../../../shared/ui/MetroIcon/MetroIcon.jsx";
import { resolveServiceOfferPresentation } from "../../model/resolveServiceOfferPresentation.js";
import styles from "./ServiceOfferCard.module.css";

function formatCountdown(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

function OfferCountdown({ initialSeconds = 19936 }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const interval = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span aria-label={`До окончания предложения ${formatCountdown(secondsLeft)}`} className={styles.specialTimer}>
      {formatCountdown(secondsLeft)}
    </span>
  );
}

export function ServiceOfferCard({
  context = {},
  onOpen,
  onRemoveFavorite,
  presentation: suppliedPresentation,
  service,
}) {
  const presentation = suppliedPresentation ?? resolveServiceOfferPresentation(service, context);
  const isSpecial = presentation.structuralVariant === "special";
  const showRestrictionTags = presentation.structuralVariant === "restriction_tags";
  const showStatus = ["restriction_status", "restriction_status_plus"].includes(presentation.structuralVariant);
  const showSuitableMarker = presentation.markers.includes("suitable_for_you");
  const isFavoriteUnavailable = presentation.structuralVariant === "favorite_unavailable";
  const actionDisabled = presentation.disabledActions.includes("service.primary_action");
  const cardClass = isFavoriteUnavailable ? styles.favoriteUnavailableCard : styles.card;
  const topClass = isFavoriteUnavailable ? styles.favoriteUnavailableTop : styles.top;
  const copyClass = isFavoriteUnavailable ? styles.favoriteUnavailableCopy : styles.copy;
  const addressClass = isFavoriteUnavailable
    ? [
      styles.favoriteUnavailableAddress,
      service.metro ? styles.favoriteUnavailableAddressWithMetro : "",
    ]
    : [styles.address, service.metro ? styles.addressWithMetro : ""];
  const dividerClass = isFavoriteUnavailable ? styles.favoriteUnavailableDivider : styles.divider;
  const bottomClass = isFavoriteUnavailable ? styles.favoriteUnavailableBottom : styles.bottom;
  const paymentClass = isFavoriteUnavailable ? styles.favoriteUnavailablePayment : styles.payment;
  const timeClass = isFavoriteUnavailable ? styles.favoriteUnavailableTime : styles.time;

  function handlePrimaryAction(event) {
    event.stopPropagation();
    if (!actionDisabled) onOpen?.();
  }

  return (
    <article
      className={[
        cardClass,
        styles[presentation.structuralVariant],
        onOpen ? styles.clickable : "",
      ].filter(Boolean).join(" ")}
      data-card-id={service.id}
      data-card-template={presentation.templateId}
      data-card-variant={presentation.structuralVariant}
    >
      {onOpen && (
        <button
          aria-label={`Подробнее: ${service.title}`}
          className={styles.openButton}
          onClick={onOpen}
          type="button"
        />
      )}
      <div className={topClass}>
        <div className={copyClass}>
          {showRestrictionTags && (
            <div className={styles.restrictions}>
              {(service.restrictionTags ?? []).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}
          {showSuitableMarker && <span className={styles.suitableMarker}>подходит вам</span>}
          {isFavoriteUnavailable && <span className={styles.favoriteUnavailableStatus}>больше недоступно</span>}
          {showStatus && (
            <span className={styles.restrictionStatus}>
              <i aria-hidden="true" />
              {presentation.structuralVariant === "restriction_status_plus" ? "есть ограничения" : "не подходит"}
            </span>
          )}
          {isSpecial && (
            <span className={styles.specialMarkers}>
              <span className={styles.specialMarker}>специально для вас</span>
              <OfferCountdown />
            </span>
          )}
          <h2>{service.title}</h2>
          <p className={addressClass.filter(Boolean).join(" ")}>
            {service.metro && <MetroIcon className={styles.metroIcon} metro={service.metro} />}
            <span data-testid="service-offer-address">
              {service.metro && <>{service.metro.station} · </>}
              {service.address} · <DistanceMark />{service.distance}
            </span>
          </p>
        </div>
        <BrandMark brand={service.brand} className={styles.brandLogo} />
      </div>
      <div className={dividerClass} />
      <div className={bottomClass}>
        <div className={paymentClass}>
          <p>{service.payment}</p>
          <p>{service.rate}</p>
        </div>
        <div className={timeClass}>
          <p>{service.hours}</p>
          <p>{service.breakInfo}</p>
        </div>
      </div>
      {isSpecial && (
        <button className={styles.primaryAction} disabled={actionDisabled} onClick={handlePrimaryAction} type="button">
          принять задание
        </button>
      )}
      {isFavoriteUnavailable && (
        <button
          className={styles.favoriteRemoveAction}
          onClick={(event) => {
            event.stopPropagation();
            onRemoveFavorite?.(service.id);
          }}
          type="button"
        >
          удалить из избранного
        </button>
      )}
    </article>
  );
}
