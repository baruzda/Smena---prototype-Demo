export const assetUrl = (name) => `${import.meta.env.BASE_URL}figma-assets/${name}`;

export function cssAssetUrl(name) {
  const href = typeof window === "undefined"
    ? assetUrl(name)
    : new URL(assetUrl(name), window.location.href).href;
  return `url("${href}")`;
}
