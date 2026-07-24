import { getTaskHours, shiftsOverlap } from "../../../schedule-utils.js";

const DEFAULT_MATCHING_AVAILABILITY = Object.freeze({
  from: "08:00",
  preset: "all-day",
  presets: Object.freeze(["all-day"]),
  to: "22:00",
});

function normalizeSelection(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim() ? [value] : [];
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function getDayValue(record, day) {
  return record?.[day.id] ?? record?.[day.date];
}

function normalizeDay(day, context) {
  if (typeof day !== "string") return day;
  return context.days?.find((candidate) => candidate.id === day || candidate.date === day)
    ?? { date: day, id: day, weekday: undefined };
}

export function getDistanceInMeters(distance = "") {
  const value = Number.parseFloat(String(distance).replace(",", "."));
  return String(distance).includes("км") ? value * 1000 : value;
}

export function getPaymentValue(payment = "") {
  const normalized = String(payment)
    .replace(/\s/g, "")
    .replace(/[^\d,.]/g, "")
    .replace(",", ".");
  return Number.parseFloat(normalized) || 0;
}

export function getHourlyRateValue(rate = "") {
  return Number(String(rate).replace(/[^\d]/g, "")) || 0;
}

export function getTaskDuration(task) {
  const { end, start } = getTaskHours(task);
  return (end - start + 24) % 24;
}

export function isTaskWithinAvailability(task, availability = DEFAULT_MATCHING_AVAILABILITY) {
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
    { id: "all-day", from: "08:00", to: "22:00" },
    { id: "morning", from: "08:00", to: "12:00" },
    { id: "afternoon", from: "12:00", to: "16:00" },
    { id: "evening", from: "16:00", to: "22:00" },
    { id: "night", from: "22:00", to: "06:00" },
  ].filter((preset) => selectedPresetIds.includes(preset.id));

  if (presets.length > 0) return presets.some((preset) => isWithinWindow(preset.from, preset.to));
  return isWithinWindow(availability.from, availability.to);
}

function matchesDurationPreference(task, preference = []) {
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
  return [...tasks].sort((first, second) => {
    if (sortBy === "nearby") {
      return getDistanceInMeters(first.distance) - getDistanceInMeters(second.distance);
    }
    if (sortBy === "hourly-rate") {
      return getHourlyRateValue(second.rate) - getHourlyRateValue(first.rate);
    }
    return getPaymentValue(second.payment) - getPaymentValue(first.payment);
  });
}

export function getOrderedTasks(tasks, sortBy, hasAppliedSort) {
  if (hasAppliedSort) return getSortedTasks(tasks, sortBy);
  return [
    ...tasks.filter((task) => task.isSpecialOffer || task.variant === "special"),
    ...tasks.filter((task) => !task.isSpecialOffer && task.variant !== "special"),
  ];
}

function isDayAvailable(day, context) {
  if (getDayValue(context.availabilityByDate, day) !== "free") return false;
  const selectedDates = context.selectedAvailabilityDates ?? [];
  const selectedWeekdays = context.selectedAvailabilityWeekdays ?? [];
  if (selectedDates.length === 0 && selectedWeekdays.length === 0) return true;
  return selectedDates.includes(day.id)
    || selectedDates.includes(day.date)
    || selectedWeekdays.includes(day.weekday);
}

function matchesCatalogFilters(task, context) {
  const filters = context.appliedFilters ?? {};
  const maximumDistance = Number.isFinite(context.searchRadius) ? context.searchRadius * 1000 : Infinity;
  const minimumPayment = Number.parseInt(String(filters.minimumPayment ?? "").replace(/\D/g, ""), 10) || 0;
  const selectedServices = normalizeSelection(filters.service).map((service) => service.toLocaleLowerCase("ru-RU"));
  const selectedStores = normalizeSelection(filters.stores);
  const title = task.title.toLocaleLowerCase("ru-RU");

  return !(
    ((filters.brands ?? []).length > 0 && !filters.brands.includes(task.brand))
    || (selectedStores.length > 0 && !selectedStores.includes(task.storeId))
    || (selectedServices.length > 0 && !selectedServices.some((service) => title.includes(service)))
    || getPaymentValue(task.payment) < minimumPayment
    || getDistanceInMeters(task.distance) > maximumDistance
    || !matchesDurationPreference(task, context.selectedAvailabilityDuration)
  );
}

function getAcceptedShifts(day, context) {
  return [
    ...(getDayValue(context.acceptedGigByDate, day) ? [getDayValue(context.acceptedGigByDate, day)] : []),
    ...(context.bookedTasks ?? [])
      .filter((booking) => booking.day.id === day.id || booking.day.date === day.date)
      .map((booking) => booking.task),
  ];
}

function getMatchingAvailability(context) {
  const availability = context.availabilityTime ?? {};
  const hasExplicitAvailability = Boolean(
    availability.from || availability.to || availability.preset || availability.presets?.length,
  );
  return hasExplicitAvailability ? availability : DEFAULT_MATCHING_AVAILABILITY;
}

function decorateTask(task, day, context) {
  const isBooked = (context.bookedTasks ?? []).some((booking) => (
    booking.id === task.id || booking.task?.id === task.id
  ));
  const matchesFilters = matchesCatalogFilters(task, context);
  const overlapsPrimarySchedule = getDayValue(context.availabilityByDate, day) === "busy"
    && shiftsOverlap(task, { hours: "10:00 – 22:00" });
  const overlapsAcceptedServices = getAcceptedShifts(day, context).some((shift) => shiftsOverlap(task, shift));
  const overlapsSchedule = overlapsPrimarySchedule || overlapsAcceptedServices;
  const matchesAvailability = isDayAvailable(day, context)
    && isTaskWithinAvailability(task, getMatchingAvailability(context));

  return {
    ...task,
    badge: context.onlyMatching && matchesAvailability ? "подходит вам" : undefined,
    isSpecialOffer: task.variant === "special",
    matchesAvailability,
    matchesFilters,
    overlapsAcceptedServices,
    overlapsPrimarySchedule,
    overlapsSchedule,
    restrictionTags: context.onlyMatching && !matchesAvailability ? ["Не совпадает с доступностью"] : [],
    state: isBooked ? "booked" : "available",
  };
}

export function resolveTaskFeed(tasks, day, context) {
  const normalizedDay = normalizeDay(day, context);
  const decoratedTasks = tasks.map((task) => decorateTask(task, normalizedDay, context));
  const catalogEligibleTasks = decoratedTasks.filter((task) => (
    task.state === "available" && task.matchesFilters && !task.overlapsSchedule
  ));
  const eligibleIds = new Set(catalogEligibleTasks.map((task) => task.id));
  const excludedTasks = decoratedTasks.filter((task) => !eligibleIds.has(task.id));
  const matchingTasks = catalogEligibleTasks.filter((task) => task.matchesAvailability);
  const hiddenTasks = context.onlyMatching
    ? catalogEligibleTasks.filter((task) => !task.matchesAvailability)
    : [];
  const visibleTasks = context.onlyMatching ? matchingTasks : catalogEligibleTasks;

  return Object.freeze({
    excludedTasks: Object.freeze(excludedTasks),
    hiddenReason: "availability",
    hiddenTasks: Object.freeze(getSortedTasks(hiddenTasks, context.sortBy)),
    visibleTasks: Object.freeze(getOrderedTasks(visibleTasks, context.sortBy, context.hasAppliedSort)),
  });
}
