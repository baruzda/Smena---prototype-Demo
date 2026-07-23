# Журнал решений по карточкам

## DEC-014 — утверждённый контракт пустой сохранённой подборки

Контекст: пользователь поручил выполнить следующий логичный шаг после `DEC-013` — закрыть product gap `saved_collection_card.empty_collection`. В доступном репозитории сохранены Figma `mobile card` variant, active-card anatomy и fixture, но точный zero-result contract ранее не был утверждён. Решение: сохранённая подборка с `resultCount: 0` остаётся в Favorites и получает самостоятельную anatomy `empty_collection`; сохраняет title, brand context, filter chips, edit и delete; показывает статус `сейчас подходящих заданий нет` и пояснение `измените условия подборки — покажем новые варианты`; скрывает `показать задания`, а primary recovery становится `изменить подборку`. Несохранённая подборка по-прежнему исключается. Последствие: variant и actions получают active rules, runtime zero-result scenario, unit/E2E/visual evidence, а `saved_collection_card` переводится в `verified`. Не входит: серверный подсчёт результатов и push/email delivery.

## DEC-013 — утверждённый контракт избранных услуг

Контекст: пользователь утвердил блок Favorites services из product decision brief 2026-07-23. Решение: Favorites получает три вкладки в порядке `услуги`, `магазины`, `подборки`. Доступные избранные услуги остаются в `services_available`; `unavailable`, `cancelled`, `expired` остаются в `services_unavailable` до явного удаления пользователем. `pending_confirmation`, `signing_required`, `booked`, `active`, `completed` покидают Favorites. Доступная услуга открывает детали; `favorite_unavailable` не открывает детали и не имеет booking CTA, её единственное действие — `удалить из избранного`. Последствие: существующие `RULE-FAVORITES-001` и `EXC-FAVORITES-001` получают утверждённый runtime-entry, добавляется отдельное action rule, а `service_offer_card` переводится в `verified`. Не входит: синхронизация с production Favorites API и временной SLA хранения недоступных записей.

## DEC-012 — утверждённый контракт Signing

Контекст: пользователь утвердил блок Signing из product decision brief 2026-07-23. Решение: Signing остаётся отдельным табом; канонические runtime-состояния — `waiting_user`, `processing`, `signed`, `rejected`, и все они остаются в табе в отдельных упорядоченных секциях. Primary CTA `подписать` доступен только в `waiting_user` и переводит запись в `processing`. Deadline остаётся необязательным и не получает критичного оформления без отдельного решения. Последствие: placement, document status, primary action и переход получают active rules, runtime, unit, visual и E2E evidence; `signing_card` переводится в `verified`. Не входит: интеграция с реальным сервисом подписания, история документов и критичный deadline.

## DEC-011 — явная runtime-идентичность hidden services

Контекст: `HiddenServicesState` использовался внутри `PartiallyHiddenState`, но получал тип родительского состояния и поэтому не эмитил собственный `hidden_services.message` ID. Решение: сохранить `catalog.partially_hidden` как внешний composition state, а вложенному сообщению вернуть `hidden_services.message`. Тексты, actions и визуальная анатомия не меняются. Последствие: UI state имеет отдельные resolver, runtime, visual и E2E evidence и получает статус `verified`. Не входит: изменение состава скрытых услуг или обход фильтров; эти правила остаются определены DEC-009.

## DEC-010 — компонентная миграция карточек

Контекст: legacy-разметка карточек и связанных UI-состояний находилась в `src/App.jsx` и глобальном `src/styles.css`, поэтому правила, варианты и потребители нельзя было проверять изолированно. Решение: перенести presentation-логику в чистые resolvers, UI — в entity-компоненты с CSS Modules, списки — в widgets, а связь registry → source → tests закрепить `component-bindings.json` и автоматической проверкой `scripts/check-card-component-coverage.mjs`. Legacy-функции карточек и их семантические глобальные селекторы удаляются только после unit, visual и E2E evidence. Последствие: `App.jsx` остаётся orchestration shell, каждый зарегистрированный structural variant имеет отдельный visual snapshot. Не входит: утверждение provisional product rules, контракт signing states и отсутствующие контракты `catalog.error`/`catalog.stale`; они сохраняют статусы `migrated` или `planned`.

