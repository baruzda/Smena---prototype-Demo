export function getShortLocationLabel(label) {
  return label.split(",")[0].trim() || "выбранная точка";
}

export function resolveFavoriteCollectionPresentation(collection, defaultBrands) {
  if (collection.isSaved === false) {
    return Object.freeze({
      templateId: "saved_collection_card",
      structuralVariant: "empty_collection",
      brands: Object.freeze([]),
      chips: Object.freeze([]),
      enabledActions: Object.freeze([]),
      placement: "excluded",
      section: null,
      appliedRuleIds: Object.freeze(["RULE-FAVORITES-002"]),
    });
  }

  const brands = collection.filters.brands.length ? collection.filters.brands : defaultBrands;
  const chips = [
    collection.filters.service || "уборка урожая пшеницы",
    "1, 2, 3 июня",
    "Пн, Ср, Пт",
    collection.filters.minimumPayment ? `от ${collection.filters.minimumPayment} ₽` : "от 1500 ₽",
    collection.radius ? `до ${collection.radius} км` : "до 50 км",
    collection.location.label ? `... ${getShortLocationLabel(collection.location.label)}` : null,
  ].filter(Boolean);

  return Object.freeze({
    templateId: "saved_collection_card",
    structuralVariant: collection.resultCount === 0 ? "empty_collection" : "active_collection",
    brands: Object.freeze(brands.slice(0, 4)),
    chips: Object.freeze(chips),
    enabledActions: Object.freeze(["collection.edit", "collection.apply", "collection.delete"]),
    placement: "favorites",
    section: "collections",
    appliedRuleIds: Object.freeze(["RULE-FAVORITES-002"]),
  });
}
