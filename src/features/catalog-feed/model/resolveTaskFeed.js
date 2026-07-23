import { getTaskHours, shiftsOverlap } from "../../../schedule-utils.js";

export function getDistanceInMeters(distance) {
  const value = Number.parseFloat(distance.replace(",", "."));
  return distance.includes("км") ? value * 1000 : value;
}

export function getPaymentValue(payment) {
  const normalized = payment
    .replace(/\s/g, "")
    .replace(/[^\d,.]/g, "")
    .replace(",", ".");
  return Number.parseFloat(normalized) || 0;
}

export function getTaskDuration(task) {
  const { end, start } = getTaskHours(task);
  return (end - start + 24) % 24;
}

export function isTaskWithinAvailability(task, availability) {
  const { end, start } = getTaskHours(task);
  const duration = getTaskDuration(task);
  const isWithinWindow = (from, to) => {
    const availableFrom = Number.parseInt(from, 10);
    const availableTo = Number.parseInt(to, 10);
    if (![start, end, availableFrom, availableTo].every(Number.isFinite)) return true;

    const isInside = (hour) => (availableFrom < availableTo
      ? hour >= availableFrom && hour <= availableTo
      : hour >= availableFrom || hour <= availableTo);

    return Array.from({ length: duration + 1 }, (_, index) => isInside((start + index) % 24)).every(Boolean);
  };
  const selectedPresetIds = Array.isArray(availability.presets)
    ? availability.presets
    : availability.preset ? [availability.preset] : [];
  const presets = [
    { id: "all-day", from: "8:00", to: "22:00" },
    { id: "morning", from: "8:00", to: "12:00" },
    { id: "afternoon", from: "12:00", to: "16:00" },
    { id: "evening", from: "16:00", to: "22:00" },
    { id: "night", from: "22:00", to: "6:00" },
  ].filter((preset) => selectedPresetIds.includes(preset.id));

  if (presets.length > 0) return presets.some((preset) => isWithinWindow(preset.from, preset.to));
  return isWithinWindow(availability.from, availability.to);
}

function matchesDurationPreference(task, preference) {
  const duration = getTaskDuration(task);
  if (!preference.length) return true;
  return preference.some((option) => (
    (option === "short" && duration >= 4 && duration <= 6)
    || (option === "regular" && duration >= 8 && duration <= 9)
    || (option === "long" && duration >= 10)
  ));
}

export function getSortedTasks(tasks, sortBy) {
  if (sortBy === "recommended") {
    return [...tasks].sort((first, second) => (second.recommendation ?? 0) - (first.recommendation ?? 0));
  }
  return [...tasks].sort((first, second) => (
    sortBy === "nearby"
      ? getDistanceInMeters(first.distance) - getDistanceInMeters(second.distance)
      : getPaymentValue(second.payment) - getPaymentValue(first.payment)
  ));
}

export function getOrderedTasks(tasks, sortBy, hasAppliedSort) {
  if (hasAppliedSort) return getSortedTasks(tasks, sortBy);
  return [
    ...tasks.filter((task) => task.isSpecialOffer || task.variant === "special"),
    ...tasks.filter((task) => !task.isSpecialOffer && task.variant !== "special"),
  ];
}

function getHiddenReason(hiddenTasks) {
  const kinds = new Set();
  hiddenTasks.forEach((task) => {
    task.restrictionTags.forEach((reason) => {
      if (
        reason === "Вне доступности"
        || reason === "Пересекается со сменой"
        || reason === "Пересекается с принятой услугой"
      ) kinds.add("availability");
      else kinds.add("filters");
    });
  });
  if (kinds.size === 1) return [...kinds][0];
  return "mixed";
}

function isDayAvailable(date, context) {
  if (context.availabilityByDate[date] !== "free") return false;
  const hasManualAvailability = context.selectedAvailabilityDates.length > 0
    || context.selectedAvailabilityWeekdays.length > 0;
  if (!hasManualAvailability) return true;
  const weekday = context.days.find((day) => day.date === date)?.weekday;
  return context.selectedAvailabilityDates.includes(date)
    || context.selectedAvailabilityWeekdays.includes(weekday);
}

