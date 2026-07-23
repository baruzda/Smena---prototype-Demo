import React from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";
import { EmployeeShiftCard } from "../entities/employee-shift/ui/EmployeeShiftCard/EmployeeShiftCard.jsx";
import { FavoriteCollectionCard } from "../entities/favorite-collection/ui/FavoriteCollectionCard/FavoriteCollectionCard.jsx";
import { FavoriteStoreCard } from "../entities/favorite-store/ui/FavoriteStoreCard/FavoriteStoreCard.jsx";
import { MyServiceCard } from "../entities/my-service/ui/MyServiceCard/MyServiceCard.jsx";
import { resolveServiceOfferPresentation } from "../entities/service-offer/model/resolveServiceOfferPresentation.js";
import { ServiceOfferCard } from "../entities/service-offer/ui/ServiceOfferCard/ServiceOfferCard.jsx";
import { SigningCard } from "../entities/signing/ui/SigningCard/SigningCard.jsx";
import styles from "./card-fixtures.module.css";

const day = { date: "1", label: "сегодня, 1 июня", secondaryLabel: "понедельник" };
const service = {
  address: "улица Лефортовский Вал, д. 67",
  brand: "pyaterochka",
  breakInfo: "7 ч без перерыва",
  distance: "814 м",
  hours: "10:00 – 17:00",
  id: "fixture-service",
  matchesFilters: true,
  payment: "2 000,00 ₽",
  rate: "250 ₽/час",
  restrictionTags: [],
  state: "available",
  title: "сборка товара",
};

const serviceVariants = [
  ["default", service, {}],
  ["special", { ...service, isSpecialOffer: true }, {}],
  ["restriction_status", { ...service, restrictionTags: ["Вне доступности"] }, { useObservedRestrictionStatus: true }],
  ["restriction_status_plus", { ...service, restrictionTags: ["Вне доступности", "Вне радиуса"] }, { useObservedRestrictionStatus: true }],
  ["restriction_tags", { ...service, restrictionTags: ["Вне доступности", "Вне радиуса"] }, { revealRestrictionTags: true }],
  ["favorite_unavailable", { ...service, isFavorite: true, state: "expired" }, { surface: "favorites" }],
];

const myServiceVariants = ["pending", "booked", "active", "completed", "cancelled"];
const signingVariants = ["waiting_user", "processing", "signed", "rejected"];

function Fixture({ children, id }) {
  return <section aria-label={id} className={styles.fixture} data-fixture={id}>{children}</section>;
}

function CardFixtures() {
  return (
    <main className={styles.gallery}>
      {serviceVariants.map(([id, variantService, context]) => (
        <Fixture id={`service_offer_card:${id}`} key={id}>
          <ServiceOfferCard
            presentation={resolveServiceOfferPresentation(variantService, { surface: "tasks", ...context })}
            service={variantService}
          />
        </Fixture>
      ))}
      <Fixture id="employee_shift_card:primary_shift">
        <EmployeeShiftCard day={day} shift={{ ...service, type: "primary" }} />
      </Fixture>
      <Fixture id="employee_shift_card:accepted_extra_shift">
        <EmployeeShiftCard day={day} shift={{ ...service, type: "gig" }} />
      </Fixture>
      {myServiceVariants.map((status) => (
        <Fixture id={`my_service_card:${status}`} key={status}>
          <MyServiceCard booking={{ day, id: `my-${status}`, status, task: service }} />
        </Fixture>
      ))}
      {signingVariants.map((status) => (
        <Fixture id={`signing_card:${status}`} key={status}>
          <SigningCard
            booking={{
              day,
              id: `signing-${status}`,
              signing: { actor: status === "waiting_user" ? "user" : "system", status },
              status: "signing",
              task: service,
            }}
          />
        </Fixture>
      ))}
      <Fixture id="saved_collection_card:active_collection">
        <FavoriteCollectionCard
          collection={{ filters: { brands: [], minimumPayment: "", service: "" }, id: "active", location: { label: "" }, radius: 1, title: "активная подборка" }}
          defaultBrands={["pyaterochka"]}
        />
      </Fixture>
      <Fixture id="saved_collection_card:empty_collection">
        <FavoriteCollectionCard
          collection={{ filters: { brands: [], minimumPayment: "", service: "" }, id: "empty", location: { label: "" }, radius: 1, resultCount: 0, title: "подборка без результатов" }}
          defaultBrands={["pyaterochka"]}
        />
      </Fixture>
      <Fixture id="saved_collection_card:excluded">
        <FavoriteCollectionCard
          collection={{ filters: { brands: [], minimumPayment: "", service: "" }, id: "excluded", isSaved: false, location: { label: "" }, radius: 1, title: "несохранённая подборка" }}
          defaultBrands={["pyaterochka"]}
        />
      </Fixture>
      <Fixture id="favorite_store_card:default"><FavoriteStoreCard store={{ isPresent: true }} /></Fixture>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<CardFixtures />);
