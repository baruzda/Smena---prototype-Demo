# Migration audit

- `catalog-rules-matrix.md`: placement and match observations mapped; product certainty remains provisional where the source is code-derived.
- `availability-rules.md`: availability marker and employee shift placement mapped.
- `card-style-matrix.md`: service, employee-shift, my-task, skeleton and message visual contracts mapped.
- Current components: `TaskCard`, `EmployeeShiftCard`, `MyTaskCard`, `TaskMessageCard`, `NoTasksForDayCard`, `TaskSkeletonCard`, favorite cards are registered in component bindings.
- UI states: loading, filtered empty, empty day and partially hidden are registered; error and stale are intentionally marked unimplemented.
- Unmapped: production signing card and external map/search error contract.
- Provisional: `RULE-VARIANT-001` is no longer approved product truth; it points to `OBS-CARD-VARIANT-001` and `OPEN-QUESTION-008`.
- No approved rule was deleted. Open questions 008, 011 and 020 block the corresponding migration decisions.
- No data was removed: legacy sources remain in `migration-map.json`; their status is not deprecated.
