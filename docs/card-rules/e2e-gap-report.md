# E2E gap report: карточки услуг

Дата фиксации: 2026-07-22

## Исходный статус

Предыдущий запуск E2E нельзя было считать подтверждённо успешным: среда потеряла сессию вывода до финальной сводки.

При анализе `tests/app.spec.mjs` были обнаружены устаревшие селекторы `.task-card`, `.task-card-special`, `.match-badge`, `.task-restrictions` и `.task-address-text`. Текущая реализация карточек использует пространство имён `gig-task-*`. Разрыв классифицирован как **existing stale selector**, а не как регрессия архитектуры правил.

## Исправление

E2E-тесты переведены на актуальные селекторы: `.gig-task-card`, `.gig-task-card-special`, `.gig-task-badge`, `.gig-task-restrictions` и `.gig-task-address-text`.

Дополнительно тестовые контракты синхронизированы с текущим приложением: восстановлены штатные defaults, актуальная версия онбординга и сохранённого состояния, текущие aria-label и сценарии избранного. React-компоненты, DOM-контракты карточек и CSS ради совместимости со старыми тестами не менялись.

## Защита от повторения

Workflow `Card rules validation` запускает базовую и cross-registry валидацию, isolated fixtures, production build и полный Playwright E2E. `set -o pipefail` не позволяет `tee` скрыть код ошибки тестов.

## Проверка remote-цепочки

GitHub Actions workflow `Card rules validation`, запуск `29933323005`:

- базовая и cross-registry валидация: **успешно**;
- fixtures: **1 положительный и 5 отрицательных, успешно**;
- production-сборка: **успешно**;
- Playwright: **16 из 16 тестов успешно**, 23,5 секунды.

## Загрязнение E2E-сервера после merge

После merge удалённой цепочки с локальной архитектурной цепочкой `npm run test:e2e` остановился после трёх failures (из шести начатых тестов):

- `специальное для вас приоритетно без сортировки и участвует в сортировке` — `.gig-task-card` не найден;
- `общий каталог сохраняет дальние задания после подходящих` — `.gig-task-card` не найден;
- `в моих заданиях показаны демо-записи с разными статусами` — `.my-task-card` не найден.

Первичная гипотеза о UI-регрессии не подтвердилась. На `4173` уже слушал PID `69818`: `node …/gig-schedule-prototype/node_modules/.bin/vite --host 127.0.0.1 --port 4173`, cwd `/Users/baruzdinalexey/Documents/Projects/gig-schedule-prototype`. Это основной worktree, а не `/private/tmp/smena-card-rules`; `reuseExistingServer: true` позволял Playwright подключиться к нему.

## Изоляция и подтверждение текущего HEAD

`playwright.config.mjs` теперь использует `E2E_PORT` (по умолчанию `4187`) для обоих `baseURL` и `webServer`, а `reuseExistingServer` установлен в `false`. Занятый выделенный порт теперь даёт явную ошибку вместо переиспользования чужого сервера.

Отдельный Vite runtime из `/private/tmp/smena-card-rules` на `http://127.0.0.1:4187/` подтвердил текущий bundle: `document.title === "Prototype"`, URL — `http://127.0.0.1:4187/`, в каталоге найдено 65 `.gig-task-card`. Затем Playwright создал собственный сервер на том же порту и успешно выполнил три ранее падавших теста: **3/3 passed**.

Финальный аудит повторил полный gate дважды на чистом Playwright-сервере:

- цикл 1: **16 passed, 0 failed, 0 skipped, 0 flaky, 18.7s**;
- цикл 2: **16 passed, 0 failed, 0 skipped, 0 flaky, 21.1s**.

Результат классифицирован как **E2E_SERVER_CONTAMINATION**, а не stale selector, state drift или UI-регрессия.

## Статус

- Remote gap по устаревшим селекторам был закрыт отдельной цепочкой коммитов.
- Для объединённого HEAD E2E-gate: **проходит** на изолированном порту `4187`.
- Отдельный продуктовый вопрос о визуальном объяснении услуг вне радиуса остаётся открытым; он не маскируется E2E-тестами.
