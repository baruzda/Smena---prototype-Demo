export function getShortLocationLabel(label) {
  return label.split(",")[0].trim() || "выбранная точка";
}

export function resolveFavoriteCollectionPresentation(collection, defaultBrands) {
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
    structuralVariant: chips.length ? "active_collection" : "empty_collection",
    brands: Object.freeze(brands.slice(0, 4)),
    chips: Object.freeze(chips),
    enabledActions: Object.freeze(["collection.edit", "collection.apply", "collection.delete"]),
    placement: "favorites",
    section: "collections",
    appliedRuleIds: Object.freeze(["RULE-FAVORITES-002"]),
  });
}
