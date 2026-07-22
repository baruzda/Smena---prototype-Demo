# Покрытие validator harness

| Category | Validator check | Fixture | Result |
| --- | --- | --- | --- |
| `SCHEMA_ERROR` | Повторяющийся registry ID | `duplicate-id` | covered |
| `REFERENCE_ERROR` | Неизвестный template/state/decision | `unknown-reference` | covered |
| `APPROVAL_ERROR` | Provisional без вопроса; approved с blocking-вопросом | `provisional-without-question`, `approved-with-blocking-question` | covered |
| `QUESTION_LINK_ERROR` | Обратная ссылка вопроса и правила | `question-missing-backlink` | covered |
| `VARIANT_CONFLICT` | Marker как structural variant, fallback и приоритеты | `marker-as-structural-variant`, `variant-otherwise-default`, `variant-priority-conflict` | covered |
| `STATE_CONFLICT` | Конфликты бизнес-состояний в scope | — | not yet covered: правило пока не имеет отдельной state-conflict проверки |
| `SURFACE_CONFLICT` | Неподдерживаемая поверхность и секция | `unsupported-surface`, `wrong-surface-section` | covered |
| `UI_STATE_ERROR` | UI state в перечне бизнес-состояний | `ui-state-in-business-state` | covered |
| `BINDING_ERROR` | Неизвестный template и verified binding без source | `binding-unknown-template`, `binding-verified-missing-source` | covered |
| `MIGRATION_GAP` | Deprecated до verification; verified без evidence | `migration-deprecated-before-verified`, `migration-verified-without-evidence` | covered |
| `SCENARIO_ERROR` | Отсутствует execution status или evidence verified-сценария | `scenario-without-execution-status`, `scenario-verified-without-test` | covered |
| `OBSERVATION_ERROR` | Unresolved observation без product question | `observation-without-question` | covered |
| `GENERATED_ERROR` | Стабильность generated reports | — | not yet covered: reports проверяются детерминированным smoke test `test:card-rules-validator` |

`test:card-rules` запускает isolated fixtures. `test:card-rules-validator` сохраняет исходный smoke test: два запуска основного генератора должны иметь одинаковый результат.
