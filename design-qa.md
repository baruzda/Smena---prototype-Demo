**Comparison Target**

- Source visual truth: Figma node `10451:105590`, saved at `qa/figma-reference.png`.
- Implementation screenshots: `qa/implementation-final.png` and `qa/timeline-filters-final.png`.
- Full-view comparisons: `qa/comparison-final.png` and `qa/timeline-filters-comparison.png`.
- Viewport: mobile surface `393 x 860`; review scope is the status bar, navigation controls, heading, tabs, date timeline, and filter row.
- State: first tab, `задания`, selected; 1 пн is the active date and the `подходит мне` toggle is on. Interaction tested: clicking `мои задания` moved `aria-current="page"` to that tab; selecting 3 ср moved the active-day state; the toggle and network selector update their visible states. Browser console errors: none.

**Findings**

- No actionable P0, P1, or P2 visual differences in the scoped header and controls region.
- [P3] Fallback font differs slightly from the Figma `X5 Sans VF` source.
  Location: header, tabs, and status time.
  Evidence: the implementation uses the closest installed system fallback because no web-font asset was supplied by the selected Figma node.
  Impact: minor glyph-shape variance only; sizing, hierarchy, spacing, and wrapping match the reference within this first slice.
  Fix: load the licensed `X5 Sans VF` web font when it is available to the project.

**Required Fidelity Surfaces**

- Fonts and typography: title uses 34/34 with -0.34px tracking; tab labels use 16/20. Fallback family is the only residual difference.
- Spacing and layout rhythm: status bar 56px, navigation row 48px, heading bottom inset 12px, tabs 40px with 16px page insets; date tiles 44x56px and the 20px timeline-to-filter gap match the Figma context.
- Colors and visual tokens: white surface, black title and active tab, white active-tab text, and neutral inactive controls match the source.
- Image quality and asset fidelity: back, filter, help, and status indicators are source Figma SVG assets, rendered without replacement icons.
- Copy and content: `смена X5`, `задания`, `мои задания`, and `задания на подписание` match the source.

**Comparison History**

1. Initial capture found broken Figma assets because SVG files were saved with `.png` extensions. Fixed by preserving the source SVG format and updating image references.
2. Second capture found the mobile surface lacked the source corner treatment. Fixed by retaining the 40px frame radius at the mobile width.
3. Final capture shows no actionable P0/P1/P2 differences in the scoped region.

**Implementation Checklist**

- [x] Reproduce status bar, navigation, title, and horizontal tabs.
- [x] Use Figma-sourced icons.
- [x] Make tabs interactive and expose the active state semantically.
- [x] Add horizontally scrolling date timeline and filter row.
- [x] Add horizontally scrolling filter rail with contextual edge fades.
- [x] Verify rendering, control state changes, and browser console.

**Follow-up Polish**

- Add the licensed `X5 Sans VF` font asset when supplied.

**Latest Iteration**

- Filter rail evidence: `qa/filters-fade-start.png` and `qa/filters-fade-scrolled.png`.
- Verified the initial right-edge fade and the scrolled state, where the left fade appears and additional filters (`оплата`, `расстояние`) become reachable.
- No application-console errors. The browser sandbox reports a Vite HMR WebSocket transport warning only; it does not affect rendering or interaction.

final result: passed

## Favorites services — DEC-013

- Scope: shared `service_offer_card` on Favorites plus the local Favorites tab shell.
- Evidence: `favorite-service-available.png`, `favorite-service-unavailable.png`, `favorites-services-narrow.png`, and `service-offer-card--favorite-unavailable.png`.
- Checked at 393 × 860 and 320 × 700; tabs fit without horizontal clipping.
- Available service opens details. `favorite_unavailable` has no details/booking control and only exposes `удалить из избранного`.
- Tabs use a stable `tabpanel`, roving focus, arrow/Home/End navigation, and selected-state semantics.
- `favorite_unavailable` semantic layout styles are isolated from other service-card variants; only approved neutral atoms remain shared.
- Removal exits softly for normal motion, uses independent pending timers, flushes on unmount, and commits immediately under reduced motion.
- Independent design-QA re-review: no remaining actionable findings, score 10/10.

final result: passed