Проверка статусов: `service_offer_card` остаётся `migrated`, пока в runtime Favorites отсутствует утверждённая секция услуг для `favorite_unavailable`; `saved_collection_card` остаётся `migrated`, пока не утверждена exact anatomy варианта `empty_collection`; `hidden_services.message` остаётся `migrated`, пока exact UI-state не имеет отдельного runtime trigger. Наличие resolver и fixture snapshot само по себе не даёт `verified`.

## DEC-009 — состав списка скрытых услуг

Контекст: пользователь подтвердил, что раскрытие скрытых услуг не должно обходить фильтры каталога или конфликт с основной сменой. Решение: карточки, исключённые текущими фильтрами, возвращаются только после изменения фильтров и пересчёта основной выдачи; карточки с пересечением основной смены не входят в персональную подборку и не показываются через «показать остальные». Последствие: `OPEN-QUESTION-014` закрыт, правило `RULE-HIDDEN-001` и сценарии `SCN-CATALOG-003`/`SCN-CATALOG-004` становятся утверждённым контрактом. Не входит: выбор structural variant, подписи ограничений, статусы подписания и правила для пересечения с уже принятой дополнительной услугой.

## DEC-008 — code-only правила остаются provisional

Контекст: часть поведения, перенесённого из `src/App.jsx`, была помечена `active`, хотя DEC-002 запрещает считать implementation product truth. Решение: code-only выбор вариантов, порядок специальных предложений, runtime mapping Моих заданий и условие метро переведены в `provisional`, связаны с observations и unresolved questions. Эта запись уточняет и заменяет только утверждение DEC-001 о подтверждённости code-derived поведения; реестры и UI не удаляются и не меняются.

## DEC-002 — product rules и implementation observations

Контекст: поведение `App.jsx` не равно утверждённому продуктовым решению. Решение: хранить code-only поведение в `implementation-observations.json`; причина — избежать ложного источника истины. Последствие: такие правила provisional или unresolved. Не входит: изменение UI. Связанные файлы: observations и rules.

## DEC-003 — независимые оси состояний

Контекст: один список смешивал доступность, участие и подписание. Решение: `state-dimensions.json` с legacy mapping. Причина: независимые жизненные циклы. Не входит: переименование runtime state.

## DEC-004 — markers и structural variants

Контекст: marker `suitable_for_you` был вариантом `match`. Решение: marker не выбирает structural variant; code-derived выбор provisional. Причина: один badge не меняет анатомию. Не входит: утверждение правила ограничений.

## DEC-005 — UI-states не являются карточками услуги

Контекст: skeleton и сообщения имели общий радиус с карточками. Решение: отдельный registry UI states. Причина: они не содержат service entity. Не входит: новый UI.

## DEC-006 — component bindings и migration map

Контекст: модель правил не была связана с legacy implementation. Решение: технические bindings и карта сохранности. Причина: локальная безопасная миграция. Не входит: компонентная миграция.

## DEC-007 — declarative acceptance scenarios

Контекст: scenarios не исполняют resolver. Решение: обозначать их declarative до отдельного `resolveCardPresentation(input)`. Причина: не заявлять несуществующую проверку. Не входит: production resolver.

## DEC-001

Дата: 2026-07-22

Статус: принято как архитектурное решение

### Решение

Создать нормализованный реестр правил карточек. Разделить сущность, состояние, поверхность, шаблон, вариант, элемент контента, правило и исключение.

JSON-файлы в `docs/card-rules/` являются источником истины. Markdown-матрицы в `generated/` собираются автоматически.

### Основание

Правила карточек будут регулярно дополняться и изменяться. Свободный текст и одна общая таблица не позволяют надёжно определить область изменения и находить противоречия.

### Миграция существующих решений

В начальный реестр перенесены подтверждённые правила из:

- `docs/catalog-rules-matrix.md`;
- `docs/availability-rules.md`;
- текущей реализации `src/App.jsx`.

Неопределённые вопросы вынесены в `open-questions.md` и не считаются утверждёнными правилами.

### Последствия

- Любое новое поведение получает постоянный ID.
- Исключение всегда ссылается на базовое правило.
- Противоположные правила одинакового приоритета блокируют валидацию.
- Старое правило не удаляется при изменении смысла.
- Codex обязан добавлять тестовые сценарии вместе с правилом.
