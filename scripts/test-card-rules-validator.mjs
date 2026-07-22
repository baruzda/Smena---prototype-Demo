import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRulesDir = path.join(repoRoot, "docs", "card-rules");
const validator = path.join(repoRoot, "scripts", "validate-card-rules-cross-registry.mjs");

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "card-rules-fixture-"));
  const rulesDir = path.join(root, "card-rules");
  fs.cpSync(sourceRulesDir, rulesDir, { recursive: true });
  return { root, rulesDir };
}
function mutate(rulesDir, fileName, callback) {
  const file = path.join(rulesDir, fileName);
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  callback(doc);
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
}
function run(rulesDir) {
  return spawnSync(process.execPath, [validator, "--rules-dir", rulesDir], { cwd: repoRoot, encoding: "utf8" });
}
function pass(name, callback = () => {}) {
  const fixture = createFixture();
  try { callback(fixture.rulesDir); const result = run(fixture.rulesDir); assert.equal(result.status, 0, `${name}\n${result.stderr}`); console.log(`✓ ${name}`); }
  finally { fs.rmSync(fixture.root, { recursive: true, force: true }); }
}
function fail(name, category, id, callback) {
  const fixture = createFixture();
  try {
    callback(fixture.rulesDir);
    const result = run(fixture.rulesDir); const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, `${name}: fixture unexpectedly passed`);
    assert.match(output, new RegExp(`\\[${category}\\]`), `${name}\n${output}`);
    assert.match(output, new RegExp(id), `${name}\n${output}`);
    console.log(`✓ ${name}`);
  } finally { fs.rmSync(fixture.root, { recursive: true, force: true }); }
}

function prepareMinimal(dir) {
  mutate(dir, "dictionary.json", (doc) => Object.assign(doc, {
    entities: [{ id: "service_offer" }], states: [{ id: "available" }], markers: [{ id: "suitable_for_you" }],
    actions: ["place", "remove_from_surface"], surfaces: [{ id: "tasks" }], operators: ["equals"],
    ruleStatuses: ["active", "provisional"], targetTypes: ["placement"],
  }));
  mutate(dir, "state-dimensions.json", (doc) => Object.assign(doc, { availabilityStates: ["available"], participationStates: ["not_started"], signingStates: ["not_required"], legacyStateMigration: [] }));
  mutate(dir, "templates.json", (doc) => { doc.templates = [{ id: "service_offer_card", entity: "service_offer", name: "Service", slots: ["title"], supportedSurfaces: ["tasks"], variants: [{ id: "default", name: "Default" }] }]; });
  mutate(dir, "content-elements.json", (doc) => { doc.contentElements = [{ id: "service.title", name: "Title", slot: "title", source: "service.title", required: true, fallback: null, templates: ["service_offer_card"] }]; });
  mutate(dir, "surfaces.json", (doc) => { doc.surfaces = [{ id: "tasks", name: "Tasks", sections: [{ id: "available", name: "Available", order: 100 }] }]; });
  mutate(dir, "rules.json", (doc) => { doc.rules = [{ id: "RULE-MINIMAL-001", name: "Minimal placement", status: "active", scope: { entity: "service_offer", surfaces: ["tasks"], templates: ["service_offer_card"] }, target: { type: "placement", surface: "tasks", section: "available" }, when: { all: [{ path: "service.state", operator: "equals", value: "available" }] }, effect: { action: "place" }, otherwise: { action: "remove_from_surface" }, priority: 700, exceptions: [], supersedes: [], source: { documents: ["minimal.md"] }, tests: ["SCN-MINIMAL-001"] }]; });
  mutate(dir, "exceptions.json", (doc) => { doc.exceptions = []; });
  mutate(dir, "precedence.json", (doc) => Object.assign(doc, { levels: [{ priority: 700, id: "surface", name: "Surface" }], resolutionPolicy: ["Higher priority first"] }));
  mutate(dir, "variant-resolution.json", (doc) => Object.assign(doc, { defaultVariant: "default", variants: [] }));
  mutate(dir, "ui-states.json", (doc) => { doc.uiStates = []; });
  mutate(dir, "implementation-observations.json", (doc) => { doc.observations = []; });
  mutate(dir, "open-questions.json", (doc) => { doc.questions = []; });
  mutate(dir, "scenarios.json", (doc) => { doc.scenarios = [{ id: "SCN-MINIMAL-001", name: "Minimal", given: { surface: "tasks" }, expected: { template: "service_offer_card", variant: "default", section: "available", appliedRules: ["RULE-MINIMAL-001"] }, executionStatus: "declarative" }]; });
  mutate(dir, "component-bindings.json", (doc) => Object.assign(doc, { templates: { service_offer_card: { currentComponent: "TaskCard", currentSource: "src/App.jsx", targetComponent: "ServiceOfferCard", migrationStatus: "legacy" } }, contentElements: {}, uiStates: {} }));
  mutate(dir, "migration-map.json", (doc) => { doc.sources = [{ legacySource: "minimal.md", relatedRules: ["RULE-MINIMAL-001"], relatedScenarios: ["SCN-MINIMAL-001"], relatedTemplates: ["service_offer_card"], relatedUiStates: [], currentImplementation: ["src/App.jsx"], status: "mapped", unmappedContent: [], notes: [] }]; });
}

