# Migration audit

- Все семь legacy sources сохранены в `migration-map.json`; ни один не имеет статуса `deprecated`.
- `docs/catalog-rules-matrix.md` и `docs/availability-rules.md` связаны с approved placement/marker/shift rules; незавершённый перенос явно перечислен в `unmappedContent`.
- `docs/card-style-matrix.md` имеет статус `mapped`; visual contracts связаны с templates и UI states.
- Все шесть templates имеют component binding. `service_offer_card`, `employee_shift_card`, `my_service_card`, `signing_card` и `favorite_store_card` подтверждены runtime + resolver + visual + E2E evidence; `saved_collection_card` остаётся `migrated` до утверждения `empty_collection`.
- Все восемь UI states имеют binding; `catalog.error` и `catalog.stale` остаются `planned`/не реализованными.
- Code-derived выбор вариантов, порядок, mapping статусов Моих заданий и условие метро хранятся как observations и provisional rules, а не approved product truth.
- Signing card и состояния `waiting_user`, `processing`, `signed`, `rejected` подтверждены `DEC-012` и имеют runtime, resolver, visual и E2E evidence. Реальная signing-интеграция и критичный deadline остаются вне prototype scope.
- Favorites services подтверждены `DEC-013`: вкладка услуг открывается первой, доступная услуга открывает детали, а `favorite_unavailable` остаётся до явного удаления и не имеет details/booking action. Production Favorites API и серверная политика хранения остаются вне prototype scope.
- Declarative scenarios не считаются исполняемыми resolver tests. E2E проверяет текущий прототип отдельно.

## Закрытие findings независимого review

- `EXC-SPECIAL-001` остаётся provisional, с двухсторонней ссылкой на `OPEN-QUESTION-008`; validator не допускает более сильный approval status исключения над provisional base rule.
- Existing favorite-store card зарегистрирована в surface, placement rule и точной migration entry, поэтому binding больше не может скрыть карточку без surface.
