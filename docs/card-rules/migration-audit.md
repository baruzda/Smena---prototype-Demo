# Migration audit

- Все шесть legacy sources сохранены в `migration-map.json`; ни один не имеет статуса `deprecated`.
- `docs/catalog-rules-matrix.md` и `docs/availability-rules.md` связаны с approved placement/marker/shift rules; незавершённый перенос явно перечислен в `unmappedContent`.
- `docs/card-style-matrix.md` имеет статус `mapped`; visual contracts связаны с templates и UI states.
- Все шесть templates имеют component binding. `favorite_store_card` сохраняет legacy binding, но не заявляет supported surface до появления placement rule.
- Все восемь UI states имеют binding; `catalog.error` и `catalog.stale` остаются `planned`/не реализованными.
- Code-derived выбор вариантов, порядок, mapping статусов Моих заданий и условие метро хранятся как observations и provisional rules, а не approved product truth.
- Production signing card, signing states интеграции и часть edge cases остаются unmapped или provisional; соответствующие вопросы перечислены в `open-questions.json`.
- Declarative scenarios не считаются исполняемыми resolver tests. E2E проверяет текущий прототип отдельно.