pass("valid-current-registry");
pass("valid-minimal", prepareMinimal);
pass("valid-provisional-rule", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules.find((item) => item.id === "RULE-VARIANT-001").name = "Проверяемое provisional правило"; }));
pass("valid-marker-with-structural-variant", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules.find((item) => item.id === "RULE-SPECIAL-001").otherwise = { action: "set_variant", value: "default" }; }));
pass("valid-legacy-migration", (dir) => mutate(dir, "migration-map.json", (doc) => { doc.sources[0].status = "partially_mapped"; }));

fail("duplicate-id", "SCHEMA_ERROR", "RULE-PLACEMENT-001", (dir) => mutate(dir, "rules.json", (doc) => doc.rules.push({ ...doc.rules[0] })));
fail("unknown-reference", "REFERENCE_ERROR", "RULE-PLACEMENT-001", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules[0].scope.templates = ["ghost_template"]; }));
fail("provisional-without-question", "APPROVAL_ERROR", "RULE-VARIANT-001", (dir) => mutate(dir, "rules.json", (doc) => { delete doc.rules.find((rule) => rule.id === "RULE-VARIANT-001").relatedQuestion; }));
fail("approved-with-blocking-question", "APPROVAL_ERROR", "RULE-PLACEMENT-001", (dir) => mutate(dir, "rules.json", (doc) => { const rule = doc.rules.find((item) => item.id === "RULE-PLACEMENT-001"); rule.relatedQuestion = "OPEN-QUESTION-008"; }));
fail("question-missing-backlink", "QUESTION_LINK_ERROR", "OPEN-QUESTION-008", (dir) => mutate(dir, "open-questions.json", (doc) => { doc.questions.find((item) => item.id === "OPEN-QUESTION-008").relatedRules = []; }));
fail("marker-as-structural-variant", "VARIANT_CONFLICT", "RULE-VARIANT-001", (dir) => mutate(dir, "rules.json", (doc) => { const rule = doc.rules.find((item) => item.id === "RULE-VARIANT-001"); rule.target = { type: "card_variant", template: "service_offer_card", id: "marker.suitable_for_you" }; rule.effect = { action: "set_variant", value: "marker.suitable_for_you" }; rule.otherwise = { action: "set_variant", value: "default" }; }));
fail("variant-otherwise-default", "VARIANT_CONFLICT", "RULE-SPECIAL-001", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules.find((item) => item.id === "RULE-SPECIAL-001").otherwise = { action: "no_op" }; }));
fail("variant-priority-conflict", "VARIANT_CONFLICT", "service_offer_card", (dir) => mutate(dir, "variant-resolution.json", (doc) => { doc.variants[1].priority = doc.variants[0].priority; }));
fail("ui-state-in-business-state", "UI_STATE_ERROR", "catalog.loading", (dir) => mutate(dir, "dictionary.json", (doc) => { doc.states.push("catalog.loading"); }));
fail("unsupported-surface", "SURFACE_CONFLICT", "RULE-PLACEMENT-001", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules[0].scope.surfaces = ["signing"]; }));
fail("wrong-surface-section", "SURFACE_CONFLICT", "SCN-CATALOG-001", (dir) => mutate(dir, "scenarios.json", (doc) => { doc.scenarios.find((item) => item.id === "SCN-CATALOG-001").expected.section = "ghost_section"; }));
fail("binding-unknown-template", "BINDING_ERROR", "ghost_template", (dir) => mutate(dir, "component-bindings.json", (doc) => { doc.templates.ghost_template = {}; }));
fail("binding-verified-missing-source", "BINDING_ERROR", "service_offer_card", (dir) => mutate(dir, "component-bindings.json", (doc) => { const binding = doc.templates.service_offer_card; binding.migrationStatus = "verified"; binding.currentSource = null; }));
fail("migration-deprecated-before-verified", "MIGRATION_GAP", "docs/catalog-rules-matrix.md", (dir) => mutate(dir, "migration-map.json", (doc) => { const source = doc.sources[0]; source.status = "deprecated"; delete source.verifiedBeforeDeprecation; }));
fail("migration-verified-without-evidence", "MIGRATION_GAP", "docs/catalog-rules-matrix.md", (dir) => mutate(dir, "migration-map.json", (doc) => { const source = doc.sources[0]; source.status = "verified"; delete source.evidence; }));
fail("scenario-without-execution-status", "SCENARIO_ERROR", "SCN-CATALOG-001", (dir) => mutate(dir, "scenarios.json", (doc) => { delete doc.scenarios.find((item) => item.id === "SCN-CATALOG-001").executionStatus; }));
fail("scenario-verified-without-test", "SCENARIO_ERROR", "SCN-CATALOG-001", (dir) => mutate(dir, "scenarios.json", (doc) => { doc.scenarios.find((item) => item.id === "SCN-CATALOG-001").executionStatus = "verified"; }));
fail("observation-without-question", "OBSERVATION_ERROR", "OBS-CARD-VARIANT-001", (dir) => mutate(dir, "implementation-observations.json", (doc) => { delete doc.observations[0].relatedQuestion; }));

console.log("Validator fixtures passed: 5 valid, 18 invalid.");
