import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const fail = (message) => {
  throw new Error(`Card component coverage failed: ${message}`);
};

const bindings = readJson("docs/card-rules/component-bindings.json");
const templates = readJson("docs/card-rules/templates.json").templates;
const uiStates = readJson("docs/card-rules/ui-states.json").uiStates;
const scenarios = readJson("docs/card-rules/scenarios.json").scenarios;
const rules = readJson("docs/card-rules/rules.json").rules;
const exceptions = readJson("docs/card-rules/exceptions.json").exceptions;
const migration = readJson("docs/card-rules/migration-map.json").sources;
const resolverTests = fs.readFileSync(path.join(root, "tests/service-offer-presentation.test.mjs"), "utf8");
const e2eTests = fs.readFileSync(path.join(root, "tests/app.spec.mjs"), "utf8");
const appSource = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const globalStyles = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");

for (const template of templates) {
  const binding = bindings.templates[template.id];
  if (!binding) fail(`${template.id} has no component binding`);
  if (!["planned", "migrated", "verified"].includes(binding.migrationStatus)) {
    fail(`${template.id} retains dishonest status ${binding.migrationStatus}`);
  }
  if (["migrated", "verified"].includes(binding.migrationStatus)) {
    if (!binding.currentSource || !fs.existsSync(path.join(root, binding.currentSource))) {
      fail(`${template.id} points to missing runtime source ${binding.currentSource}`);
    }
    const source = fs.readFileSync(path.join(root, binding.currentSource), "utf8");
    if (!source.includes(binding.currentComponent)) fail(`${template.id} source does not export ${binding.currentComponent}`);
  }
}

for (const uiState of uiStates) {
  const binding = bindings.uiStates[uiState.id];
  if (!binding) fail(`${uiState.id} has no component binding`);
  if (binding.migrationStatus === "planned") continue;
  if (!binding.currentSource || !fs.existsSync(path.join(root, binding.currentSource))) {
    fail(`${uiState.id} points to missing runtime source ${binding.currentSource}`);
  }
  const source = fs.readFileSync(path.join(root, binding.currentSource), "utf8");
  if (!source.includes(binding.currentComponent)) fail(`${uiState.id} source does not export ${binding.currentComponent}`);
}

for (const rule of rules.filter((item) => item.status === "active")) {
  if (!resolverTests.includes(rule.id)) fail(`${rule.id} has no resolver test evidence`);
}

for (const exception of exceptions.filter((item) => item.status === "active")) {
  if (!resolverTests.includes(exception.id)) fail(`${exception.id} has no resolver test evidence`);
}

for (const scenario of scenarios.filter((item) => item.executionStatus === "verified")) {
  const evidencePath = path.join(root, scenario.testEvidence);
  if (!fs.existsSync(evidencePath)) fail(`${scenario.id} points to missing test evidence`);
  if (!fs.readFileSync(evidencePath, "utf8").includes(scenario.id)) {
    fail(`${scenario.id} is marked verified but its evidence does not identify the scenario`);
  }
}

const variantSnapshotDir = path.join(root, "tests/card-variants.visual.spec.mjs-snapshots");
for (const template of templates) {
  for (const variant of template.variants) {
    const snapshotName = `${template.id.replaceAll("_", "-")}--${variant.id.replaceAll("_", "-")}.png`;
    if (!fs.existsSync(path.join(variantSnapshotDir, snapshotName))) {
      fail(`${template.id}:${variant.id} has no visual snapshot`);
    }
  }
}

const surfaceEvidence = {
  tasks: "Список заданий",
  my_tasks: "Мои задания",
  favorites: "Избранное",
  signing: "Задания на подписание",
};
for (const [surface, evidence] of Object.entries(surfaceEvidence)) {
  if (!e2eTests.includes(evidence)) fail(`${surface} has no E2E evidence`);
}

if (migration.length < 7) fail("legacy migration entries were lost");
for (const entry of migration) {
  if (entry.status === "deprecated" && (!entry.verifiedBeforeDeprecation || !entry.evidence?.length)) {
    fail(`${entry.legacySource} was deprecated before verified evidence`);
  }
}

for (const legacyFunction of ["TaskCard", "MyTaskCard", "EmployeeShiftCard", "TaskMessageCard", "NoTasksForDayCard", "TaskSkeletonCard"]) {
  if (new RegExp(`function\\s+${legacyFunction}\\b`).test(appSource)) fail(`${legacyFunction} remains in App.jsx`);
}

for (const legacySelector of [".gig-task-", ".my-task-", ".employee-shift-", ".task-message-", ".task-skeleton-", ".favorite-store-", ".favorite-collection-"]) {
  if (globalStyles.includes(legacySelector)) fail(`${legacySelector} remains in global styles`);
}

console.log(`Card component coverage valid: ${templates.length} templates, ${uiStates.length} UI states, ${rules.filter((rule) => rule.status === "active").length} active rules, ${exceptions.filter((exception) => exception.status === "active").length} active exceptions, ${scenarios.filter((scenario) => scenario.executionStatus === "verified").length} verified scenarios.`);
