# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Prototype motion preference: use smooth, purposeful animations for state changes where they clarify hierarchy or reduce abruptness. Filter sheets, availability/settings sheets, modal overlays, sticky controls, cards, and floating actions should enter/exit softly while respecting reduced-motion preferences.

Favorite store card rule: the retail brand logo is a standalone leading mark for the store row; the metro icon belongs inline to the address/station text and must not wrap away as a separate symbol beside the brand logo.

Default demo state rule: every full prototype reload must start on the tasks feed with the settings onboarding overlay/tooltip visible, the "подходит мне" toggle enabled, empty filters, empty search location/radius, and empty availability settings. Do not persist dismissed onboarding or configured filters/location/availability across reloads.
