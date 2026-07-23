# Архитектура правил карточек

## Статус документа

Этот каталог разделяет источник истины по типу данных: утверждённые product rules, Figma contracts, observed implementation и unresolved assumptions. Текущий `src/App.jsx` является наблюдением реализации, пока решение не отмечено явно.

Старые документы `docs/catalog-rules-matrix.md` и `docs/availability-rules.md` остаются источниками контекста и продуктовых решений, но при расхождении приоритет имеют данные из `docs/card-rules/*.json` и записи в `decision-log.md`.

## Зачем нужна эта структура

Правила разделены на независимые реестры, чтобы изменение одного признака не переписывало всю карточку и не создавало скрытые противоречия.

- `dictionary.json` хранит допустимые сущности, состояния, маркеры, действия и поверхности.
- `templates.json` описывает шаблоны карточек, слоты и визуальные варианты.
- `content-elements.json` описывает каждый элемент контента и его источник.
- `surfaces.json` описывает табы, секции и порядок размещения.
- `rules.json` хранит атомарные правила показа, скрытия, выбора варианта и размещения.
- `exceptions.json` хранит только переопределения базовых правил.
- `precedence.json` задаёт приоритеты и порядок разрешения конфликтов.
- `scenarios.json` содержит проверяемые продуктовые сценарии.
- `state-dimensions.json` разделяет availability, participation и signing без удаления legacy ID.
- `implementation-observations.json` хранит неподтверждённое поведение прототипа.
- `ui-states.json` хранит состояния интерфейса и списка, не варианты услуги.
- `component-bindings.json` и `migration-map.json` связывают UX-модель с текущей миграцией.
- `schemas/` содержит исполняемые JSON Schemas для каждого source registry; `registry-definitions.schema.json` хранит общие `$defs`.
- `open-questions.md` фиксирует решения, которых пока не хватает.
- `decision-log.md` хранит историю замен и изменений правил.
- `generated/` содержит автоматически собранные матрицы для чтения командой.

## Базовая модель

Карточка определяется не одним названием, а комбинацией:

```text
сущность + состояние + поверхность + шаблон + вариант + контент + исключения
```

Пример:

```text
service_offer
+ available
+ tasks
+ service_offer_card
+ default
+ marker.suitable_for_you
+ отсутствие блокирующих исключений
```

`Подходит вам` — marker: он не меняет анатомию и не выбирает structural variant. Structural variant меняет крупные блоки, действия или самостоятельный визуальный контракт. UI-state (skeleton, empty, message, error) не является business state услуги.

Статус `active` означает approved product rule. Статус `provisional` означает технически формализованное, но не утверждённое поведение; такое правило обязано ссылаться на unresolved question. Code-only behavior хранится в `implementation-observations.json` и не может становиться `active` без отдельного решения.

## Acceptance scenarios

В `scenarios.json` хранится 30 приёмочных сценариев. Из них 14 имеют `executionStatus: verified` и прямую ссылку `testEvidence` на resolver tests; остальные остаются `declarative`, пока зависят от provisional правил или нерешённых продуктовых контрактов. Сам JSON-реестр не является production resolver.

## Правило атомарности

Одно правило изменяет только одну цель:

- видимость элемента;
- вариант карточки;
- размещение;
- порядок;
- доступность действия;
- значение текста или статуса.

Нельзя одним правилом одновременно менять вариант карточки, CTA, порядок и набор контента. Для этого создаются связанные правила с отдельными ID.

## Формат ID

```text
RULE-<DOMAIN>-<NUMBER>
EXC-<DOMAIN>-<NUMBER>
SCN-<DOMAIN>-<NUMBER>
DEC-<NUMBER>
```

ID никогда не переиспользуются. Устаревшее правило получает `status: superseded`, а новое правило указывает его в `supersedes`.

## Приоритеты

Порядок применения хранится в `precedence.json`:

1. юридические и безопасностные ограничения;
2. блокирующие исключения;
3. состояние процесса;
4. правила конкретной поверхности;
5. совместимость с пользователем;
6. персонализация;
7. значения по умолчанию.

При одинаковом приоритете два противоположных эффекта для одной сигнатуры считаются ошибкой. Codex не должен выбирать победителя самостоятельно.

## Как добавить правило

1. Найти существующие ID в `dictionary.json`.
2. Найти целевой шаблон, вариант, поверхность и элемент контента.
3. Проверить правила с той же целью.
4. Добавить одно атомарное правило.
5. Добавить исключение только при реальном переопределении базового правила.
6. Добавить минимум один положительный и один отрицательный сценарий.
7. При замене заполнить `supersedes` и обновить `decision-log.md`.
8. Запустить `npm run validate:card-rules`.
9. Проверить `generated/conflicts-report.md`.

## Как изменить существующее правило

Нельзя молча переписывать смысл активного правила, если изменение меняет продуктовую логику.

Используется один из двух режимов:

### Уточнение без изменения смысла

Допустимо изменить описание, комментарий, источник решения или добавить тест.

### Изменение поведения

Создаётся новое правило:

```json
{
  "id": "RULE-MARKER-002",
  "status": "active",
  "supersedes": ["RULE-MARKER-001"]
}
```

Старое правило переводится в `superseded` и получает `supersededBy`.

## Автоматическая проверка

```bash
npm run validate:card-rules
npm run check:card-rules-generated
npm run test:card-rules
npm run test:card-rules-validator
```

Проверка контролирует:

- уникальность ID;
- существование всех ссылок;
- JSON Schema каждого source registry и обязательные поля;
- наличие тестов у активных правил;
- корректность секций и поверхностей;
- корректность элементов контента;
- связь исключения с базовым правилом;
- конфликты одинакового приоритета;
- корректность `supersedes`;
- cross-registry связи, questions/backlinks, bindings и migration safety;
- генерацию человекочитаемых матриц.

`test:card-rules` выполняет 6 valid и 20 invalid isolated fixtures через alternate rules directory. Это фактическое число всех обязательных именованных negative cases (их перечень содержит 20 пунктов). `test:card-rules-validator` проверяет повторную генерацию и побайтовую детерминированность generated reports.

## Сгенерированные документы

После успешной проверки обновляются:

- `generated/card-matrix.md`;
- `generated/content-matrix.md`;
- `generated/placement-matrix.md`;
- `generated/rules-matrix.md`;
- `generated/conflicts-report.md`;
- `generated/approved-rules-matrix.md`;
- `generated/provisional-rules-matrix.md`;
- `generated/implementation-observations.md`;
- `generated/ui-states-matrix.md`;
- `generated/component-bindings-matrix.md`;
- `generated/migration-status.md`;
- `generated/scenarios-matrix.md`;
- `generated/state-dimensions-matrix.md`;
- `generated/variant-resolution-matrix.md`;
- `generated/open-blockers.md`.

Сгенерированные файлы не редактируются вручную.

Матрицы approved и provisional содержат отдельные разделы для exceptions: статус, base rule, приоритет, вопрос, решение и причину.
