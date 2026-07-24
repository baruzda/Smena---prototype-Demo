export function resolveFavoriteStorePresentation(store = {}) {
  const isPresent = store.isPresent === true || Boolean(store.id);
  return Object.freeze({
    templateId: "favorite_store_card",
    structuralVariant: "default",
    placement: isPresent ? "favorites" : "excluded",
    section: isPresent ? "stores" : null,
    order: isPresent ? 300 : null,
    enabledActions: Object.freeze(isPresent ? ["store.apply", "store.delete"] : []),
    appliedRuleIds: Object.freeze(["RULE-FAVORITES-003"]),
  });
}
