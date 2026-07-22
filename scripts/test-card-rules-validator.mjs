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

function mutateJson(rulesDir, fileName, mutate) {
  const file = path.join(rulesDir, fileName);
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  mutate(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(rulesDir) {
  return spawnSync(process.execPath, [validator, "--rules-dir", rulesDir], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function expectPass(name, prepare = () => {}) {
  const fixture = createFixture();
  try {
    prepare(fixture.rulesDir);
    const result = run(fixture.rulesDir);
    assert.equal(result.status, 0, `${name}\n${result.stdout}\n${result.stderr}`);
    console.log(`✓ ${name}`);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

function expectFail(name, expectedCategory, prepare) {
  const fixture = createFixture();
  try {
    prepare(fixture.rulesDir);
    const result = run(fixture.rulesDir);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, `${name}: fixture unexpectedly passed`);
    assert.match(output, new RegExp(`\\[${expectedCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`), `${name}\n${output}`);
    console.log(`✓ ${name}`);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

expectPass("baseline registry passes");

expectFail("unknown state is categorized", "dictionary-rules", (rulesDir) => {
  mutateJson(rulesDir, "rules.json", (doc) => {
    doc.rules[0].when.all[0].value = "ghost_state";
  });
});

expectFail("unknown section is categorized", "scenario-surface", (rulesDir) => {
  mutateJson(rulesDir, "scenarios.json", (doc) => {
    doc.scenarios[0].expected.section = "ghost_section";
  });
});

expectFail("missing decision is categorized", "rule-decision", (rulesDir) => {
  mutateJson(rulesDir, "rules.json", (doc) => {
    doc.rules[0].source.decision = "DEC-404";
  });
});

expectFail("scenario outside rule scope is categorized", "rule-scenario", (rulesDir) => {
  mutateJson(rulesDir, "scenarios.json", (doc) => {
    const scenario = doc.scenarios.find((item) => item.id === "SCN-MATCH-001");
    scenario.given.surface = "signing";
  });
});

expectFail("contradictory assertions are categorized", "scenario-assertions", (rulesDir) => {
  mutateJson(rulesDir, "scenarios.json", (doc) => {
    const scenario = doc.scenarios.find((item) => item.id === "SCN-MATCH-001");
    scenario.expected.hiddenContent = ["marker.suitable_for_you"];
  });
});

console.log("Validator fixtures passed: 1 positive, 5 negative.");
