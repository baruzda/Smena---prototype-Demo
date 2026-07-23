# Матрица карточек прототипа «Смена X5»

Источник правды: Figma component `mobile card`, node `10451:106630`.

Этот документ — контракт перед любыми изменениями карточек. Сначала добавляем/обновляем строку матрицы, потом правим JSX/CSS. Цель — не смешивать варианты карточек через “почти общий” layout.

## Базовые правила

- Каждый Figma variant получает явный компонент или явный mode внутри компонента.
- Семантические CSS-классы не шарятся между variants. Нельзя группировать селекторы вроде `.gig-task-hours, .employee-shift-hours`.
- Общими могут быть только нейтральные атомы: `brand-logo`, `metro-icon`, `distance-mark`, экспортированные Figma icon assets.
- Если два variants выглядят похоже, всё равно держим их layout-правила отдельно: это дешевле, чем ловить протечки после следующего макета.

## Variants Figma → код

| Registry template / variant | Компонент | Изолированный стиль | Статус |
| --- | --- | --- | --- |
| `service_offer_card.default` | `ServiceOfferCard` | `ServiceOfferCard.module.css` | verified |
| `service_offer_card.special` | `ServiceOfferCard` | `ServiceOfferCard.module.css` | verified |
| `service_offer_card.restriction_status` | `ServiceOfferCard` | `ServiceOfferCard.module.css` | verified |
| `service_offer_card.restriction_status_plus` | `ServiceOfferCard` | `ServiceOfferCard.module.css` | verified |
| `service_offer_card.restriction_tags` | `ServiceOfferCard` | `ServiceOfferCard.module.css` | verified |
| `service_offer_card.favorite_unavailable` | `ServiceOfferCard` | `ServiceOfferCard.module.css` | verified; unavailable status + remove-only action |
| `employee_shift_card.primary_shift` | `EmployeeShiftCard` | `EmployeeShiftCard.module.css` | verified |
| `employee_shift_card.accepted_extra_shift` | `EmployeeShiftCard` | `EmployeeShiftCard.module.css` | verified |
| `my_service_card.pending` | `MyServiceCard` | `MyServiceCard.module.css` | verified |
| `my_service_card.booked` | `MyServiceCard` | `MyServiceCard.module.css` | verified |
| `my_service_card.active` | `MyServiceCard` | `MyServiceCard.module.css` | verified |
| `my_service_card.completed` | `MyServiceCard` | `MyServiceCard.module.css` | verified |
| `my_service_card.cancelled` | `MyServiceCard` | `MyServiceCard.module.css` | verified |
| `signing_card.waiting_user` | `SigningCard` | `SigningCard.module.css` | verified; единственный variant с CTA `подписать` |
| `signing_card.processing` | `SigningCard` | `SigningCard.module.css` | verified; остаётся в Signing без CTA |
| `signing_card.signed` | `SigningCard` | `SigningCard.module.css` | verified; остаётся в Signing без CTA |
| `signing_card.rejected` | `SigningCard` | `SigningCard.module.css` | verified; остаётся в Signing без CTA |
| `saved_collection_card.active_collection` | `FavoriteCollectionCard` | `FavoriteCollectionCard.module.css` | verified |
| `saved_collection_card.empty_collection` | `FavoriteCollectionCard` | `FavoriteCollectionCard.module.css` | migrated; exact empty-result anatomy unresolved |
| `favorite_store_card.default` | `FavoriteStoreCard` | `FavoriteStoreCard.module.css` | verified |

Marker `suitable_for_you` — отдельная ось presentation model и не выбирает structural variant.

## Связанные UI-состояния

| UI-state | Компонент | Стиль | Статус |
| --- | --- | --- | --- |
| `catalog.loading` | `CatalogLoadingState` | `CatalogStates.module.css` | verified |
| `service_offer.skeleton` | `ServiceCardSkeleton` | `CatalogStates.module.css` | verified |
| `catalog.filtered_empty` | `FilteredServicesState` | `CatalogStates.module.css` | verified |
| `catalog.partially_hidden` | `PartiallyHiddenState` | `CatalogStates.module.css` | verified |
| `hidden_services.message` | `HiddenServicesState` | `CatalogStates.module.css` | verified |
| `catalog.empty_day` | `EmptyDayState` | `CatalogStates.module.css` | verified |
| `catalog.error` | `CatalogErrorState` | — | planned; product contract unresolved |
| `catalog.stale` | `CatalogStaleState` | — | planned; product contract unresolved |

## Запрещённые пересечения

- CSS Module одной card family нельзя импортировать в другую card family.
- Стили `ServiceOfferCard`, `EmployeeShiftCard`, `MyServiceCard`, `SigningCard`, `FavoriteCollectionCard` и `FavoriteStoreCard` семантически независимы.
- `details-*` нельзя использовать в карточках ленты.
- Бейджи остаются внутренними элементами своей family и не превращаются в общий semantic component.
- Нельзя использовать текстовые псевдо-иконки (`☆`, `⌄`) вместо экспортированных assets, если asset уже есть.
- `HiddenServicesState` обязан получать причину скрытия: `filters`, `availability` или `mixed`. Текст причины:
  - `filters`: «ещё N услуг скрыты из-за фильтров» / «N услуг скрыты из-за фильтров»;
  - `availability`: «ещё N услуг скрыты из-за настроек доступности» / «N услуг скрыты из-за настроек доступности»;
  - `mixed`: «ещё N услуг скрыты из-за фильтров или выбранного времени» / «N услуг скрыты из-за фильтров или выбранного времени».

## Чеклист перед деплоем

1. `npm run test:unit`
2. `npm run test:visual`
3. Собрать проект и открыть локальный preview.
4. Проверить минимум эти states:
   - обычная/подходящая услуга;
   - обычная услуга без бейджа;
   - основная смена;
   - скрытая/неподходящая услуга;
   - `подходящих услуг больше нет`;
   - `в этот день нет подходящих услуг`;
   - `в этот день услуг нет`.
5. Проверить `tests/card-variants.visual.spec.mjs`: на каждый variant из registry должен быть отдельный snapshot.
6. Если правка затрагивает карточки, обновить эту матрицу и component bindings в том же коммите.
