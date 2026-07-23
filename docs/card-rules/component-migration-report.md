# Отчёт компонентной миграции карточек

Дата проверки: 2026-07-23. Исходный `origin/main`: `7194e27cc07905d6b115e5f05dddb4c7d91c9395`.

Статус `verified` означает одновременно runtime usage, unit/coverage evidence, visual evidence и E2E evidence. `migrated` означает, что новый runtime-компонент используется, но продуктовый контракт ещё не утверждён. Generated-матрицы остаются производными от JSON registries.

## Карта target architecture

| UX template | Resolver | React component | Style module | Unit | Visual | E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `service_offer_card` | `resolveServiceOfferPresentation` | `ServiceOfferCard` | `ServiceOfferCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | tasks; favorites surface navigation absent | migrated |
| `employee_shift_card` | `resolveEmployeeShiftPresentation`, `resolveEmployeeShiftsForDay` | `EmployeeShiftCard` | `EmployeeShiftCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | tasks | verified |
| `my_service_card` | `resolveMyServicePresentation` | `MyServiceCard` | `MyServiceCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | my tasks | verified |
| `signing_card` | `resolveSigningPresentation` | `SigningCard` | `SigningCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | signing | migrated |
| `saved_collection_card` | `resolveFavoriteCollectionPresentation` | `FavoriteCollectionCard` | `FavoriteCollectionCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | active collection in favorites | migrated |
| `favorite_store_card` | `resolveFavoriteStorePresentation` | `FavoriteStoreCard` | `FavoriteStoreCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | favorites | verified |

## Template migration evidence

| UX ID | Legacy source | Target source | Status | Unit evidence | Visual evidence | E2E evidence | Legacy removed | Remaining gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `service_offer_card` | `src/App.jsx#TaskCard`, global `gig-task-*` | `src/entities/service-offer/` | migrated | resolver + coverage tests | 6 variant snapshots + runtime snapshots | tasks flow; Favorites lacks runtime service section | yes | `favorite_unavailable` has resolver/fixture evidence but no approved runtime Favorites entry point |
| `employee_shift_card` | `src/App.jsx#EmployeeShiftCard`, global `employee-shift-*` | `src/entities/employee-shift/`, `src/features/employee-schedule/` | verified | resolver and day-placement tests | 2 variant snapshots + runtime snapshots | tasks schedule | yes | none in approved contract |
| `my_service_card` | `src/App.jsx#MyTaskCard`, global `my-task-*` | `src/entities/my-service/` | verified | resolver + active placement rule | 5 variant snapshots + runtime snapshots | my tasks statuses | yes | provisional runtime status mapping is not promoted |
| `signing_card` | signing branch of `src/App.jsx#MyTaskCard` | `src/entities/signing/` | migrated | resolver branch test | 3 variant snapshots + runtime snapshot | signing region/card | yes | CTA, deadline, history and final state contract unresolved |
| `saved_collection_card` | `src/App.jsx#FavoriteCollectionsView`, global `favorite-collection-*` | `src/entities/favorite-collection/` | migrated | saved/excluded placement test | 2 variant snapshots + active runtime snapshot | apply/edit/delete active collection | yes | `empty_collection` has resolver/fixture evidence, but exact empty-result anatomy/actions are unresolved |
| `favorite_store_card` | `src/App.jsx#FavoriteCollectionsView`, global `favorite-store-*` | `src/entities/favorite-store/` | verified | present/absent placement test | variant + runtime snapshot | favorites store tab | yes | none in approved contract |

## Catalog UI-state migration evidence

| UX ID | Legacy source | Target source | Status | Unit/coverage | Visual | E2E | Legacy removed | Remaining gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `catalog.loading` | `src/App.jsx#ServiceLaunchScreen` / loading branch | `CatalogLoadingState` | verified | component coverage | launch snapshot | reload sequence | card-state branch yes | none |
| `service_offer.skeleton` | `src/App.jsx#TaskSkeletonCard` | `ServiceCardSkeleton` | verified | component coverage | skeleton snapshot | reload sequence | yes | none |
| `catalog.filtered_empty` | `src/App.jsx#TaskMessageCard` | `FilteredServicesState` | verified | component coverage | filtered snapshot | filtered flow | yes | none |
| `catalog.partially_hidden` | `src/App.jsx#TaskMessageCard` | `PartiallyHiddenState` | verified | component coverage | partial snapshot | expand/collapse flow | yes | none |
| `hidden_services.message` | `src/App.jsx#TaskMessageCard` | `HiddenServicesState` | verified | resolver identity test + component coverage | partial-state composition snapshot | explicit nested state + expand/collapse flow | yes | none |
| `catalog.empty_day` | `src/App.jsx#NoTasksForDayCard` | `EmptyDayState` | verified | component coverage | empty-day snapshot | empty-day flow | yes | none |
| `catalog.error` | отсутствует | planned `CatalogErrorState` | planned | registry coverage | none | none | n/a | утверждённый product/visual contract отсутствует |
| `catalog.stale` | отсутствует | planned `CatalogStaleState` | planned | registry coverage | none | none | n/a | утверждённый product/visual contract отсутствует |

## Coverage и удаление legacy

- `scripts/check-card-component-coverage.mjs` проверяет bindings, существование и exports target source, active rule/exception evidence, snapshots всех structural variants, surface E2E evidence, сохранность migration history и отсутствие legacy card functions/selectors.
- `App.jsx` больше не содержит анатомию карточек или функции `TaskCard`, `MyTaskCard`, `EmployeeShiftCard`, `TaskMessageCard`, `NoTasksForDayCard`, `TaskSkeletonCard`.
- Семантические стили card families удалены из глобального `styles.css`; каждая family использует собственный CSS Module. Общими оставлены только нейтральные brand/metro/distance atoms и app-shell layout.
- `docs/catalog-rules-matrix.md` и `docs/availability-rules.md` остаются `partially_mapped`: незакрытые product gaps не были придуманы в рамках технической миграции.
- Точные оставшиеся product approvals и критерии перехода в `verified` собраны в `docs/card-rules/product-decision-brief.md`.
