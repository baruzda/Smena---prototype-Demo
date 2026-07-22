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
const questionsDoc = readJson("open-questions.json");
const bindingsDoc = readJson("component-bindings.json");
const migrationDoc = readJson("migration-map.json");
const observationsDoc = readJson("implementation-observations.json");
const uiStatesDoc = readJson("ui-states.json");
const resolutionDoc = readJson("variant-resolution.json");
const decisionLog = fs.readFileSync(path.join(rulesDir, "decision-log.md"), "utf8");

const docs = [dictionary, templatesDoc, contentDoc, surfacesDoc, rulesDoc, exceptionsDoc, scenariosDoc, questionsDoc, bindingsDoc, migrationDoc, observationsDoc, uiStatesDoc, resolutionDoc];
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
const questionMap = byId(questionsDoc.questions);
const uiStateIds = idSet(uiStatesDoc.uiStates);
const observationMap = byId(observationsDoc.observations);

for (const [name, items] of [["rules", rules], ["templates", templates], ["scenarios", scenarios], ["questions", questionsDoc.questions], ["observations", observationsDoc.observations], ["ui states", uiStatesDoc.uiStates]]) {
  const ids = list(items).map((item) => item.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) fail("SCHEMA_ERROR", `${name}: duplicate id ${duplicate}`);
}

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
  for (const templateId of list(rule.scope?.templates)) {
    if (!templateMap.has(templateId)) fail("REFERENCE_ERROR", `${rule.id}: unknown template ${templateId}`);
  }
  const scopeTemplates = list(rule.scope?.templates).map((id) => templateMap.get(id)).filter(Boolean);
  const scopeSurfaces = list(rule.scope?.surfaces);

  for (const template of scopeTemplates) {
    const unsupported = scopeSurfaces.filter((surface) => !list(template.supportedSurfaces).includes(surface));
    if (unsupported.length) fail("SURFACE_CONFLICT", `${rule.id}: ${template.id} не поддерживает ${unsupported.join(", ")}`);
  }

  if (["placement", "order", "surface_visibility"].includes(rule.target?.type)) {
    if (!scopeSurfaces.includes(rule.target.surface)) {
      fail("SURFACE_CONFLICT", `${rule.id}: target surface ${rule.target.surface} отсутствует в scope.surfaces`);
    }
  }

  if (rule.target?.type === "card_variant") {
    const template = templateMap.get(rule.target.template);
    if (template && !variantsFor(template).has(rule.target.id)) {
      fail("VARIANT_CONFLICT", `${rule.id}: неизвестный вариант ${rule.target.template}.${rule.target.id}`);
    }
    if (rule.effect?.action === "set_variant" && rule.effect.value !== rule.target.id) {
      fail("VARIANT_CONFLICT", `${rule.id}: effect.value должен совпадать с target.id`);
    }
  }

  for (const condition of [...list(rule.when?.all), ...list(rule.when?.any)]) {
    if (condition.path?.endsWith(".state") && typeof condition.value === "string" && !stateIds.has(condition.value)) {
      fail("REFERENCE_ERROR", `${rule.id}: неизвестное состояние ${condition.value}`);
    }
    if (condition.path?.endsWith(".state") && Array.isArray(condition.value)) {
      for (const value of condition.value) if (!stateIds.has(value)) fail("REFERENCE_ERROR", `${rule.id}: неизвестное состояние ${value}`);
    }
  }

  const decision = rule.source?.decision;
  if (decision && !decisionLog.includes(`## ${decision}`)) {
      fail("REFERENCE_ERROR", `${rule.id}: решение ${decision} отсутствует в decision-log.md`);
  }

  for (const scenarioId of list(rule.tests)) {
    const scenario = scenarioMap.get(scenarioId);
    if (!scenario) continue;
    const scenarioSurface = scenario.given?.surface;
    if (scenarioSurface && !scopeSurfaces.includes(scenarioSurface)) {
      fail("SURFACE_CONFLICT", `${rule.id}: сценарий ${scenarioId} использует поверхность ${scenarioSurface} вне scope`);
    }
  }

  if (rule.status === "provisional" && !rule.relatedQuestion) fail("APPROVAL_ERROR", `${rule.id}: provisional rule requires relatedQuestion`);
  if (rule.status === "approved" && rule.relatedQuestion && questionMap.get(rule.relatedQuestion)?.blocking) fail("APPROVAL_ERROR", `${rule.id}: approved rule links blocking question ${rule.relatedQuestion}`);
  if (rule.target?.type === "card_variant" && rule.target.id?.startsWith("marker.")) fail("VARIANT_CONFLICT", `${rule.id}: marker cannot be a structural variant`);
  if (rule.target?.type === "card_variant" && rule.otherwise?.action !== "set_variant") fail("VARIANT_CONFLICT", `${rule.id}: structural variant requires otherwise default`);
}

