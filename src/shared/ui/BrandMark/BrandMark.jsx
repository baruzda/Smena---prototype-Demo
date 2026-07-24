import { assetUrl } from "../../lib/assets.js";
import styles from "./BrandMark.module.css";

const logos = {
  pyaterochka: { alt: "Пятёрочка", src: "logo-pyaterochka.svg" },
  perekrestok: { alt: "Перекрёсток", src: "logo-perekrestok.svg" },
  chizhik: { alt: "Чижик", src: "logo-chizhik.svg" },
  vprok: { alt: "Впрок", src: "logo-vprok.svg" },
  mnogoLososya: { alt: "Много лосося", src: "logo-mnogo-lososya.svg" },
};

export function BrandMark({ brand, className = "", size = "default" }) {
  const logo = logos[brand] ?? logos.pyaterochka;
  return <img alt={logo.alt} className={[styles.logo, size === "small" ? styles.small : "", className].filter(Boolean).join(" ")} src={assetUrl(logo.src)} />;
}
