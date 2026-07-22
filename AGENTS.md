# Prototype Instructions

## Card and UI changes

Before changing cards, card content, markers, actions, placement, list states or related styles, read `.codex/rules/card-rules.md`, `docs/card-rules/README.md`, `docs/card-rules/component-bindings.json` and `docs/card-rules/migration-map.json`. Declare scope as LOCAL, SHARED or GLOBAL; LOCAL is the default. Do not change React or CSS before identifying entity, state dimensions, surface, template, structural variant, markers, content elements, rule IDs, exceptions and scenarios. Treat `active` rules as approved product truth, never implementation observations. Update scenarios, component bindings and migration map together; never edit generated reports manually or remove legacy implementation before `verified`. Run every mandatory check listed in `.codex/rules/card-rules.md`.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.