for (const question of list(questionsDoc.questions)) {
  for (const ruleId of list(question.relatedRules)) {
    const rule = ruleMap.get(ruleId);
    if (!rule || rule.relatedQuestion !== question.id) fail("QUESTION_LINK_ERROR", `${question.id}: missing backlink from ${ruleId}`);
  }
}
for (const rule of rules) {
  if (rule.relatedQuestion && !list(questionMap.get(rule.relatedQuestion)?.relatedRules).includes(rule.id)) {
    fail("QUESTION_LINK_ERROR", `${rule.relatedQuestion}: missing backlink for ${rule.id}`);
  }
}

for (const entry of list(resolutionDoc.variants)) {
  if (!templateMap.has(entry.template)) fail("REFERENCE_ERROR", `${entry.id ?? entry.template}: unknown variant template`);
}
const resolutionByTemplate = new Map();
for (const entry of list(resolutionDoc.variants)) {
  const entries = resolutionByTemplate.get(entry.template) ?? [];
  entries.push(entry);
  resolutionByTemplate.set(entry.template, entries);
}
for (const [templateId, entries] of resolutionByTemplate) {
  const priorities = entries.map((entry) => entry.priority);
  if (new Set(priorities).size !== priorities.length) fail("VARIANT_CONFLICT", `${templateId}: variant priorities conflict`);
}

for (const state of list(dictionary.states)) {
  if (uiStateIds.has(state.id ?? state)) fail("UI_STATE_ERROR", `${state.id ?? state}: UI state cannot be a business state`);
}

for (const [templateId, binding] of Object.entries(bindingsDoc.templates ?? {})) {
  if (!templateMap.has(templateId)) fail("BINDING_ERROR", `${templateId}: binding references unknown template`);
  if (binding.migrationStatus === "verified" && !binding.currentSource) fail("BINDING_ERROR", `${templateId}: verified binding requires currentSource`);
}

for (const source of list(migrationDoc.sources)) {
  if (source.status === "deprecated" && !source.verifiedBeforeDeprecation) fail("MIGRATION_GAP", `${source.legacySource}: deprecated before verified`);
  if (source.status === "verified" && !list(source.evidence).length) fail("MIGRATION_GAP", `${source.legacySource}: verified migration requires evidence`);
}

for (const observation of list(observationsDoc.observations)) {
  if (observation.approvalStatus === "unresolved" && !observation.relatedQuestion) fail("OBSERVATION_ERROR", `${observation.id}: unresolved observation requires relatedQuestion`);
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
      if (!sectionIds.has(section)) fail("SURFACE_CONFLICT", `${scenario.id}: секция ${scenario.given.surface}.${section} отсутствует`);
    }
  }

  const contentOverlap = intersection(expected.visibleContent, expected.hiddenContent);
  if (contentOverlap.length) fail("SCENARIO_ERROR", `${scenario.id}: контент одновременно видим и скрыт: ${contentOverlap.join(", ")}`);
  const actionOverlap = intersection(expected.enabledActions, expected.disabledActions);
  if (actionOverlap.length) fail("SCENARIO_ERROR", `${scenario.id}: действие одновременно enabled и disabled: ${actionOverlap.join(", ")}`);
  if (!scenario.executionStatus) fail("SCENARIO_ERROR", `${scenario.id}: executionStatus is required`);
  if (scenario.executionStatus === "verified" && !scenario.testEvidence) fail("SCENARIO_ERROR", `${scenario.id}: verified scenario requires testEvidence`);

  if (expected.template && expected.variant) {
    const template = templateMap.get(expected.template);
    if (template && !variantsFor(template).has(expected.variant)) {
      fail("scenario-variant", `${scenario.id}: ${expected.variant} отсутствует в ${expected.template}`);
    }
  } else if (expected.variant) {
    const variantCovered = list(expected.appliedRules).some((ruleId) => ruleMap.get(ruleId)?.target?.type === "card_variant" && ruleMap.get(ruleId).target.id === expected.variant)
      || (expected.variant === "match" && list(expected.appliedRules).some((ruleId) => ruleMap.get(ruleId)?.target?.id === "marker.suitable_for_you"))
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
