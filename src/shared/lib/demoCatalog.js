export function seededValue(seed) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967296;
}

export function formatPayment(value) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)},00 ₽`;
}

export function getShortLocationLabel(label) {
  return label.split(",")[0].trim() || "выбранная точка";
}
