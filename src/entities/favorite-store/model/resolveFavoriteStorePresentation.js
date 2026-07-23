export function resolveFavoriteStorePresentation(store = {}) {
  return Object.freeze({
    templateId: "favorite_store_card",
    structuralVariant: "default",
    placement: store.isPresent === false ? "excluded" : "favorites",
    section: store.isPresent === false ? null : "stores",
    order: store.isPresent === false ? null : 300,
    appliedRuleIds: Object.freeze(["RULE-FAVORITES-003"]),
  });
}
