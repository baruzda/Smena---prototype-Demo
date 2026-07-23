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
      disabledActions: Object.freeze(["collection.apply", "collection.edit", "collection.delete"]),
      visibleContent: Object.freeze([]),
      hiddenContent: Object.freeze(["collection.empty_status", "collection.empty_description"]),
      placement: "excluded",
      section: null,
      appliedRuleIds: Object.freeze(["RULE-FAVORITES-002", "RULE-FAVORITES-005", "RULE-FAVORITES-006"]),
      appliedExceptionIds: Object.freeze([]),
    });
  }

  const isEmpty = collection.resultCount === 0;
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
    structuralVariant: isEmpty ? "empty_collection" : "active_collection",
    brands: Object.freeze(brands.slice(0, 4)),
    chips: Object.freeze(chips),
    enabledActions: Object.freeze(isEmpty
      ? ["collection.edit", "collection.delete"]
      : ["collection.edit", "collection.apply", "collection.delete"]),
    disabledActions: Object.freeze(isEmpty ? ["collection.apply"] : []),
    visibleContent: Object.freeze([
      "collection.filters_summary",
      "collection.location",
      ...(isEmpty ? ["collection.empty_status", "collection.empty_description"] : []),
    ]),
    hiddenContent: Object.freeze(isEmpty ? [] : ["collection.empty_status", "collection.empty_description"]),
    placement: "favorites",
    section: "collections",
    appliedRuleIds: Object.freeze(["RULE-FAVORITES-002", "RULE-FAVORITES-005", "RULE-FAVORITES-006"]),
    appliedExceptionIds: Object.freeze(isEmpty ? ["EXC-FAVORITES-002"] : []),
  });
}
