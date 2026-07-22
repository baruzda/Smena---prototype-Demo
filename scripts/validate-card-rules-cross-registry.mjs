import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootArg = process.argv.indexOf("--rules-dir");
const rulesDir = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1]) : path.join(repoRoot, "docs", "card-rules");

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(rulesDir, name), "utf8"));
const list = (value) => Array.isArray(value) ? value : [];
const idSet = (items) => new Set(list(items).map((item) => item.id));
const byId = (items) => new Map(list(items).map((item) => [item.id, item]));
const errors = new Map();

function fail(category, message) {
  if (!errors.has(category)) errors.set(category, []);
  errors.get(category).push(message);
}

function intersection(left, right) {
  const rightSet = new Set(list(right));
  return list(left).filter((item) => rightSet.has(item));
}

function variantsFor(template) {
  return idSet(template?.variants);
}

const dictionary = readJson("dictionary.json");
const templatesDoc = readJson("templates.json");
const contentDoc = readJson("content-elements.json");
const surfacesDoc = readJson("surfaces.json");
const rulesDoc = readJson("rules.json");
const exceptionsDoc = readJson("exceptions.json");
const scenariosDoc = readJson("scenarios.json");
const decisionLog = fs.readFileSync(path.join(rulesDir, "decision-log.md"), "utf8");

const docs = [dictionary, templatesDoc, contentDoc, surfacesDoc, rulesDoc, exceptionsDoc, scenariosDoc];
const versions = new Set(docs.map((doc) => doc.version));
if (versions.size !== 1 || [...versions].some((version) => !Number.isInteger(version))) {
  fail("versions", `Версии реестров должны совпадать и быть целыми: ${[...versions].join(", ")}`);
}

const templates = list(templatesDoc.templates);
const contentElements = list(contentDoc.contentElements);
const surfaces = list(surfacesDoc.surfaces);
const rules = list(rulesDoc.rules);
const exceptions = list(exceptionsDoc.exceptions);
const scenarios = list(scenariosDoc.scenarios);

const templateMap = byId(templates);
const contentMap = byId(contentElements);
const surfaceMap = byId(surfaces);
const ruleMap = byId(rules);
const exceptionMap = byId(exceptions);
const scenarioMap = byId(scenarios);
const markerIds = idSet(dictionary.markers);
const stateIds = idSet(dictionary.states);

for (const template of templates) {
  const variantIds = list(template.variants).map((variant) => variant.id);
  if (new Set(variantIds).size !== variantIds.length) {
    fail("template-variants", `${template.id}: variant id повторяется`);
  }
  for (const variant of list(template.variants)) {
    if (!variant.name) fail("template-variants", `${template.id}.${variant.id}: отсутствует name`);
  }
}

for (const element of contentElements) {
  if (element.id.startsWith("marker.")) {
    const markerId = element.id.slice("marker.".length);
    if (!markerIds.has(markerId)) fail("dictionary-content", `${element.id}: маркер отсутствует в dictionary.json`);
  }
  if (element.required && element.fallback === undefined) {
    fail("content-contract", `${element.id}: обязательный элемент должен явно задавать fallback, включая null`);
  }
}

for (const rule of rules) {
  const scopeTemplates = list(rule.scope?.templates).map((id) => templateMap.get(id)).filter(Boolean);
  const scopeSurfaces = list(rule.scope?.surfaces);

  for (const template of scopeTemplates) {
    const unsupported = scopeSurfaces.filter((surface) => !list(template.supportedSurfaces).includes(surface));
    if (unsupported.length) fail("template-surface", `${rule.id}: ${template.id} не поддерживает ${unsupported.join(", ")}`);
  }

  if (["placement", "order", "surface_visibility"].includes(rule.target?.type)) {
    if (!scopeSurfaces.includes(rule.target.surface)) {
      fail("rule-scope-target", `${rule.id}: target surface ${rule.target.surface} отсутствует в scope.surfaces`);
    }
  }

  if (rule.target?.type === "card_variant") {
    const template = templateMap.get(rule.target.template);
    if (template && !variantsFor(template).has(rule.target.id)) {
      fail("rule-variant", `${rule.id}: неизвестный вариант ${rule.target.template}.${rule.target.id}`);
    }
    if (rule.effect?.action === "set_variant" && rule.effect.value !== rule.target.id) {
      fail("rule-variant", `${rule.id}: effect.value должен совпадать с target.id`);
    }
  }

  for (const condition of [...list(rule.when?.all), ...list(rule.when?.any)]) {
    if (condition.path?.endsWith(".state") && typeof condition.value === "string" && !stateIds.has(condition.value)) {
      fail("dictionary-rules", `${rule.id}: неизвестное состояние ${condition.value}`);
    }
    if (condition.path?.endsWith(".state") && Array.isArray(condition.value)) {
      for (const value of condition.value) if (!stateIds.has(value)) fail("dictionary-rules", `${rule.id}: неизвестное состояние ${value}`);
    }
  }

  const decision = rule.source?.decision;
  if (decision && !decisionLog.includes(`## ${decision}`)) {
    fail("rule-decision", `${rule.id}: решение ${decision} отсутствует в decision-log.md`);
  }

  for (const scenarioId of list(rule.tests)) {
    const scenario = scenarioMap.get(scenarioId);
    if (!scenario) continue;
    const appliedRules = list(scenario.expected?.appliedRules);
    const appliedExceptions = list(scenario.expected?.appliedExceptions);
    const coversRule = appliedRules.includes(rule.id) || intersection(appliedExceptions, rule.exceptions).length > 0;
    if (!coversRule) fail("rule-scenario", `${rule.id}: сценарий ${scenarioId} не подтверждает правило или его исключение`);
  }
}

