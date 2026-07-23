import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolveEmployeeShiftPresentation } from "../src/entities/employee-shift/model/resolveEmployeeShiftPresentation.js";
import { resolveCatalogStatePresentation } from "../src/entities/catalog-state/model/resolveCatalogStatePresentation.js";
import { resolveFavoriteCollectionPresentation } from "../src/entities/favorite-collection/model/resolveFavoriteCollectionPresentation.js";
import { resolveFavoriteStorePresentation } from "../src/entities/favorite-store/model/resolveFavoriteStorePresentation.js";
import { resolveMyServicePresentation } from "../src/entities/my-service/model/resolveMyServicePresentation.js";
import {
  resolveServiceOfferPresentation,
  serviceOfferResolverCoverage,
} from "../src/entities/service-offer/model/resolveServiceOfferPresentation.js";
import { resolveSigningPresentation } from "../src/entities/signing/model/resolveSigningPresentation.js";
import { resolveTaskFeed } from "../src/features/catalog-feed/model/resolveTaskFeed.js";
import { resolveEmployeeShiftsForDay } from "../src/features/employee-schedule/model/resolveEmployeeShiftsForDay.js";

const baseService = Object.freeze({
  address: "Лефортовский Вал, 1",
  brand: "pyaterochka",
  breakInfo: "7 ч без перерыва",
  distance: "500 м",
  hours: "09:00 – 16:00",
  matchesFilters: true,
  payment: "2 000,00 ₽",
  rate: "250 ₽/час",
  restrictionTags: [],
  state: "available",
  title: "сборка товара",
});

function resolve(service = {}, context = {}) {
  return resolveServiceOfferPresentation({ ...baseService, ...service }, { surface: "tasks", ...context });
}

function makeFeedContext(overrides = {}) {
  return {
    acceptedGigByDate: {},
    appliedFilters: { brands: [], minimumPayment: "", service: "" },
    availabilityByDate: { "1": "free" },
    availabilityTime: { from: "08:00", presets: ["all-day"], to: "22:00" },
    bookedTasks: [],
    days: [{ date: "1", weekday: "пн" }],
    hasAppliedSort: false,
    onlyMatching: true,
    searchRadius: 50,
    selectedAvailabilityDates: [],
    selectedAvailabilityDuration: [],
    selectedAvailabilityWeekdays: [],
    sortBy: "recommended",
    ...overrides,
  };
}

test("[SCN-CATALOG-001][RULE-PLACEMENT-001] available filtered service is placed in tasks", () => {
  const result = resolve();
  assert.equal(result.placement, "tasks");
  assert.equal(result.section, "available_offers");
  assert.ok(result.appliedRuleIds.includes("RULE-PLACEMENT-001"));
});

test("[EXC-PLACEMENT-001] accepted service leaves the catalog", () => {
  const result = resolve({ state: "booked" });
  assert.equal(result.placement, "excluded");
  assert.ok(result.appliedExceptionIds.includes("EXC-PLACEMENT-001"));
});

test("[SCN-CATALOG-002][EXC-PLACEMENT-002] filtered service cannot return through hidden services", () => {
  const result = resolve({ matchesFilters: false }, { section: "other_offers" });
  assert.equal(result.placement, "excluded");
  assert.ok(result.appliedExceptionIds.includes("EXC-PLACEMENT-002"));
});

test("[SCN-CATALOG-003][SCN-CATALOG-004][RULE-HIDDEN-001] filtered and primary-shift conflicts stay outside hidden services", () => {
  const filtered = resolve({ matchesFilters: false }, { section: "other_offers" });
  const primary = resolve({ overlapsPrimarySchedule: true }, { section: "other_offers" });
  assert.equal(filtered.placement, "excluded");
  assert.equal(primary.placement, "excluded");
  assert.ok(filtered.appliedRuleIds.includes("RULE-HIDDEN-001"));
  assert.ok(primary.appliedRuleIds.includes("RULE-HIDDEN-001"));
});

test("[RULE-MARKER-001] suitable marker is independent from structural variant", () => {
  const result = resolve({ isSuitableForYou: true });
  assert.deepEqual(result.markers, ["suitable_for_you"]);
  assert.equal(result.structuralVariant, "default");
});

test("[EXC-MARKER-001] restriction hides suitable marker", () => {
  const result = resolve({ isSuitableForYou: true, restrictionTags: ["Вне доступности"] });
  assert.deepEqual(result.markers, []);
  assert.ok(result.appliedExceptionIds.includes("EXC-MARKER-001"));
});

