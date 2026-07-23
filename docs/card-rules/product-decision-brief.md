# Product decision brief для готовности карточной миграции

Дата аудита: 2026-07-23. Runtime HEAD при подготовке: `8c9c3f2e7a4b71e58ea8cd088803912d157c9368`.

Цель документа — отделить технически завершённую миграцию от продуктовых решений, которых нет в доступных источниках. Этот brief не утверждает новое поведение и не меняет статусы open questions.

## Уже закрыто технически

- `hidden_services.message` имеет собственные resolver, runtime, visual и E2E evidence внутри композиции `catalog.partially_hidden`.
- Фильтры и конфликт с основной сменой нельзя обойти через раскрытие скрытых услуг.
- Карточные family, styles и presentation resolvers изолированы; legacy card anatomy удалена.

## Решение 1. Избранные услуги

Связанные вопросы: `OPEN-QUESTION-012`, `OPEN-QUESTION-013`.

Текущее доказанное состояние:

- Favorites runtime содержит только вкладки `магазины` и `подборки`;
- `service_offer_card.favorite_unavailable` существует в resolver и visual fixture;
- утверждённого runtime-entry для списка избранных услуг нет.

Нужно утвердить:

1. Есть ли отдельная секция или вкладка услуг в Favorites.
2. Какие состояния остаются в ней: только `available`, также `unavailable`/`expired`, либо иной набор.
3. Покидают ли Favorites принятые, активные, завершённые и отменённые услуги.
4. Какое действие доступно для `favorite_unavailable`.

После решения:

- обновить `RULE-FAVORITES-001` и `EXC-FAVORITES-001`;
- добавить runtime route/section либо официально deprecated-вариант;
- добавить E2E available/unavailable placement и visual baseline;
- перевести `service_offer_card` в `verified`, если все его runtime variants покрыты.

## Решение 2. Signing

Связанные вопросы: `OPEN-QUESTION-011`, `OPEN-QUESTION-020`, `OPEN-QUESTION-021`, `OPEN-QUESTION-022`.

Текущее доказанное состояние:

- runtime использует отдельный таб `задания на подписание`;
- карточка показывает legacy status, услугу, адрес, оплату, дату и время;
- обязательные по registry `signing.document_status` и `signing.primary_action` не имеют утверждённого контракта;
- `waiting_user`, `processing`, `signed` существуют как provisional resolver/fixture variants.

Нужно утвердить:

1. Остаётся ли Signing отдельным табом или является секцией My Tasks.
2. Канонические integration states и переходы, включая `rejected`.
3. Для каких состояний есть CTA, его действие и текст.
4. Нужен ли deadline и когда он считается критичным.
5. Остаются ли `processing` и `signed` в табе либо переходят в историю.

После решения:

- активировать или заменить `RULE-SIGNING-001` и `EXC-SIGNING-001`;
- обновить state migration и signing scenarios;
- реализовать утверждённые fields/actions без изменения других card families;
- добавить E2E для каждого остающегося runtime state;
- перевести `signing_card` в `verified`.

## Решение 3. Пустая сохранённая подборка

Связанные вопросы определяются контрактом `saved_collection_card.empty_collection`; отдельного утверждённого решения в доступных источниках нет.

Текущее доказанное состояние:

- сохранённая подборка поддерживает apply/edit/delete;
- unsaved collection исключается resolver-ом и не рендерится;
- `empty_collection` имеет resolver и fixture, но повторяет active anatomy;
- экран без сохранённых подборок — отдельное общее empty state, а не `empty_collection`.

Нужно утвердить:

1. Остаётся ли сохранённая карточка видимой, если текущая подборка возвращает ноль заданий.
2. Какой текст заменяет или дополняет summary.
3. Доступно ли `показать задания`, либо primary action меняется на редактирование фильтров.
4. Сохраняются ли edit/delete и chips.

После решения:

- закрепить variant anatomy и `enabledActions`;
- добавить runtime zero-result scenario, E2E и visual baseline;
- перевести `saved_collection_card` в `verified`.

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

1. Signing — блокирует обязательные content/actions и четыре open questions.
2. Favorites services — блокирует полный runtime service-offer contract.
3. Empty collection — локальный variant contract.
4. Catalog error/stale — два независимых UI-state contract.

После утверждения каждого блока решения должны быть записаны отдельными DEC ID и связаны с rules, exceptions, scenarios, templates, observations и migration map до реализации UI.
