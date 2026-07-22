# Матрица карточек прототипа «Смена X5»

Источник правды: Figma component `mobile card`, node `10451:106630`.

Этот документ — контракт перед любыми изменениями карточек. Сначала добавляем/обновляем строку матрицы, потом правим JSX/CSS. Цель — не смешивать варианты карточек через “почти общий” layout.

## Базовые правила

- Каждый Figma variant получает явный компонент или явный mode внутри компонента.
- Семантические CSS-классы не шарятся между variants. Нельзя группировать селекторы вроде `.gig-task-hours, .employee-shift-hours`.
- Общими могут быть только нейтральные атомы: `brand-logo`, `metro-icon`, `distance-mark`, экспортированные Figma icon assets.
- Если два variants выглядят похоже, всё равно держим их layout-правила отдельно: это дешевле, чем ловить протечки после следующего макета.

## Variants Figma → код

| Figma variant | Компонент / mode | CSS namespace | Фон / рамка | Верх | Низ / действия | Статус |
| --- | --- | --- | --- | --- | --- | --- |
| `sceleton` | `TaskSkeletonCard` | `task-skeleton-*` | white + stroke | placeholders + logo circle | divider + placeholders | Реализовано |
| `default` | `TaskCard cardVariant="default"` fallback | `gig-task-*` | white + stroke | title + address + brand | payment/rate + hours/break | Реализовано |
| `подходит вам` | `TaskCard cardVariant="match"` | `gig-task-*` | white + stroke | violet badge `подходит вам` + title + address + brand | payment/rate + hours/break | Реализовано |
| `status+` | `TaskCard cardVariant="status-plus"` | `gig-task-*` | white + stroke | status label + title + address + brand | old/new payment + old/new time | Реализован отдельный mode |
| `status` | `TaskCard cardVariant="status"` | `gig-task-*` | white + stroke | status label + title + address + brand | payment/rate + time/date | Реализован отдельный mode |
| `нижние теги` | `TaskCard cardVariant="bottom-tags"` | `gig-task-*` | white + stroke | title + address + brand | payment/rate + hours/break + bottom restriction chips | Реализован отдельный mode |
| `специально для вас` | `TaskCard cardVariant="special"` | `gig-task-*`, `special-card-*` | white + violet stroke | violet badge + timer + title + address + brand | payment/rate + hours/break + CTA | Реализовано |
| `основная смена` | `EmployeeShiftCard` with `shift.type === "primary"` | `employee-shift-*` | grey-light, no stroke | grey badge + title + address + brand | date/time | Реализовано отдельным namespace |
| `сверхурочная смена` | `EmployeeShiftCard` with `shift.type !== "primary"` | `employee-shift-*` | grey-light, no stroke | grey badge + title + address + brand | date/time | Зарезервировано для смен, не для услуг |
| `подходящих услуг больше нет` | `TaskMessageCard variant="no-more"` | `task-message-*` | grey-light | centered title + explanatory text | subscribe + show all | Реализовано |
| `в этот день нет подходящих услуг` | `TaskMessageCard variant="empty-day-filtered"` | `task-message-*` | grey-light | centered title + explanatory text | subscribe + show all | Реализовано |
| `в этот день услуг нет` | `NoTasksForDayCard` | `task-message-*` | grey-light | centered title | subscribe | Реализовано |
| `избранное-подборка` | saved collection card | `favorite-collection-*` | white + stroke | collection title + logos + menu | chips + CTA | Реализовано |
| `избранное - магазин` | demo store card in stores tab | `favorite-store-*` | white + stroke | title + store/address + menu | chips + CTA | Реализовано |

## Запрещённые пересечения

- `gig-task-*` нельзя использовать в `EmployeeShiftCard`.
- `employee-shift-*` нельзя использовать в `TaskCard`.
- `my-task-*` нельзя использовать в ленте заданий.
- `details-*` нельзя использовать в карточках ленты.
- Бейджи не взаимозаменяемы: `gig-task-badge`, `employee-shift-badge`, `details-match-badge`, `my-task-status` — разные элементы.
- Нельзя использовать текстовые псевдо-иконки (`☆`, `⌄`) вместо экспортированных assets, если asset уже есть.
- `TaskMessageCard` обязан получать причину скрытия: `filters`, `availability` или `mixed`. Текст причины:
  - `filters`: «ещё N услуг скрыты из-за фильтров» / «N услуг скрыты из-за фильтров»;
  - `availability`: «ещё N услуг скрыты из-за настроек доступности» / «N услуг скрыты из-за настроек доступности»;
  - `mixed`: «ещё N услуг скрыты из-за фильтров или выбранного времени» / «N услуг скрыты из-за фильтров или выбранного времени».

## Чеклист перед деплоем

1. `rg "\\b(task-card-bottom|task-hours|match-badge)\\b|gig-task.*employee|employee.*gig-task" src/App.jsx src/styles.css`
2. Собрать проект.
3. Открыть локальный preview.
4. Проверить минимум эти states:
   - обычная/подходящая услуга;
   - обычная услуга без бейджа;
   - основная смена;
   - скрытая/неподходящая услуга;
   - `подходящих услуг больше нет`;
   - `в этот день нет подходящих услуг`;
   - `в этот день услуг нет`.
5. Если правка затрагивает карточки, обновить эту матрицу в том же коммите.