function decorateTask(task, date, context) {
  const maximumDistance = Number.isFinite(context.searchRadius) ? context.searchRadius * 1000 : Infinity;
  const minimumPayment = Number.parseInt(context.appliedFilters.minimumPayment.replace(/\D/g, ""), 10) || 0;
  const selectedService = context.appliedFilters.service.trim().toLocaleLowerCase("ru-RU");
  const isSuggested = Boolean(task.badge || task.variant === "special");
  const hasAvailabilityMismatch = !matchesDurationPreference(task, context.selectedAvailabilityDuration);
  const hasFilterMismatch = (context.appliedFilters.brands.length > 0 && !context.appliedFilters.brands.includes(task.brand))
    || (selectedService && !task.title.toLocaleLowerCase("ru-RU").includes(selectedService))
    || getPaymentValue(task.payment) < minimumPayment;
  const hasRadiusMismatch = Number.isFinite(maximumDistance) && getDistanceInMeters(task.distance) > maximumDistance;
  const overlapsPrimarySchedule = context.availabilityByDate[date] === "busy";
  const isBookedService = (context.bookedTasks ?? []).some((booking) => (
    booking.id === task.id || booking.task?.id === task.id
  ));
  const acceptedServices = [
    ...(context.acceptedGigByDate?.[date] ? [context.acceptedGigByDate[date]] : []),
    ...(context.bookedTasks ?? [])
      .filter((booking) => booking.day.date === date)
      .map((booking) => booking.task),
  ];
  const overlapsAcceptedServices = acceptedServices.some((acceptedService) => shiftsOverlap(task, acceptedService));
  const reasons = [];

  if (!isDayAvailable(date, context)) reasons.push("Вне доступности");
  if (!isTaskWithinAvailability(task, context.availabilityTime)) reasons.push("Пересекается со сменой");
  if (hasAvailabilityMismatch) reasons.push("Вне доступности");
  if (hasRadiusMismatch) reasons.push("Вне радиуса");
  if (hasFilterMismatch || (!isSuggested && reasons.length === 0)) reasons.push("Не совпадает с фильтрами");
  if (overlapsAcceptedServices) reasons.push("Пересекается с принятой услугой");
  reasons.push(...(task.mismatchHints ?? []));

  return {
    ...task,
    state: isBookedService ? "booked" : "available",
    isSpecialOffer: task.variant === "special",
    matchesFilters: !hasFilterMismatch && !hasRadiusMismatch,
    overlapsAcceptedServices,
    overlapsPrimarySchedule,
    restrictionTags: [...new Set(reasons)],
  };
}

export function resolveTaskFeed(tasks, date, context) {
  const decoratedTasks = tasks.map((task) => decorateTask(task, date, context));
  const catalogEligibleTasks = decoratedTasks.filter((task) => (
    task.state === "available"
    && task.matchesFilters
    && (!context.onlyMatching || !task.overlapsPrimarySchedule)
  ));
  const catalogEligibleIds = new Set(catalogEligibleTasks.map((task) => task.id));
  const excludedTasks = decoratedTasks.filter((task) => !catalogEligibleIds.has(task.id));
  const suitableTasks = catalogEligibleTasks.filter((task) => task.restrictionTags.length === 0);
  const suggestedTasks = suitableTasks.filter((task) => task.badge || task.isSpecialOffer);
  const restrictedTasks = catalogEligibleTasks.filter((task) => task.restrictionTags.length > 0);
  const hiddenTasks = getSortedTasks(restrictedTasks, context.sortBy);
  const hiddenReason = getHiddenReason(hiddenTasks);

  if (context.onlyMatching) {
    return Object.freeze({
      excludedTasks: Object.freeze(excludedTasks),
      hiddenReason,
      hiddenTasks: Object.freeze(hiddenTasks),
      visibleTasks: Object.freeze(getOrderedTasks(suggestedTasks, context.sortBy, context.hasAppliedSort)),
    });
  }

  return Object.freeze({
    excludedTasks: Object.freeze(excludedTasks),
    hiddenReason: "mixed",
    hiddenTasks: Object.freeze([]),
    visibleTasks: Object.freeze([
      ...getOrderedTasks(suitableTasks, context.sortBy, context.hasAppliedSort),
      ...hiddenTasks,
    ]),
  });
}
