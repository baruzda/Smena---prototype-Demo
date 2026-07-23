import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

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
const stateDimensionsDoc = readJson("state-dimensions.json");
const precedenceDoc = readJson("precedence.json");
const decisionLog = fs.readFileSync(path.join(rulesDir, "decision-log.md"), "utf8");

const registryDocuments = new Map([
  ["dictionary", dictionary], ["state-dimensions", stateDimensionsDoc], ["templates", templatesDoc],
  ["content-elements", contentDoc], ["surfaces", surfacesDoc], ["rules", rulesDoc],
  ["exceptions", exceptionsDoc], ["precedence", precedenceDoc], ["variant-resolution", resolutionDoc],
  ["ui-states", uiStatesDoc], ["implementation-observations", observationsDoc],
  ["open-questions", questionsDoc], ["scenarios", scenariosDoc],
  ["component-bindings", bindingsDoc], ["migration-map", migrationDoc],
]);
const schemasDir = path.join(rulesDir, "schemas");
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(JSON.parse(fs.readFileSync(path.join(schemasDir, "registry-definitions.schema.json"), "utf8")));
for (const file of fs.readdirSync(rulesDir).filter((name) => name.endsWith(".json"))) {
  const registryName = file.slice(0, -".json".length);
  if (!registryDocuments.has(registryName)) fail("SCHEMA_ERROR", `${file}: registry is not declared in the schema manifest`);
}
for (const [name, document] of registryDocuments) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, `${name}.schema.json`), "utf8"));
  const validate = ajv.compile(schema);
  if (!validate(document)) {
    for (const error of validate.errors ?? []) {
      fail("SCHEMA_ERROR", `${name}.json${error.instancePath || "/"}: ${error.message}`);
    }
  }
}

const docs = [...registryDocuments.values()];
const versions = new Set(docs.map((doc) => doc.version));
if (versions.size !== 1 || [...versions].some((version) => !Number.isInteger(version))) {
  fail("SCHEMA_ERROR", `registry versions must match and be integers: ${[...versions].join(", ")}`);
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
    fail("SCHEMA_ERROR", `${template.id}: duplicate variant id`);
  }
  for (const variant of list(template.variants)) {
    if (!variant.name) fail("SCHEMA_ERROR", `${template.id}.${variant.id}: missing name`);
  }
}

