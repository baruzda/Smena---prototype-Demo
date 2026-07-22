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

pass("valid-current-registry");
pass("valid-minimal", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules[0].name = "Минимально проверяемое правило"; }));
pass("valid-provisional-rule", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules.find((item) => item.id === "RULE-VARIANT-001").name = "Проверяемое provisional правило"; }));
pass("valid-marker-with-structural-variant", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules.find((item) => item.id === "RULE-SPECIAL-001").otherwise = { action: "set_variant", value: "default" }; }));
pass("valid-legacy-migration", (dir) => mutate(dir, "migration-map.json", (doc) => { doc.sources[0].status = "partially_mapped"; }));

fail("duplicate-id", "SCHEMA_ERROR", "RULE-PLACEMENT-001", (dir) => mutate(dir, "rules.json", (doc) => doc.rules.push({ ...doc.rules[0] })));
fail("unknown-reference", "REFERENCE_ERROR", "RULE-PLACEMENT-001", (dir) => mutate(dir, "rules.json", (doc) => { doc.rules[0].scope.templates = ["ghost_template"]; }));
fail("provisional-without-question", "APPROVAL_ERROR", "RULE-VARIANT-001", (dir) => mutate(dir, "rules.json", (doc) => { delete doc.rules.find((rule) => rule.id === "RULE-VARIANT-001").relatedQuestion; }));
fail("approved-with-blocking-question", "APPROVAL_ERROR", "RULE-VARIANT-001", (dir) => mutate(dir, "rules.json", (doc) => { const rule = doc.rules.find((item) => item.id === "RULE-VARIANT-001"); rule.status = "approved"; }));
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

console.log("Validator fixtures passed: 5 valid, 17 invalid.");
