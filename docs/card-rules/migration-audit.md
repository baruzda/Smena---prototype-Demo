# Migration audit

- Все семь legacy sources сохранены в `migration-map.json`; ни один не имеет статуса `deprecated`.
- `docs/catalog-rules-matrix.md` и `docs/availability-rules.md` связаны с approved placement/marker/shift rules; незавершённый перенос явно перечислен в `unmappedContent`.
- `docs/card-style-matrix.md` имеет статус `mapped`; visual contracts связаны с templates и UI states.
- Все шесть templates имеют component binding. `favorite_store_card` явно связан с `favorites/stores`, `FavoriteCollectionsView`, namespace `favorite-store-*` и approved placement rule; выделение `FavoriteStoreCard` остаётся отдельно отмеченным migration gap.
- Все восемь UI states имеют binding; `catalog.error` и `catalog.stale` остаются `planned`/не реализованными.
- Code-derived выбор вариантов, порядок, mapping статусов Моих заданий и условие метро хранятся как observations и provisional rules, а не approved product truth.
- Production signing card, signing states интеграции и часть edge cases остаются unmapped или provisional; соответствующие вопросы перечислены в `open-questions.json`.
- Declarative scenarios не считаются исполняемыми resolver tests. E2E проверяет текущий прототип отдельно.

## Закрытие findings независимого review

- `EXC-SPECIAL-001` остаётся provisional, с двухсторонней ссылкой на `OPEN-QUESTION-008`; validator не допускает более сильный approval status исключения над provisional base rule.
- Existing favorite-store card зарегистрирована в surface, placement rule и точной migration entry, поэтому binding больше не может скрыть карточку без surface.
