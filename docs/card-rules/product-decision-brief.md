# Product decision brief для готовности карточной миграции

Дата аудита: 2026-07-23. Runtime HEAD при подготовке: `8c9c3f2e7a4b71e58ea8cd088803912d157c9368`.

Цель документа — отделить технически завершённую миграцию от продуктовых решений, которых нет в доступных источниках. Этот brief не утверждает новое поведение и не меняет статусы open questions.

## Уже закрыто технически

- `hidden_services.message` имеет собственные resolver, runtime, visual и E2E evidence внутри композиции `catalog.partially_hidden`.
- Фильтры и конфликт с основной сменой нельзя обойти через раскрытие скрытых услуг.
- Карточные family, styles и presentation resolvers изолированы; legacy card anatomy удалена.

## Решение 1. Избранные услуги

Связанные вопросы: `OPEN-QUESTION-012`, `OPEN-QUESTION-013`.

Статус: утверждено пользователем 2026-07-23, зафиксировано в `DEC-013`.

Утверждённый контракт:

1. Favorites содержит вкладки `услуги`, `магазины`, `подборки`; вкладка услуг открывается первой.
2. `available` остаётся в `services_available`; `unavailable`, `cancelled`, `expired` остаются в `services_unavailable`.
3. `pending_confirmation`, `signing_required`, `booked`, `active`, `completed` покидают Favorites.
4. Недоступные записи не удаляются по времени и остаются до явного действия пользователя.
5. Доступная услуга открывает детали; `favorite_unavailable` не открывает детали и имеет единственное действие `удалить из избранного`.

Не входит в решение: production-синхронизация Favorites и серверная политика хранения.

## Решение 2. Signing

Связанные вопросы: `OPEN-QUESTION-011`, `OPEN-QUESTION-020`, `OPEN-QUESTION-021`, `OPEN-QUESTION-022`.

Статус: утверждено пользователем 2026-07-23, зафиксировано в `DEC-012`.

Утверждённый контракт:

1. Signing остаётся отдельным табом.
2. Канонические runtime-состояния: `waiting_user`, `processing`, `signed`, `rejected`.
3. Все четыре состояния остаются в табе в отдельных секциях.
4. Primary CTA `подписать` доступен только для `waiting_user` и переводит запись в `processing`.
5. Deadline необязателен и не считается критичным без отдельного продуктового решения.

Не входит в решение: реальная интеграция подписания, отдельная история документов и критичное оформление deadline.

## Решение 3. Пустая сохранённая подборка

Статус: утверждено пользователем 2026-07-23, зафиксировано в `DEC-014`.

Утверждённый контракт:

1. Сохранённая подборка с `resultCount: 0` остаётся видимой в Favorites.
2. Карточка сохраняет title, brand context и filter chips.
3. Карточка показывает `сейчас подходящих заданий нет` и `измените условия подборки — покажем новые варианты`.
4. `показать задания` скрыто; primary recovery — `изменить подборку`.
5. Edit и delete остаются доступны; несохранённая подборка остаётся исключённой.

После решения:

- `empty_collection` получает самостоятельную variant anatomy и action contract;
- добавляется runtime zero-result scenario, E2E и visual baseline;
- `saved_collection_card` переводится в `verified`.

## Решение 4. Ошибка и устаревшие данные каталога

Связанные состояния: `catalog.error`, `catalog.stale`.

Текущее доказанное состояние:

- оба состояния честно имеют status `planned`;
- runtime data source прототипа не эмитит error/stale;
- утверждённых copy, actions и coexistence rules нет.

Нужно утвердить для каждого состояния:

1. Полный или inline state.
2. Заголовок, пояснение и действия.
3. Сохраняются ли ранее загруженные карточки.
4. Поведение retry/refresh и сообщение screen reader.

После решения:

- реализовать отдельные `CatalogErrorState` и `CatalogStaleState`;
- добавить deterministic runtime trigger, accessibility assertions и visual baselines;
- обновить UI-state bindings до `verified`.

## Порядок утверждения

1. Signing — утверждено и реализовано в `DEC-012`.
2. Favorites services — утверждено и реализовано в `DEC-013`.
3. Empty collection — утверждено и реализуется в `DEC-014`.
4. Catalog error/stale — следующий блок из двух независимых UI-state contracts.

После утверждения каждого блока решения должны быть записаны отдельными DEC ID и связаны с rules, exceptions, scenarios, templates, observations и migration map до реализации UI.
