const ACTIVE_RULE_IDS = Object.freeze([
  "RULE-PLACEMENT-001",
  "RULE-MARKER-001",
  "RULE-FAVORITES-001",
  "RULE-MYTASKS-001",
  "RULE-ACTION-001",
  "RULE-HIDDEN-001",
]);

const ACTIVE_EXCEPTION_IDS = Object.freeze([
  "EXC-PLACEMENT-001",
  "EXC-PLACEMENT-002",
  "EXC-MARKER-001",
  "EXC-FAVORITES-001",
]);

export const serviceOfferResolverCoverage = Object.freeze({
  activeRules: ACTIVE_RULE_IDS,
  activeExceptions: ACTIVE_EXCEPTION_IDS,
  structuralVariants: [
    "default",
    "special",
    "restriction_status",
    "restriction_status_plus",
    "restriction_tags",
    "favorite_unavailable",
  ],
  markers: ["suitable_for_you", "specially_for_you"],
});

function unique(values) {
  return [...new Set(values)];
}

function resolveStructuralVariant(service, context) {
  const restrictions = service.restrictionTags ?? [];
  if (context.surface === "favorites" && ["unavailable", "cancelled", "expired"].includes(service.state)) {
    return "favorite_unavailable";
  }
  if (restrictions.length > 0) {
    if (context.revealRestrictionTags) return "restriction_tags";
    if (restrictions.length === 1) return context.useObservedRestrictionStatus ? "restriction_status" : "default";
    return context.useObservedRestrictionStatus ? "restriction_status_plus" : "default";
  }
  if ((service.isSpecialOffer || service.variant === "special") && service.specialOfferExpiresAt !== null) {
    return "special";
  }
  return "default";
}

function resolvePlacement(service, context, appliedRuleIds, appliedExceptionIds) {
  const surface = context.surface ?? "tasks";
  const matchesFilters = service.matchesFilters ?? context.matchesFilters ?? true;
  const overlapsPrimarySchedule = Boolean(service.overlapsPrimarySchedule);
  const acceptedStates = ["pending_confirmation", "signing_required", "booked", "active", "completed", "cancelled"];

  if (surface === "tasks") {
    appliedRuleIds.push("RULE-PLACEMENT-001");
    if (acceptedStates.includes(service.state)) {
      appliedExceptionIds.push("EXC-PLACEMENT-001");
      return { placement: "excluded", section: null, order: null };
    }
    if (service.state !== "available") {
      return { placement: "excluded", section: null, order: null };
    }
    if (!matchesFilters) {
      appliedExceptionIds.push("EXC-PLACEMENT-002");
      return { placement: "excluded", section: null, order: null };
    }
    if (context.section === "other_offers") {
      appliedRuleIds.push("RULE-HIDDEN-001");
      if (overlapsPrimarySchedule) return { placement: "excluded", section: null, order: null };
      return { placement: "tasks", section: "other_offers", order: context.order ?? 400 };
    }
    return { placement: "tasks", section: context.section ?? "available_offers", order: context.order ?? 300 };
  }

  if (surface === "favorites") {
    appliedRuleIds.push("RULE-FAVORITES-001");
    if (!service.isFavorite) return { placement: "excluded", section: null, order: null };
    if (["unavailable", "cancelled", "expired"].includes(service.state)) {
      appliedExceptionIds.push("EXC-FAVORITES-001");
      return { placement: "favorites", section: "services_unavailable", order: 200 };
    }
    return { placement: "favorites", section: "services_available", order: 100 };
  }

  if (surface === "my_tasks") {
    appliedRuleIds.push("RULE-MYTASKS-001");
    return acceptedStates.includes(service.state)
      ? { placement: "my_tasks", section: context.section ?? "upcoming", order: context.order ?? 200 }
      : { placement: "excluded", section: null, order: null };
  }

  if (surface === "signing") {
    if (service.state !== "signing_required" || context.signing?.actor !== "user") {
      return { placement: "excluded", section: null, order: null };
    }
    return { placement: "signing", section: "waiting_user", order: 100 };
  }

  return { placement: "excluded", section: null, order: null };
}

export function resolveServiceOfferPresentation(service, context = {}) {
  const state = service.state ?? "available";
  const normalizedService = { ...service, state };
  const appliedRuleIds = [];
  const appliedExceptionIds = [];
  const structuralVariant = resolveStructuralVariant(normalizedService, context);
  const placementResult = resolvePlacement(normalizedService, context, appliedRuleIds, appliedExceptionIds);
  const restrictionTags = normalizedService.restrictionTags ?? [];
  const matchesFilters = normalizedService.matchesFilters ?? context.matchesFilters ?? true;
  const overlapsAcceptedServices = Boolean(normalizedService.overlapsAcceptedServices);
  const overlapsPrimarySchedule = Boolean(normalizedService.overlapsPrimarySchedule);
  const isAvailable = state === "available";
  const canShowSuitableMarker = isAvailable
    && matchesFilters
    && !overlapsPrimarySchedule
    && !overlapsAcceptedServices
    && restrictionTags.length === 0;
  const markers = [];
  const requestsSuitableMarker = Boolean(normalizedService.isSuitableForYou || normalizedService.badge);

  appliedRuleIds.push("RULE-MARKER-001");
  if (requestsSuitableMarker && !canShowSuitableMarker) appliedExceptionIds.push("EXC-MARKER-001");
  if (canShowSuitableMarker && requestsSuitableMarker) {
    markers.push("suitable_for_you");
  }
  if (structuralVariant === "special") markers.push("specially_for_you");

  appliedRuleIds.push("RULE-ACTION-001");
  const actionDisabled = !isAvailable || overlapsPrimarySchedule || overlapsAcceptedServices;
  const primaryAction = "service.primary_action";
  const hasMetro = Boolean(normalizedService.metro?.station);
  const visibleContent = [
    "service.title",
    "service.brand",
    "service.address",
    "service.distance",
    "service.payment",
    "service.rate",
    "service.schedule",
    ...(hasMetro ? ["service.metro"] : []),
    ...(restrictionTags.length ? ["service.restrictions"] : []),
  ];
  const hiddenContent = [
    ...(!hasMetro ? ["service.metro"] : []),
    ...(!restrictionTags.length ? ["service.restrictions"] : []),
  ];

  return Object.freeze({
    templateId: "service_offer_card",
    structuralVariant,
    markers: Object.freeze(unique(markers)),
    visibleContent: Object.freeze(unique(visibleContent)),
    hiddenContent: Object.freeze(unique(hiddenContent)),
    enabledActions: Object.freeze(actionDisabled ? [] : [primaryAction]),
    disabledActions: Object.freeze(actionDisabled ? [primaryAction] : []),
    placement: placementResult.placement,
    section: placementResult.section,
    order: placementResult.order,
    uiState: context.uiState ?? "service_offer.ready",
    appliedRuleIds: Object.freeze(unique(appliedRuleIds)),
    appliedExceptionIds: Object.freeze(unique(appliedExceptionIds)),
  });
}