for (const exception of exceptions) {
  const baseRule = ruleMap.get(exception.baseRule);
  if (!baseRule) continue;
  if (exception.priority < baseRule.priority) {
    fail("rule-exception", `${exception.id}: priority ${exception.priority} ниже базового ${baseRule.priority}`);
  }
  if (!list(baseRule.exceptions).includes(exception.id)) {
    fail("rule-exception", `${exception.id}: отсутствует обратная ссылка из ${baseRule.id}`);
  }
  if (exception.override?.variant) {
    const valid = list(baseRule.scope?.templates).some((templateId) => variantsFor(templateMap.get(templateId)).has(exception.override.variant));
    if (!valid) fail("exception-variant", `${exception.id}: неизвестный override.variant ${exception.override.variant}`);
  }
  if (exception.override?.surface) {
    const surface = surfaceMap.get(exception.override.surface);
    const sections = idSet(surface?.sections);
    if (!surface || (exception.override.section && !sections.has(exception.override.section))) {
      fail("exception-placement", `${exception.id}: неизвестное размещение ${exception.override.surface}.${exception.override.section ?? ""}`);
    }
  }
}

for (const scenario of scenarios) {
  const expected = scenario.expected ?? {};
  const surface = surfaceMap.get(scenario.given?.surface);
  const sectionIds = idSet(surface?.sections);

  if (surface) {
    for (const section of [expected.section, ...list(expected.notInSections)].filter(Boolean)) {
      if (!sectionIds.has(section)) fail("scenario-surface", `${scenario.id}: секция ${scenario.given.surface}.${section} отсутствует`);
    }
  }

  const contentOverlap = intersection(expected.visibleContent, expected.hiddenContent);
  if (contentOverlap.length) fail("scenario-assertions", `${scenario.id}: контент одновременно видим и скрыт: ${contentOverlap.join(", ")}`);
  const actionOverlap = intersection(expected.enabledActions, expected.disabledActions);
  if (actionOverlap.length) fail("scenario-assertions", `${scenario.id}: действие одновременно enabled и disabled: ${actionOverlap.join(", ")}`);

  if (expected.template && expected.variant) {
    const template = templateMap.get(expected.template);
    if (template && !variantsFor(template).has(expected.variant)) {
      fail("scenario-variant", `${scenario.id}: ${expected.variant} отсутствует в ${expected.template}`);
    }
  } else if (expected.variant) {
    const variantCovered = list(expected.appliedRules).some((ruleId) => ruleMap.get(ruleId)?.target?.type === "card_variant" && ruleMap.get(ruleId).target.id === expected.variant)
      || list(expected.appliedExceptions).some((exceptionId) => exceptionMap.get(exceptionId)?.override?.variant === expected.variant);
    if (!variantCovered) fail("scenario-variant", `${scenario.id}: вариант ${expected.variant} не связан с применённым правилом`);
  }

  for (const exceptionId of list(expected.appliedExceptions)) {
    const exception = exceptionMap.get(exceptionId);
    if (exception && !ruleMap.get(exception.baseRule)?.tests?.includes(scenario.id)) {
      fail("scenario-exception", `${scenario.id}: не указан в tests базового правила ${exception.baseRule}`);
    }
  }

  for (const elementId of [...list(expected.visibleContent), ...list(expected.hiddenContent), ...list(expected.enabledActions), ...list(expected.disabledActions)]) {
    if (!contentMap.has(elementId)) fail("scenario-content", `${scenario.id}: неизвестный content element ${elementId}`);
  }
}

if (errors.size) {
  console.error("Cross-registry validation failed:");
  for (const [category, messages] of [...errors.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.error(`\n[${category}]`);
    for (const message of messages) console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`Cross-registry связи валидны: ${rules.length} правил, ${exceptions.length} исключений, ${scenarios.length} сценариев.`);
