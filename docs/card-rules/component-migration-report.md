# Отчёт компонентной миграции карточек

Дата проверки: 2026-07-24. Исходный `origin/main`: `7194e27cc07905d6b115e5f05dddb4c7d91c9395`. Актуальная интеграционная база: `128864b5579735f9b0339746b416ffaf243ee4ca`.

Статус `verified` означает одновременно runtime usage, unit/coverage evidence, visual evidence и E2E evidence. `migrated` означает, что новый runtime-компонент используется, но продуктовый контракт ещё не утверждён. Generated-матрицы остаются производными от JSON registries.

## Карта target architecture

| UX template | Resolver | React component | Style module | Unit | Visual | E2E | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `service_offer_card` | `resolveServiceOfferPresentation` | `ServiceOfferCard` | `ServiceOfferCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | tasks + Favorites services | verified |
| `employee_shift_card` | `resolveEmployeeShiftPresentation`, `resolveEmployeeShiftsForDay` | `EmployeeShiftCard` | `EmployeeShiftCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | tasks | verified |
| `my_service_card` | `resolveMyServicePresentation` | `MyServiceCard` | `MyServiceCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | my tasks | verified |
| `signing_card` | `resolveSigningPresentation` | `SigningCard` | `SigningCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | signing | verified |
| `saved_collection_card` | `resolveFavoriteCollectionPresentation` | `FavoriteCollectionCard` | `FavoriteCollectionCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | active + empty collection in favorites | verified |
| `favorite_store_card` | `resolveFavoriteStorePresentation` | `FavoriteStoreCard` | `FavoriteStoreCard.module.css` | `service-offer-presentation.test.mjs` | оба card visual suites | favorites | verified |

## Template migration evidence

| UX ID | Legacy source | Target source | Status | Unit evidence | Visual evidence | E2E evidence | Legacy removed | Remaining gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `service_offer_card` | `src/App.jsx#TaskCard`, global `gig-task-*` | `src/entities/service-offer/` | verified | resolver + coverage tests | 6 variant snapshots + runtime Favorites snapshots | tasks + Favorites available/unavailable flows | yes | DEC-013 closes lifecycle, navigation, and remove-only behavior |
| `employee_shift_card` | `src/App.jsx#EmployeeShiftCard`, global `employee-shift-*` | `src/entities/employee-shift/`, `src/features/employee-schedule/` | verified | resolver and day-placement tests | 2 variant snapshots + runtime snapshots | tasks schedule | yes | none in approved contract |
| `my_service_card` | `src/App.jsx#MyTaskCard`, global `my-task-*` | `src/entities/my-service/` | verified | resolver + active placement rule | 5 variant snapshots + runtime snapshots | my tasks statuses | yes | provisional runtime status mapping is not promoted |
| `signing_card` | signing branch of `src/App.jsx#MyTaskCard` | `src/entities/signing/` | verified | resolver states/actions test | 4 variant snapshots + 4 runtime snapshots | signing region/card + CTA transition | yes | Реальная signing-интеграция и критичный deadline вне prototype scope |
| `saved_collection_card` | `src/App.jsx#FavoriteCollectionsView`, global `favorite-collection-*` | `src/entities/favorite-collection/` | verified | saved/excluded + empty/active action tests | 2 variant snapshots + active/empty runtime snapshots | apply/edit/delete active; edit/delete empty | yes | DEC-014 closes empty anatomy and actions; production result count remains outside prototype scope |
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
| `catalog.error` | отсутствует | `CatalogErrorState` | verified | resolver + component coverage | isolated runtime snapshot | `?catalogState=error`, retry recovery | n/a | DEC-015; production retry policy вне scope |
| `catalog.stale` | отсутствует | `CatalogStaleState` | verified | resolver + component coverage | inline runtime snapshot with cards | `?catalogState=stale`, refresh recovery | n/a | DEC-015; production cache TTL вне scope |

## Coverage и удаление legacy

- `scripts/check-card-component-coverage.mjs` проверяет bindings, существование и exports target source, active rule/exception evidence, snapshots всех structural variants, surface E2E evidence, сохранность migration history и отсутствие legacy card functions/selectors.
- `App.jsx` больше не содержит анатомию карточек или функции `TaskCard`, `MyTaskCard`, `EmployeeShiftCard`, `TaskMessageCard`, `NoTasksForDayCard`, `TaskSkeletonCard`.
- Семантические стили card families удалены из глобального `styles.css`; каждая family использует собственный CSS Module. Общими оставлены только нейтральные brand/metro/distance atoms и app-shell layout.
- `docs/catalog-rules-matrix.md` и `docs/availability-rules.md` остаются `partially_mapped` только из-за provisional restriction/availability edge cases; error/stale закрыты DEC-015.
- Точные оставшиеся product approvals и критерии перехода в `verified` собраны в `docs/card-rules/product-decision-brief.md`.

## Итоговые метрики

| Метрика | Исходный main `7194e27` | Актуальный main `128864b` | Миграционная ветка |
| --- | ---: | ---: | ---: |
| `src/App.jsx`, LOC | 2728 | 3228 | 2742 |
| `src/styles.css`, LOC | 3927 | 3960 | 3610 |
| JS bundle | 271.30 kB / 81.40 kB gzip | 295.77 kB / 89.53 kB gzip | 314.96 kB / 94.02 kB gzip |
| CSS bundle | 55.73 kB / 9.24 kB gzip | 64.44 kB / 10.92 kB gzip | 74.63 kB / 12.07 kB gzip |

Рост относительно исходного main включает восемь более поздних UX-коммитов актуального main. Изолированная стоимость миграции относительно интеграционной базы составляет +19.19 kB JS (+4.49 kB gzip) и +10.19 kB CSS (+1.15 kB gzip); при этом App orchestration сокращён на 486 строк, а глобальный CSS — на 350 строк относительно актуального main.
