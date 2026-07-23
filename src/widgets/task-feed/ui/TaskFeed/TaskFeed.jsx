import { EmployeeShiftCard } from "../../../../entities/employee-shift/ui/EmployeeShiftCard/EmployeeShiftCard.jsx";
import {
  EmptyDayState,
  FilteredServicesState,
  PartiallyHiddenState,
} from "../../../../entities/catalog-state/ui/CatalogStates/CatalogStates.jsx";
import { ServiceOfferCard } from "../../../../entities/service-offer/ui/ServiceOfferCard/ServiceOfferCard.jsx";
import { resolveTaskFeed } from "../../../../features/catalog-feed/model/resolveTaskFeed.js";
import { resolveEmployeeShiftsForDay } from "../../../../features/employee-schedule/model/resolveEmployeeShiftsForDay.js";
import { assetUrl } from "../../../../shared/lib/assets.js";
import styles from "./TaskFeed.module.css";

export function TaskFeed({
  dayGroups,
  employeeShiftContext,
  expandedFilteredDays,
  feedContext,
  getLocationTasks,
  onCollapseDay,
  onExpandDay,
  onOpenTask,
  registerDaySection,
}) {
  return dayGroups.map((day, dayIndex) => {
    const employeeShifts = resolveEmployeeShiftsForDay({ ...employeeShiftContext, day });
    const hasDemoEmptyDay = day.date === "14";
    const dayTasks = hasDemoEmptyDay ? [] : getLocationTasks(day, dayIndex);
    const feed = resolveTaskFeed(dayTasks, day.date, feedContext);
    const isExpanded = expandedFilteredDays.includes(day.date);
    const hiddenTasks = isExpanded ? feed.hiddenTasks : [];
    const hasHiddenTasks = feed.hiddenTasks.length > 0 && !isExpanded;

    return (
      <section className={styles.day} data-day={day.date} key={day.date} ref={(node) => registerDaySection(day.date, node)}>
        <h2 className={styles.heading}>{day.label}, <span>{day.secondaryLabel}</span></h2>
        {employeeShifts.map((shift, index) => (
          <EmployeeShiftCard day={day} key={`${day.date}-${shift.type}-${shift.hours}-${index}`} shift={shift} />
        ))}
        {feed.visibleTasks.map((service) => (
          <ServiceOfferCard
            context={{ section: "available_offers", surface: "tasks" }}
            key={service.id}
            onOpen={() => onOpenTask(service, day)}
            service={service}
          />
        ))}
        {isExpanded && feed.hiddenTasks.length > 0 && (
          <button className={styles.hideIncompatible} onClick={() => onCollapseDay(day.date)} type="button">
            скрыть неподходящие <img alt="" src={assetUrl("chevron-down.svg")} />
          </button>
        )}
        {hiddenTasks.map((service) => (
          <ServiceOfferCard
            context={{ revealRestrictionTags: true, section: "other_offers", surface: "tasks" }}
            key={service.id}
            onOpen={() => onOpenTask(service, day)}
            service={service}
          />
        ))}
        {hasHiddenTasks && (feed.visibleTasks.length === 0
          ? <FilteredServicesState hiddenCount={feed.hiddenTasks.length} hiddenReason={feed.hiddenReason} onShowAll={() => onExpandDay(day.date)} />
          : <PartiallyHiddenState hiddenCount={feed.hiddenTasks.length} hiddenReason={feed.hiddenReason} onShowAll={() => onExpandDay(day.date)} />)}
        {dayTasks.length === 0 && <EmptyDayState />}
      </section>
    );
  });
}