for (const element of contentElements) {
  if (element.id.startsWith("marker.")) {
    const markerId = element.id.slice("marker.".length);
    if (!markerIds.has(markerId)) fail("REFERENCE_ERROR", `${element.id}: marker is absent from dictionary.json`);
  }
  if (element.required && element.fallback === undefined) {
    fail("SCHEMA_ERROR", `${element.id}: required content must declare fallback, including null`);
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
  if (rule.status === "provisional" && questionMap.get(rule.relatedQuestion)?.status !== "unresolved") fail("APPROVAL_ERROR", `${rule.id}: provisional rule requires an unresolved question`);
  if (rule.status === "active" && rule.relatedQuestion && questionMap.get(rule.relatedQuestion)?.blocking) fail("APPROVAL_ERROR", `${rule.id}: approved rule links blocking question ${rule.relatedQuestion}`);
  if (rule.status === "active" && rule.source?.observation) fail("APPROVAL_ERROR", `${rule.id}: approved rule cannot use an observation as product truth`);
  if (rule.status === "active" && rule.source?.code && !list(rule.source?.documents).length) fail("APPROVAL_ERROR", `${rule.id}: code-only rule must remain provisional`);
  if (rule.target?.type === "card_variant" && rule.target.id?.startsWith("marker.")) fail("VARIANT_CONFLICT", `${rule.id}: marker cannot be a structural variant`);
  if (rule.target?.type === "card_variant" && rule.otherwise?.action !== "set_variant") fail("VARIANT_CONFLICT", `${rule.id}: structural variant requires otherwise default`);
  if (rule.target?.type === "card_variant" && rule.otherwise?.action === "set_variant" && rule.otherwise.value !== resolutionDoc.defaultVariant) fail("VARIANT_CONFLICT", `${rule.id}: otherwise must resolve to ${resolutionDoc.defaultVariant}`);
}

for (const question of list(questionsDoc.questions)) {
  for (const ruleId of list(question.relatedRules)) {
    const rule = ruleMap.get(ruleId);
    if (!rule || rule.relatedQuestion !== question.id) fail("QUESTION_LINK_ERROR", `${question.id}: missing backlink from ${ruleId}`);
  }
  for (const observationId of list(question.relatedObservations)) {
    const observation = observationMap.get(observationId);
    if (!observation || observation.relatedQuestion !== question.id) fail("QUESTION_LINK_ERROR", `${question.id}: missing observation backlink from ${observationId}`);
  }
  for (const exceptionId of list(question.relatedExceptions)) {
    const exception = exceptionMap.get(exceptionId);
    if (!exception) fail("REFERENCE_ERROR", `${question.id}: unknown exception ${exceptionId}`);
    else if (exception.relatedQuestion !== question.id) fail("QUESTION_LINK_ERROR", `${question.id}: missing exception backlink from ${exceptionId}`);
  }
  for (const scenarioId of list(question.relatedScenarios)) if (!scenarioMap.has(scenarioId)) fail("REFERENCE_ERROR", `${question.id}: unknown scenario ${scenarioId}`);
  for (const templateId of list(question.relatedTemplates)) if (!templateMap.has(templateId)) fail("REFERENCE_ERROR", `${question.id}: unknown template ${templateId}`);
  for (const decisionId of list(question.relatedDecisions)) if (!decisionLog.includes(`## ${decisionId}`)) fail("REFERENCE_ERROR", `${question.id}: unknown decision ${decisionId}`);
}
for (const rule of rules) {
  if (rule.relatedQuestion && !questionMap.has(rule.relatedQuestion)) fail("REFERENCE_ERROR", `${rule.id}: unknown question ${rule.relatedQuestion}`);
  if (rule.relatedQuestion && !list(questionMap.get(rule.relatedQuestion)?.relatedRules).includes(rule.id)) {
    fail("QUESTION_LINK_ERROR", `${rule.relatedQuestion}: missing backlink for ${rule.id}`);
  }
}
for (const observation of list(observationsDoc.observations)) {
  if (observation.relatedQuestion && !questionMap.has(observation.relatedQuestion)) fail("REFERENCE_ERROR", `${observation.id}: unknown question ${observation.relatedQuestion}`);
  if (observation.relatedQuestion && !list(questionMap.get(observation.relatedQuestion)?.relatedObservations).includes(observation.id)) {
    fail("QUESTION_LINK_ERROR", `${observation.relatedQuestion}: missing backlink for ${observation.id}`);
  }
}
for (const exception of exceptions) {
  const baseRule = ruleMap.get(exception.baseRule);
  if (!baseRule) continue;
  const approvalRank = { draft: 0, deprecated: 0, superseded: 0, provisional: 1, active: 2 };
  if (exception.status === "provisional" && !exception.relatedQuestion) {
    fail("APPROVAL_ERROR", `${exception.id}: provisional exception requires relatedQuestion`);
  }
  if (exception.status === "provisional" && questionMap.get(exception.relatedQuestion)?.status !== "unresolved") {
    fail("APPROVAL_ERROR", `${exception.id}: provisional exception requires an unresolved question`);
  }
  if (exception.status === "active" && baseRule.status === "provisional") {
    fail("APPROVAL_ERROR", `${exception.id}: active exception cannot override provisional base rule ${baseRule.id} without an approved decision`);
  }
  if (approvalRank[exception.status] > approvalRank[baseRule.status] && !(exception.status === "active" && baseRule.status === "provisional")) {
    fail("APPROVAL_ERROR", `${exception.id}: exception status ${exception.status} cannot be stronger than base rule ${baseRule.id} status ${baseRule.status}`);
  }
  if (exception.status === "provisional" && baseRule.status === "provisional" && exception.relatedQuestion !== baseRule.relatedQuestion) {
    fail("APPROVAL_ERROR", `${exception.id}: provisional exception must link the base rule question ${baseRule.relatedQuestion}`);
  }
  if (exception.relatedQuestion && !list(questionMap.get(exception.relatedQuestion)?.relatedExceptions).includes(exception.id)) {
    fail("QUESTION_LINK_ERROR", `${exception.relatedQuestion}: missing backlink for ${exception.id}`);
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
const stateDimensions = {
  availability: list(stateDimensionsDoc.availabilityStates),
  participation: list(stateDimensionsDoc.participationStates),
  signing: list(stateDimensionsDoc.signingStates),
};
const dimensionEntries = Object.entries(stateDimensions);
for (let index = 0; index < dimensionEntries.length; index += 1) {
  for (let other = index + 1; other < dimensionEntries.length; other += 1) {
    const overlap = intersection(dimensionEntries[index][1], dimensionEntries[other][1]);
    if (overlap.length) fail("STATE_CONFLICT", `${dimensionEntries[index][0]}/${dimensionEntries[other][0]}: overlapping states ${overlap.join(", ")}`);
  }
}
for (const migration of list(stateDimensionsDoc.legacyStateMigration)) {
  if (!stateDimensions[migration.dimension]?.includes(migration.targetId)) fail("STATE_CONFLICT", `${migration.legacyId}: target ${migration.targetId} is absent from ${migration.dimension}`);
}

for (const [templateId, binding] of Object.entries(bindingsDoc.templates ?? {})) {
  if (!templateMap.has(templateId)) fail("BINDING_ERROR", `${templateId}: binding references unknown template`);
  if (binding.migrationStatus === "verified" && !binding.currentSource) fail("BINDING_ERROR", `${templateId}: verified binding requires currentSource`);
}
for (const template of templates) if (!bindingsDoc.templates?.[template.id]) fail("BINDING_ERROR", `${template.id}: template binding is required`);
for (const uiState of list(uiStatesDoc.uiStates)) if (!bindingsDoc.uiStates?.[uiState.id]) fail("BINDING_ERROR", `${uiState.id}: UI state binding is required`);
for (const template of templates) {
  const binding = bindingsDoc.templates?.[template.id];
  const sourceExists = binding?.currentSource && fs.existsSync(path.resolve(repoRoot, binding.currentSource));
  if (binding?.currentComponent && sourceExists && !list(template.supportedSurfaces).length && template.migrationScope !== "out_of_scope") {
    fail("MIGRATION_GAP", `${template.id}: bound current implementation requires supportedSurfaces or migrationScope out_of_scope`);
  }
  for (const surfaceId of list(template.supportedSurfaces)) {
    const hasPlacement = rules.some((rule) => list(rule.scope?.templates).includes(template.id)
      && list(rule.scope?.surfaces).includes(surfaceId)
      && ["active", "provisional"].includes(rule.status)
      && ["placement", "surface_visibility"].includes(rule.target?.type));
    if (!hasPlacement) fail("SURFACE_CONFLICT", `${template.id}: ${surfaceId} lacks a placement rule`);
  }
}

for (const source of list(migrationDoc.sources)) {
  if (source.status === "deprecated" && !source.verifiedBeforeDeprecation) fail("MIGRATION_GAP", `${source.legacySource}: deprecated before verified`);
  if (source.status === "verified" && !list(source.evidence).length) fail("MIGRATION_GAP", `${source.legacySource}: verified migration requires evidence`);
  if (source.status === "partially_mapped" && !list(source.unmappedContent).length) fail("MIGRATION_GAP", `${source.legacySource}: partially mapped source requires unmappedContent`);
  if (["mapped", "verified"].includes(source.status) && list(source.unmappedContent).length) fail("MIGRATION_GAP", `${source.legacySource}: mapped source cannot retain unmappedContent`);
  for (const ruleId of list(source.relatedRules)) if (!ruleMap.has(ruleId)) fail("REFERENCE_ERROR", `${source.legacySource}: unknown rule ${ruleId}`);
  for (const scenarioId of list(source.relatedScenarios)) if (!scenarioMap.has(scenarioId)) fail("REFERENCE_ERROR", `${source.legacySource}: unknown scenario ${scenarioId}`);
  for (const templateId of list(source.relatedTemplates)) if (!templateMap.has(templateId)) fail("REFERENCE_ERROR", `${source.legacySource}: unknown template ${templateId}`);
  for (const uiStateId of list(source.relatedUiStates)) if (!uiStateIds.has(uiStateId)) fail("REFERENCE_ERROR", `${source.legacySource}: unknown UI state ${uiStateId}`);
}

for (const observation of list(observationsDoc.observations)) {
  if (observation.approvalStatus === "unresolved" && !observation.relatedQuestion) fail("OBSERVATION_ERROR", `${observation.id}: unresolved observation requires relatedQuestion`);
}

for (const exception of exceptions) {
  const baseRule = ruleMap.get(exception.baseRule);
  if (!baseRule) continue;
  if (exception.priority < baseRule.priority) {
    fail("REFERENCE_ERROR", `${exception.id}: priority ${exception.priority} is lower than base ${baseRule.priority}`);
  }
  if (!list(baseRule.exceptions).includes(exception.id)) {
    fail("REFERENCE_ERROR", `${exception.id}: missing backlink from ${baseRule.id}`);
  }
  if (exception.override?.variant) {
    const valid = list(baseRule.scope?.templates).some((templateId) => variantsFor(templateMap.get(templateId)).has(exception.override.variant));
    if (!valid) fail("VARIANT_CONFLICT", `${exception.id}: unknown override.variant ${exception.override.variant}`);
  }
  if (exception.override?.surface) {
    const surface = surfaceMap.get(exception.override.surface);
    const sections = idSet(surface?.sections);
    if (!surface || (exception.override.section && !sections.has(exception.override.section))) {
      fail("SURFACE_CONFLICT", `${exception.id}: unknown placement ${exception.override.surface}.${exception.override.section ?? ""}`);
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
      fail("VARIANT_CONFLICT", `${scenario.id}: ${expected.variant} is absent from ${expected.template}`);
    }
  } else if (expected.variant) {
    const variantCovered = list(expected.appliedRules).some((ruleId) => ruleMap.get(ruleId)?.target?.type === "card_variant" && ruleMap.get(ruleId).target.id === expected.variant)
      || list(expected.appliedExceptions).some((exceptionId) => exceptionMap.get(exceptionId)?.override?.variant === expected.variant);
    if (!variantCovered) fail("VARIANT_CONFLICT", `${scenario.id}: variant ${expected.variant} is not linked to an applied rule`);
  }

  for (const exceptionId of list(expected.appliedExceptions)) {
    const exception = exceptionMap.get(exceptionId);
    if (exception && !ruleMap.get(exception.baseRule)?.tests?.includes(scenario.id)) {
      fail("REFERENCE_ERROR", `${scenario.id}: missing from tests of base rule ${exception.baseRule}`);
    }
  }

  for (const elementId of [...list(expected.visibleContent), ...list(expected.hiddenContent), ...list(expected.enabledActions), ...list(expected.disabledActions)]) {
    if (!contentMap.has(elementId)) fail("REFERENCE_ERROR", `${scenario.id}: unknown content element ${elementId}`);
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
