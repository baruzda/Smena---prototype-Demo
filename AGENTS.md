# Prototype Instructions

## Card and UI changes

Before changing cards, card content, markers, actions, placement, list states or related styles, read `.codex/rules/card-rules.md`, `docs/card-rules/README.md`, `docs/card-rules/component-bindings.json` and `docs/card-rules/migration-map.json`. Declare scope as LOCAL, SHARED or GLOBAL; LOCAL is the default. Do not change React or CSS before identifying entity, state dimensions, surface, template, structural variant, markers, content elements, rule IDs, exceptions and scenarios. Treat `active` rules as approved product truth, never implementation observations. Update scenarios, component bindings and migration map together; never edit generated reports manually or remove legacy implementation before `verified`. Run every mandatory check listed in `.codex/rules/card-rules.md`.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Prototype motion preference: use smooth, purposeful animations for state changes where they clarify hierarchy or reduce abruptness. Filter sheets, availability/settings sheets, modal overlays, sticky controls, cards, and floating actions should enter/exit softly while respecting reduced-motion preferences.

Favorite store card rule: the retail brand logo is a standalone leading mark for the store row; the metro icon belongs inline to the address/station text and must not wrap away as a separate symbol beside the brand logo.

Default demo state rule: every full prototype reload starts with a centered service spinner for 1 second, then the tasks feed with two task-card skeletons for 1 second, then the settings onboarding overlay/tooltip. The "подходит мне" toggle stays enabled; filters, search location/radius, and availability settings start empty. Do not persist a dismissed onboarding or configured filters/location/availability across reloads.

Signing decision: Signing remains a separate tab. Its canonical runtime states are `waiting_user`, `processing`, `signed`, and `rejected`; all four remain visible in that tab in section order. Only `waiting_user` exposes the primary CTA `подписать`, and activating it moves the document to `processing`. Deadline is optional and has no critical styling until a separate product decision changes that contract.

Favorite services decision: Favorites has three tabs in this order: `услуги`, `магазины`, `подборки`. Available favorite services stay in `services_available`; unavailable, cancelled, and expired favorites stay in `services_unavailable` until the user explicitly removes them. Pending confirmation, signing-required, booked, active, and completed services leave Favorites. Available favorite services open task details; `favorite_unavailable` never exposes booking/details actions and only exposes `удалить из избранного`.

Empty saved collection decision: a saved collection with `resultCount: 0` remains visible in Favorites as `saved_collection_card.empty_collection`. It keeps the collection title, brand context, filter chips, edit and delete actions; it replaces the apply action with the primary recovery action `изменить подборку` and shows `сейчас подходящих заданий нет` plus `измените условия подборки — покажем новые варианты`. It never exposes `показать задания` while empty. An unsaved collection remains excluded.