test("[SCN-ACTION-001][RULE-ACTION-001] availability and accepted-service overlaps disable the action", () => {
  const primary = resolve({ overlapsPrimarySchedule: true });
  const accepted = resolve({ overlapsAcceptedServices: true });
  assert.deepEqual(primary.disabledActions, ["service.primary_action"]);
  assert.deepEqual(accepted.disabledActions, ["service.primary_action"]);
});

test("[SCN-ACTION-002][RULE-ACTION-001] available service enables the primary action", () => {
  assert.deepEqual(resolve().enabledActions, ["service.primary_action"]);
});

test("[RULE-ACTION-001] feed decoration passes accepted-service overlaps into presentation", () => {
  const context = {
    acceptedGigByDate: { "1": { ...baseService, hours: "10:00 – 18:00" } },
    appliedFilters: { brands: [], minimumPayment: "", service: "" },
    availabilityByDate: { "1": "free" },
    availabilityTime: { from: "08:00", presets: ["all-day"], to: "22:00" },
    bookedTasks: [],
    days: [{ date: "1", weekday: "пн" }],
    hasAppliedSort: false,
    onlyMatching: true,
    searchRadius: 50,
    selectedAvailabilityDates: [],
    selectedAvailabilityDuration: [],
    selectedAvailabilityWeekdays: [],
    sortBy: "recommended",
  };
  const feed = resolveTaskFeed([{ ...baseService, badge: "подходит вам", id: "candidate" }], "1", context);
  const candidate = feed.hiddenTasks[0];
  const presentation = resolveServiceOfferPresentation(candidate, { surface: "tasks" });

  assert.equal(candidate.overlapsAcceptedServices, true);
  assert.ok(candidate.restrictionTags.includes("Пересекается с принятой услугой"));
  assert.equal(feed.hiddenReason, "availability");
  assert.deepEqual(presentation.disabledActions, ["service.primary_action"]);
});

test("[RULE-HIDDEN-001] primary-shift conflicts return only in the general catalog", () => {
  const personalFeed = resolveTaskFeed(
    [{ ...baseService, badge: "подходит вам", id: "candidate" }],
    "1",
    makeFeedContext({ availabilityByDate: { "1": "busy" } }),
  );
  const generalFeed = resolveTaskFeed(
    [{ ...baseService, badge: "подходит вам", id: "candidate" }],
    "1",
    makeFeedContext({ availabilityByDate: { "1": "busy" }, onlyMatching: false }),
  );

  assert.equal(personalFeed.visibleTasks.length, 0);
  assert.equal(personalFeed.hiddenTasks.length, 0);
  assert.equal(personalFeed.excludedTasks[0].overlapsPrimarySchedule, true);
  assert.equal(generalFeed.visibleTasks[0].overlapsPrimarySchedule, true);
});

test("[EXC-PLACEMENT-002] fully filtered results remain excluded with a recoverable count", () => {
  const feed = resolveTaskFeed(
    [{ ...baseService, badge: "подходит вам", id: "candidate" }],
    "1",
    makeFeedContext({ appliedFilters: { brands: [], minimumPayment: "99999", service: "" } }),
  );

  assert.equal(feed.visibleTasks.length, 0);
  assert.equal(feed.hiddenTasks.length, 0);
  assert.equal(feed.excludedTasks.length, 1);
  assert.equal(feed.excludedTasks[0].matchesFilters, false);
});

test("[EXC-PLACEMENT-001] feed excludes an already booked service", () => {
  const context = {
    acceptedGigByDate: {},
    appliedFilters: { brands: [], minimumPayment: "", service: "" },
    availabilityByDate: { "1": "free" },
    availabilityTime: { from: "08:00", presets: ["all-day"], to: "22:00" },
    bookedTasks: [{ day: { date: "1" }, id: "candidate", task: { ...baseService, id: "candidate" } }],
    days: [{ date: "1", weekday: "пн" }],
    hasAppliedSort: false,
    onlyMatching: false,
    searchRadius: 50,
    selectedAvailabilityDates: [],
    selectedAvailabilityDuration: [],
    selectedAvailabilityWeekdays: [],
    sortBy: "recommended",
  };
  const feed = resolveTaskFeed([{ ...baseService, badge: "подходит вам", id: "candidate" }], "1", context);

  assert.equal(feed.visibleTasks.length, 0);
  assert.equal(feed.excludedTasks[0].state, "booked");
});

test("structural variants are deterministic and exclusive", () => {
  const cases = [
    [resolve(), "default"],
    [resolve({ isSpecialOffer: true }), "special"],
    [resolve({ restrictionTags: ["A"] }, { useObservedRestrictionStatus: true }), "restriction_status"],
    [resolve({ restrictionTags: ["A", "B"] }, { useObservedRestrictionStatus: true }), "restriction_status_plus"],
    [resolve({ restrictionTags: ["A"] }, { revealRestrictionTags: true }), "restriction_tags"],
    [resolveServiceOfferPresentation({ ...baseService, isFavorite: true, state: "expired" }, { surface: "favorites" }), "favorite_unavailable"],
  ];
  for (const [result, expected] of cases) assert.equal(result.structuralVariant, expected);
  assert.deepEqual(cases.map(([, variant]) => variant), serviceOfferResolverCoverage.structuralVariants);
});

