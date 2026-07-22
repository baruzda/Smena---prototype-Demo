# E2E gap report

Дата: 2026-07-22. Запуск `npm run test:e2e -- --workers=1 --reporter=line` начался, но среда потеряла сессию вывода до итоговой сводки. Это не позволяет заявлять успешный E2E.

## Stale selectors

`tests/app.spec.mjs` использует `.task-card`, `.task-card-special`, `.match-badge`, `.task-restrictions` и `.task-address-text`. Текущая реализация использует `.gig-task-card`, `.gig-task-card-special`, `.gig-task-badge`, `.gig-task-restrictions` и feature CSS modules.

## Классификация

- Причина: `existing stale selector`.
- Не является архитектурной регрессией rules foundation.
- UI и CSS не менялись для исправления этого разрыва.

## Следующая отдельная задача

Восстановить E2E по устойчивым role/data-testid контрактам, затем подтвердить число тестов и итог на актуальном `main`.
