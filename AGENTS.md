# Prototype Instructions

## Card and UI changes

Before changing cards, card content, markers, actions, placement, list states or related styles, read `.codex/rules/card-rules.md`, `docs/card-rules/README.md`, `docs/card-rules/component-bindings.json` and `docs/card-rules/migration-map.json`. Declare scope as LOCAL, SHARED or GLOBAL; LOCAL is the default. Do not change React or CSS before identifying entity, state dimensions, surface, template, structural variant, markers, content elements, rule IDs, exceptions and scenarios. Treat `active` rules as approved product truth, never implementation observations. Update scenarios, component bindings and migration map together; never edit generated reports manually or remove legacy implementation before `verified`. Run every mandatory check listed in `.codex/rules/card-rules.md`.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Card UI rule: all task/list cards in this prototype must map to the Figma `mobile card` variants and to `docs/card-style-matrix.md` before implementation. Do not share semantic CSS between card variants; shared classes are allowed only for neutral atoms such as brand logos, metro icons, distance icons, and exported Figma icon assets.

Catalog decision: by default, the “подходит мне” toggle is off and the main list shows every service that passes active filters and does not overlap a primary contractual shift or a taken/approved overtime shift. Rare “специально для вас” cards appear 2–3 times per period. When the toggle is on, it uses the default `08:00–22:00` availability on free days until the user confirms other settings; matching cards have the “подходит вам” badge and the rest appear only under “показать остальные”. Filtered or conflicting services never appear in that list.

Employee shift card decision: in the lower-left date block, show the calendar date as the primary line and the weekday as the secondary line.

Unavailable task card decision: show restriction tags above the task title, next to the brand mark; never place them below the payment and time details.

Availability settings control decision: use the exported `calendar_clock.svg` icon in the schedule controls and availability onboarding target.

## UI architecture and change safety

Every UI task has one scope: `LOCAL` (one component or screen), `SHARED` (a reusable component and every consumer), or `GLOBAL` (tokens, theme, typography, or global rules). If scope is absent, use `LOCAL`.

Make the smallest necessary change. Do not change unnamed components, make incidental visual refactors, alter a design token to fix one element, alter global CSS for a local task, or accept accidental visual changes.

Before creating a button, card, badge, switch, field, or sheet: find the existing component, review its variants, reuse it, extend its API only for a semantic need, and never copy its markup/styles onto a new screen.

Do not use `!important`, broad selectors for local fixes, parent-screen styling of a component, `nth-child` dependencies, arbitrary hard-coded visual values, or duplicate classes for equivalent elements.

Before changing a shared component, find all consumers, list affected scenarios, decide whether the change belongs in the base component, an existing variant, a new variant, or a domain wrapper, then check every existing state.

For visual fixes after user-reported mismatch or regression, run an independent design-QA sub-agent before deployment and verify the actual rendered UI with a screenshot, not only code or build output.

Every UI completion report must state scope, changed files/components, affected shared components, checked screens, tests run, changed visual baselines, and remaining risks.

Prototype motion preference: use smooth, purposeful animations for state changes where they clarify hierarchy or reduce abruptness. Filter sheets, availability/settings sheets, modal overlays, sticky controls, cards, and floating actions should enter/exit softly while respecting reduced-motion preferences.

Default launch sequence: on every full prototype reload, show a centered service spinner for 1 second, then the tasks screen with two task-card skeletons for 1 second, then show the settings onboarding. Do not persist a dismissed onboarding state across reloads.

Default launch sequence: on every full prototype reload, show a centered service spinner for 1 second, then the tasks screen with two task-card skeletons for 1 second, then show the settings onboarding. Do not persist a dismissed onboarding state across reloads.

Task sorting must include a distinct `выше цена за час` option that orders cards by their displayed hourly rate, independently from the total-earnings sort.

The dirty filters footer must match Figma node `10712:406471`: a transparent 56px `сохранить в подборку` row with the exported black 24px star, 16px vertical gap, equal 56px reset/save pills with an 8px gap and 16px side insets, the Figma white fade, and a 34px home-indicator safe area. The footer is visually anchored to the bottom of the prototype viewport; only `.filters-content` scrolls beneath it.

The service filter is a searchable multi-select over the unique Variant 2 service catalog. Multiple selected services use OR semantics, persist in filters and saved collections, and legacy single-service strings must remain readable.

The store-address filter is a searchable multi-select over the current territory's store addresses. Multiple selected stores use OR semantics, persist in filters and saved collections, and restrict the task feed to the selected store IDs.

Filter and availability-settings footers use applied-versus-draft state: no draft changes with no applied values shows only «Закрыть»; no draft changes with applied values shows «Закрыть» and immediate «Сбросить все»; draft changes show «Отмена» plus «Применить», or «Показать все» when the draft is empty. Reset all applies defaults and closes the screen.

Availability settings visually default to «весь день» with 08:00–22:00 prefilled. This visual default is not considered an applied user filter until the user confirms a change.

On the tasks screen, schedule controls stay sticky directly below the date timeline while scrolling so their controls never pass under or become clipped by the calendar.

The “показать остальные” task-message action uses a compact 18×10 px chevron; exported SVG dimensions must not control the button’s icon size.

The availability onboarding explains only days and hours for side work; it must not mention a search location.

On the tasks screen, a day without shifts or feed tasks shows the existing empty-day placeholder instead of leaving a blank gap.

The “подходит мне” toggle is disabled by default on a fresh prototype launch.