test("special plus restriction never resolves to two structural variants", () => {
  const result = resolve({ isSpecialOffer: true, restrictionTags: ["Вне доступности"] }, { revealRestrictionTags: true });
  assert.equal(result.structuralVariant, "restriction_tags");
  assert.ok(!result.markers.includes("specially_for_you"));
});

test("metro content uses address fallback when data is absent", () => {
  const withoutMetro = resolve({ metro: null });
  const withMetro = resolve({ metro: { station: "Ладожская" } });
  assert.ok(withoutMetro.hiddenContent.includes("service.metro"));
  assert.ok(withoutMetro.visibleContent.includes("service.address"));
  assert.ok(withMetro.visibleContent.includes("service.metro"));
});

test("[SCN-FAVORITES-001][SCN-FAVORITES-002][RULE-FAVORITES-001] favorite placement and [EXC-FAVORITES-001] unavailable section", () => {
  const available = resolveServiceOfferPresentation({ ...baseService, isFavorite: true }, { surface: "favorites" });
  const unavailable = resolveServiceOfferPresentation({ ...baseService, isFavorite: true, state: "expired" }, { surface: "favorites" });
  assert.equal(available.section, "services_available");
  assert.equal(unavailable.section, "services_unavailable");
  assert.ok(unavailable.appliedExceptionIds.includes("EXC-FAVORITES-001"));
});

test("[RULE-FAVORITES-001] accepted and completed favorites leave the Favorites surface", () => {
  for (const state of ["pending_confirmation", "signing_required", "booked", "active", "completed"]) {
    const result = resolveServiceOfferPresentation({ ...baseService, isFavorite: true, state }, { surface: "favorites" });
    assert.equal(result.placement, "excluded", state);
    assert.equal(result.section, null, state);
  }
});

test("[RULE-MYTASKS-001] accepted service placement is resolved outside JSX", () => {
  const booking = { day: { label: "2 июня", secondaryLabel: "вторник" }, status: "booked", task: baseService };
  const result = resolveMyServicePresentation(booking);
  assert.equal(result.placement, "my_tasks");
  assert.equal(result.section, "upcoming");
  assert.ok(result.appliedRuleIds.includes("RULE-MYTASKS-001"));
});

test("[SCN-SIGNING-001][SCN-SIGNING-002][SCN-SIGNING-003][SCN-SIGNING-004][SCN-SIGNING-006][SCN-SIGNING-007][RULE-SIGNING-001][RULE-SIGNING-002][RULE-SIGNING-003][RULE-SIGNING-004][RULE-SIGNING-005][EXC-SIGNING-001] signing states resolve approved placement and actions", () => {
  const expected = {
    waiting_user: { action: "signing.primary_action", label: "на подписание", order: 100, rule: "RULE-SIGNING-001", tone: "warning" },
    processing: { action: null, label: "на проверке", order: 200, rule: "RULE-SIGNING-002", tone: "warning" },
    signed: { action: null, label: "подписано", order: 300, rule: "RULE-SIGNING-003", tone: "success" },
    rejected: { action: null, label: "отклонено", order: 400, rule: "RULE-SIGNING-004", tone: "danger" },
  };

  for (const [status, contract] of Object.entries(expected)) {
    const booking = {
      day: { label: "3 июня", secondaryLabel: "среда" },
      signing: { actor: status === "waiting_user" ? "user" : "system", status },
      status: "signing",
      task: baseService,
    };
    const result = resolveSigningPresentation(booking);

    assert.equal(result.placement, "signing", status);
    assert.equal(result.section, status, status);
    assert.equal(result.structuralVariant, status, status);
    assert.equal(result.status.label, contract.label, status);
    assert.equal(result.status.tone, contract.tone, status);
    assert.equal(result.order, contract.order, status);
    assert.ok(result.appliedRuleIds.includes(contract.rule), status);
    assert.ok(result.appliedRuleIds.includes("RULE-SIGNING-005"), status);
    assert.equal(result.enabledActions[0] ?? null, contract.action, status);
    assert.equal(result.primaryAction?.label ?? null, status === "waiting_user" ? "подписать" : null, status);
    assert.deepEqual(result.appliedExceptionIds, status === "waiting_user" ? [] : ["EXC-SIGNING-001"], status);
  }

  const processing = resolveSigningPresentation({
    day: { label: "3 июня", secondaryLabel: "среда" },
    signing: { actor: "system", status: "processing" },
    status: "signing",
    task: baseService,
  });
  assert.notEqual(processing.section, "signed");
  assert.notEqual(processing.section, "rejected");

  const unknown = resolveSigningPresentation({
    day: { label: "3 июня", secondaryLabel: "среда" },
    signing: { actor: "system", status: "unknown_integration_state" },
    status: "signing",
    task: baseService,
  });
  assert.equal(unknown.structuralVariant, "processing");
  assert.equal(unknown.status.label, "статус уточняется");
  assert.deepEqual(unknown.enabledActions, []);
  assert.equal(unknown.primaryAction, null);
});

