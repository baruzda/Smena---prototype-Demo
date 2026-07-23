import { cssAssetUrl } from "../../lib/assets.js";
import styles from "./MetroIcon.module.css";

const metroIconAssets = {
  msk: "metro-msk.svg",
  spb: "metro-spb.svg",
  nino: "metro-nino.svg",
};

export function MetroIcon({ className = "", metro }) {
  if (!metro) return null;
  const iconAsset = metroIconAssets[metro.city] ?? metroIconAssets.msk;

  return (
    <span
      aria-label={metro.label}
      className={[styles.icon, className].filter(Boolean).join(" ")}
      style={{ "--metro-color": metro.color, "--metro-icon": cssAssetUrl(iconAsset) }}
    />
  );
}
