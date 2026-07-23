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
  presentation: suppliedPresentation,
  service,
}) {
  const presentation = suppliedPresentation ?? resolveServiceOfferPresentation(service, context);
  const isSpecial = presentation.structuralVariant === "special";
  const showRestrictionTags = presentation.structuralVariant === "restriction_tags";
  const showStatus = ["restriction_status", "restriction_status_plus"].includes(presentation.structuralVariant);
  const showSuitableMarker = presentation.markers.includes("suitable_for_you");
  const actionDisabled = presentation.disabledActions.includes("service.primary_action");

  function handleKeyDown(event) {
    if (!onOpen || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onOpen();
  }

  function handlePrimaryAction(event) {
    event.stopPropagation();
    if (!actionDisabled) onOpen?.();
  }

  return (
    <article
      aria-label={onOpen ? `Подробнее: ${service.title}` : undefined}
      className={[
        styles.card,
        styles[presentation.structuralVariant],
        onOpen ? styles.clickable : "",
      ].filter(Boolean).join(" ")}
      data-card-template={presentation.templateId}
      data-card-variant={presentation.structuralVariant}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className={styles.top}>
        <div className={styles.copy}>
          {showSuitableMarker && <span className={styles.suitableMarker}>подходит вам</span>}
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
          <p className={service.metro ? `${styles.address} ${styles.addressWithMetro}` : styles.address}>
            {service.metro && <MetroIcon className={styles.metroIcon} metro={service.metro} />}
            <span data-testid="service-offer-address">
              {service.metro && <>{service.metro.station} · </>}
              {service.address} · <DistanceMark />{service.distance}
            </span>
          </p>
        </div>
        <BrandMark brand={service.brand} className={styles.brandLogo} />
      </div>
      <div className={styles.divider} />
      <div className={styles.bottom}>
        <div className={styles.payment}>
          <p>{service.payment}</p>
          <p>{service.rate}</p>
        </div>
        <div className={styles.time}>
          <p>{service.hours}</p>
          <p>{service.breakInfo}</p>
        </div>
      </div>
      {showRestrictionTags && (
        <div className={styles.restrictions}>
          {(service.restrictionTags ?? []).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      )}
      {isSpecial && (
        <button className={styles.primaryAction} disabled={actionDisabled} onClick={handlePrimaryAction} type="button">
          принять задание
        </button>
      )}
    </article>
  );
}