test("[RULE-SHIFT-001] employee shift placement and order are deterministic", () => {
  const result = resolveEmployeeShiftPresentation({ type: "primary" }, { label: "сегодня, 1 июня", secondaryLabel: "понедельник" });
  const extra = resolveEmployeeShiftPresentation({ type: "gig" }, { label: "сегодня, 1 июня", secondaryLabel: "понедельник" });
  assert.equal(result.structuralVariant, "primary_shift");
  assert.equal(result.section, "employee_schedule");
  assert.equal(result.order, 50);
  assert.deepEqual(extra.appliedRuleIds, []);
});

test("[SCN-SHIFT-001][SCN-SHIFT-002] shifts are scoped to the selected day outside App JSX", () => {
  const primary = resolveEmployeeShiftsForDay({
    acceptedGigByDate: {},
    availabilityByDate: { "1": "busy" },
    bookedTasks: [],
    day: { date: "1" },
  });
  const otherDay = resolveEmployeeShiftsForDay({
    acceptedGigByDate: {},
    availabilityByDate: { "1": "busy", "2": "free" },
    bookedTasks: [],
    day: { date: "2" },
  });
  assert.equal(primary[0].type, "primary");
  assert.deepEqual(otherDay, []);
});

test("[SCN-FAVORITES-003][SCN-FAVORITES-004][RULE-FAVORITES-002] saved collection placement is resolved", () => {
  const collection = {
    filters: { brands: [], minimumPayment: "", service: "" },
    location: { label: "" },
    radius: 1,
  };
  const saved = resolveFavoriteCollectionPresentation(collection, ["pyaterochka"]);
  const unsaved = resolveFavoriteCollectionPresentation({ ...collection, isSaved: false }, ["pyaterochka"]);
  assert.equal(saved.section, "collections");
  assert.equal(unsaved.placement, "excluded");
  assert.ok(saved.appliedRuleIds.includes("RULE-FAVORITES-002"));
});

test("[SCN-FAVORITES-005][SCN-FAVORITES-006][RULE-FAVORITES-003] favorite store placement is resolved", () => {
  assert.equal(resolveFavoriteStorePresentation({ isPresent: true }).section, "stores");
  assert.equal(resolveFavoriteStorePresentation().placement, "excluded");
});

test("[SCN-CATALOG-005] hidden services keeps an explicit UI-state identity inside partial results", () => {
  const result = resolveCatalogStatePresentation({
    hiddenCount: 2,
    hiddenReason: "filters",
    type: "hidden_services",
  });
  assert.equal(result.uiState, "hidden_services.message");
  assert.deepEqual(result.actions, ["subscribe", "show_all"]);
});

test("every active card rule and exception has resolver evidence", () => {
  const rules = JSON.parse(readFileSync(new URL("../docs/card-rules/rules.json", import.meta.url), "utf8")).rules;
  const exceptions = JSON.parse(readFileSync(new URL("../docs/card-rules/exceptions.json", import.meta.url), "utf8")).exceptions;
  const activeRuleIds = rules.filter((rule) => rule.status === "active").map((rule) => rule.id).sort();
  const activeExceptionIds = exceptions.filter((exception) => exception.status === "active").map((exception) => exception.id).sort();
  const evidencedRuleIds = [
    ...serviceOfferResolverCoverage.activeRules,
    "RULE-SHIFT-001",
    "RULE-FAVORITES-002",
    "RULE-FAVORITES-003",
    "RULE-SIGNING-001",
    "RULE-SIGNING-002",
    "RULE-SIGNING-003",
    "RULE-SIGNING-004",
    "RULE-SIGNING-005",
  ].sort();
  const evidencedExceptionIds = [
    ...serviceOfferResolverCoverage.activeExceptions,
    "EXC-SIGNING-001",
  ].sort();
  assert.deepEqual(evidencedRuleIds, activeRuleIds);
  assert.deepEqual(evidencedExceptionIds, activeExceptionIds);
});
