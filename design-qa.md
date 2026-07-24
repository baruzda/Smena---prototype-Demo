# Design QA: финальная миграция карточек

## Comparison target

- Source visual truth: Figma node `10451:105590`, сохранённый как `qa/figma-reference.png`; card contract — Figma component `mobile card`, node `10451:106630`, зафиксированный в `docs/card-style-matrix.md`.
- Browser-rendered implementation: `qa/card-migration-implementation-final.png`.
- Combined comparison input: `qa/card-migration-comparison-final.png`.
- Focused card evidence: `tests/card-variants.visual.spec.mjs-snapshots/` и `tests/card-visual.spec.mjs-snapshots/`.
- Viewport and normalization: source `393 × 860 px`, implementation `393 × 860 px`, CSS viewport `393 × 860`, `deviceScaleFactor: 1`; combined input `806 × 860 px` with a 20 px neutral separator. Density normalization was not required.
- State: tasks tab, current date selected, matching toggle enabled, first catalog cards visible. Dynamic dates, the Favorites tab, the availability control and matching badges are approved product changes, not design drift.

## Findings

- No actionable P0, P1 or P2 findings remain.
- [P3] The combined capture retains a purple `focus-visible` ring on the matching toggle because the browser had just checked it.
  - Evidence: Figma shows the normal checked state; the implementation screenshot shows the same control with keyboard focus.
  - Impact: capture-state difference only; layout, color tokens, sizing and interaction semantics are correct.
  - Follow-up: blur the control before a future normal-state marketing capture.

## Required fidelity surfaces

- Fonts and typography: X5 Sans assets, weights, hierarchy, line heights and card wrapping are consistent with the Figma source. Long dates in My Tasks and Signing now wrap in the right column without splitting payment or hourly-rate values.
- Spacing and layout rhythm: the 393 px frame, 16 px page/card insets, 12 px card padding, 16 px radii, dividers and vertical rhythm match the source system. Narrow-viewport evidence remains readable without horizontal overflow.
- Colors and visual tokens: white surfaces, black primary copy, neutral secondary copy, borders, lavender matching badges and semantic status colors are consistent. The remaining purple outline is an intentional focus state.
- Image quality and asset fidelity: brand, metro and navigation assets render sharply. The missing profile image was restored as a native `28 × 28` crop from the supplied Figma source; no placeholder remains.
- Copy and content: task, status, error/stale, empty, subscription, Favorites and Signing copy follow the approved repository decisions. Dynamic catalog content differences are intentional.

## Full-view comparison evidence

`qa/card-migration-comparison-final.png` contains the source and implementation at the same viewport and density. The global hierarchy, card widths, borders, title/address/payment/time anatomy, sticky map action and bottom navigation remain aligned. Intentional product evolution is limited to the approved additional tab/control, dynamic date/content and matching markers.

## Focused region comparison evidence

Focused snapshots are required because the full view cannot make every card family and small typography surface readable. The structural suite covers all registered variants:

- service offers: default, special, restriction status, restriction status plus, restriction tags and favorite unavailable;
- employee shifts: primary and accepted overtime;
- my services: pending, booked, active, completed and cancelled;
- signing: waiting user, processing, signed and rejected;
- saved collections: active and empty;
- favorite store: complete title, brand, metro/address, chips and CTA.

Runtime snapshots additionally cover loading, skeletons, filtered empty, empty day, partially hidden, error, stale, Favorites and narrow viewport.

## Comparison history

1. Initial independent review found a P1 layout regression in every MyServiceCard and SigningCard snapshot: payment/rate split into multiple lines because the long date consumed the flex row. Fixed with a two-column grid, a constrained date column and no-wrap payment/rate values. Post-fix snapshots show readable columns.
2. Initial review found a P2 evidence gap in `favorite_store_card:default`: the fixture rendered only controls. Fixed by adding realistic title, brand, metro/address and chips. Post-fix snapshot covers the complete anatomy.
3. Initial review found a P2 asset mismatch: the bottom-navigation avatar was a white placeholder. Fixed by restoring the native 28 px subject/crop from the supplied Figma screenshot. Post-fix browser evidence matches the source.
4. Initial review found a P3 masked special-offer timer. The structural visual test now installs Playwright clock and captures the real deterministic countdown without a mask.
5. Independent post-fix re-review found no remaining P0/P1/P2 issues and returned `passed`.

## Runtime and interaction evidence

- Primary interactions checked: reload spinner → skeletons → onboarding, onboarding dismissal, matching toggle, tab/date controls, card opening, keyboard activation, booking, filters, availability, Favorites and Signing flows.
- Browser log check after the final reload added zero warnings or errors.
- Automated runtime test also verifies no console warnings/errors, page errors or unhandled rejections.

## Implementation checklist

- [x] Compare source and implementation in one normalized image.
- [x] Verify every registered structural variant.
- [x] Fix My Tasks and Signing payment/date wrapping.
- [x] Replace incomplete favorite-store visual fixture.
- [x] Restore the Figma profile asset.
- [x] Capture the special-offer timer deterministically.
- [x] Repeat independent post-fix review.

## Historical QA retained

The earlier header/control QA established the same Figma source, mobile viewport, exported icons, date timeline and filter-rail behavior. Its only residual note was the availability of the licensed X5 Sans asset; that asset is now present and used by the prototype.

final result: passed
