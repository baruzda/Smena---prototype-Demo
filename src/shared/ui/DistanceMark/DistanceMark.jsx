import { assetUrl } from "../../lib/assets.js";
import styles from "./DistanceMark.module.css";

export function DistanceMark({ className = "" }) {
  return <img alt="" className={[styles.mark, className].filter(Boolean).join(" ")} src={assetUrl("map-pin.svg")} />;
}
