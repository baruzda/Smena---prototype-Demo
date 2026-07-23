# Работа с правилами карточек

Применяй эти инструкции при любом изменении карточек, их контента, CTA, порядка, list/UI states или размещения.

1. Прочитай `docs/card-rules/README.md`, `component-bindings.json` и `migration-map.json`.
2. Объяви scope: `LOCAL`, `SHARED` или `GLOBAL`; по умолчанию — `LOCAL`.
3. Определи entity, state dimensions, surface, template, structural variant, markers, content, rule IDs, exceptions и scenarios до изменения React/CSS.
4. `active` rule — approved product truth. `provisional` rule требует unresolved question. Implementation observation никогда не является product truth.
5. Marker не меняет анатомию; structural variant меняет крупные блоки или поведение. Business state не является UI state.
6. Одно правило изменяет одну цель. Исключение всегда ссылается на `baseRule`.
7. Не меняй смысл active rule без `supersedes` и записи в `decision-log.md`.
8. Не разрешай конфликт предположением: создай или свяжи unresolved question.
9. При изменении карточки проверь все `supportedSurfaces` и placement rules.
10. Обновляй scenarios, component bindings и migration map вместе с исходным реестром.
11. Declarative scenario не называй исполняемым тестом.
12. Не редактируй `docs/card-rules/generated/*.md` вручную.
13. Не удаляй legacy implementation до статуса `verified` с evidence.
14. Не расширяй конфликтующие термины `задание`, `работа`, `подработка` без продуктового решения.
15. Обязательные проверки: `npm run validate:card-rules`, `npm run test:card-rules`, `npm run test:card-rules-validator`, `npm run build`, `npm run test:e2e`.
