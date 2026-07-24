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
  onChangeFilters,
  onCollapseDay,
  onExpandDay,
  onOpenTask,
  onSubscribe,
  registerDaySection,
}) {
  return dayGroups.map((day, dayIndex) => {
    const employeeShifts = resolveEmployeeShiftsForDay({ ...employeeShiftContext, day });
    const hasDemoEmptyDay = day.date === "5" || day.date === "14";
    const dayTasks = hasDemoEmptyDay ? [] : getLocationTasks(day, dayIndex);
    const feed = resolveTaskFeed(dayTasks, day, feedContext);
    const isExpanded = expandedFilteredDays.includes(day.id);
    const hiddenTasks = isExpanded ? feed.hiddenTasks : [];
    const hasHiddenTasks = feed.hiddenTasks.length > 0 && !isExpanded;
    const filteredOutCount = feed.excludedTasks.filter((service) => (
      service.state === "available" && (!service.matchesFilters || service.overlapsSchedule)
    )).length;
    const hasOnlyExcludedTasks = dayTasks.length > 0
      && feed.visibleTasks.length === 0
      && feed.hiddenTasks.length === 0
      && filteredOutCount > 0;
    const hasNoFeedContent = employeeShifts.length === 0
      && feed.visibleTasks.length === 0
      && feed.hiddenTasks.length === 0
      && !hasOnlyExcludedTasks;

    return (
      <section className={styles.day} data-day={day.date} data-day-key={day.id} key={day.id} ref={(node) => registerDaySection(day.id, node)}>
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
          <button className={styles.hideIncompatible} onClick={() => onCollapseDay(day.id)} type="button">
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
          ? <FilteredServicesState hiddenCount={feed.hiddenTasks.length} hiddenReason={feed.hiddenReason} onShowAll={() => onExpandDay(day.id)} onSubscribe={() => onSubscribe(day)} />
          : <PartiallyHiddenState hiddenCount={feed.hiddenTasks.length} hiddenReason={feed.hiddenReason} onShowAll={() => onExpandDay(day.id)} onSubscribe={() => onSubscribe(day)} />)}
        {hasOnlyExcludedTasks && (
          <FilteredServicesState
            canChangeFilters={filteredOutCount > 0}
            canReveal={false}
            hiddenCount={filteredOutCount}
            hiddenReason="filters"
            onChangeFilters={onChangeFilters}
            onSubscribe={() => onSubscribe(day)}
          />
        )}
        {hasNoFeedContent && <EmptyDayState onSubscribe={() => onSubscribe(day)} />}
        {dayIndex === dayGroups.length - 1 && <p className={styles.end} role="status">Больше заданий нет</p>}
      </section>
    );
  });
}
