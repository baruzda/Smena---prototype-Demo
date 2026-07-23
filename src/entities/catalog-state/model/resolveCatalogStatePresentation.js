function getRussianPlural(count, forms) {
  const remainder = Math.abs(count) % 100;
  const lastDigit = remainder % 10;
  if (remainder > 10 && remainder < 20) return forms[2];
  if (lastDigit === 1) return forms[0];
  if (lastDigit > 1 && lastDigit < 5) return forms[1];
  return forms[2];
}

function getHiddenReasonText(hiddenReason) {
  if (hiddenReason === "filters") return "фильтров";
  if (hiddenReason === "availability") return "настроек доступности";
  return "фильтров или выбранного времени";
}

export function resolveCatalogStatePresentation({ hiddenCount = 0, hiddenReason = "mixed", type }) {
  const reason = getHiddenReasonText(hiddenReason);
  const serviceWord = getRussianPlural(hiddenCount, ["услуга", "услуги", "услуг"]);

  if (type === "filtered_empty") {
    return Object.freeze({
      uiState: "catalog.filtered_empty",
      title: "в этот день нет подходящих услуг",
      subtitle: `${hiddenCount} ${serviceWord} скрыты из-за ${reason}`,
      actions: Object.freeze(["subscribe", "show_all"]),
    });
  }

  if (type === "empty_day") {
    return Object.freeze({
      uiState: "catalog.empty_day",
      title: "в этот день услуг нет",
      subtitle: null,
      actions: Object.freeze(["subscribe"]),
    });
  }

  return Object.freeze({
    uiState: type === "hidden_services" ? "hidden_services.message" : "catalog.partially_hidden",
    title: "подходящих услуг больше нет",
    subtitle: `ещё ${hiddenCount} ${serviceWord} скрыты из-за ${reason}`,
    actions: Object.freeze(["subscribe", "show_all"]),
  });
}
