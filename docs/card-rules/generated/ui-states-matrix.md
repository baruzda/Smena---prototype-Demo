# UI states

| ID | Surface | Implementation | Status |
| --- | --- | --- | --- |
| catalog.empty_day | tasks | NoTasksForDayCard | implemented |
| catalog.error | tasks | - | not_implemented |
| catalog.filtered_empty | tasks | TaskMessageCard | implemented |
| catalog.loading | tasks | TimelineLoadingState / task-skeleton-* | implemented |
| catalog.partially_hidden | tasks | TaskMessageCard | implemented |
| catalog.stale | tasks | - | not_implemented |
| hidden_services.message | tasks | TaskMessageCard | implemented |
| service_offer.skeleton | tasks | TaskSkeletonCard | implemented |
