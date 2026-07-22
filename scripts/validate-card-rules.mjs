import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rulesDir = path.join(root, "docs", "card-rules");
const generatedDir = path.join(rulesDir, "generated");
const errors = [];
const warnings = [];
const conflicts = [];

const read = (file) => JSON.parse(fs.readFileSync(path.join(rulesDir, file), "utf8"));
const list = (value) => Array.isArray(value) ? value : [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const ids = (records) => new Set(list(records).map((item) => item.id));

function required(record, fields, context) {
  for (const field of fields) {
    if (record?.[field] === undefined || record?.[field] === null || record?.[field] === "") {
      fail(`${context}: отсутствует поле ${field}`);
    }
  }
}

function unique(records, context) {
  const seen = new Set();
  for (const record of list(records)) {
    if (!record?.id) {
      fail(`${context}: запись без id`);
      continue;
    }
    if (seen.has(record.id)) fail(`${context}: повторяется id ${record.id}`);
    seen.add(record.id);
  }
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function md(value) {
  if (value === undefined || value === null || value === "") return "-";
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(md).join(" | ")} |`),
  ].join("\n");
}

function write(name, body) {
  fs.mkdirSync(generatedDir, { recursive: true });
  fs.writeFileSync(path.join(generatedDir, name), `${body.trim()}\n`, "utf8");
}

const dictionary = read("dictionary.json");
const templatesDoc = read("templates.json");
const contentDoc = read("content-elements.json");
const surfacesDoc = read("surfaces.json");
const precedence = read("precedence.json");
const rulesDoc = read("rules.json");
const exceptionsDoc = read("exceptions.json");
const scenariosDoc = read("scenarios.json");
const observationsDoc = read("implementation-observations.json");
const uiStatesDoc = read("ui-states.json");
const bindingsDoc = read("component-bindings.json");
const migrationDoc = read("migration-map.json");
const questionsDoc = read("open-questions.json");

const entities = list(dictionary.entities);
const surfacesDictionary = list(dictionary.surfaces);
const templates = list(templatesDoc.templates);
const content = list(contentDoc.contentElements);
const surfaces = list(surfacesDoc.surfaces);
const rules = list(rulesDoc.rules);
const exceptions = list(exceptionsDoc.exceptions);
const scenarios = list(scenariosDoc.scenarios);
const observations = list(observationsDoc.observations);
const uiStates = list(uiStatesDoc.uiStates);
const questions = list(questionsDoc.questions);
const questionMap = new Map(questions.map((item) => [item.id, item]));

for (const scenario of scenarios) if (!['declarative', 'executable', 'verified'].includes(scenario.executionStatus)) fail(`scenario ${scenario.id}: executionStatus обязателен`);
for (const observation of observations) {
  required(observation, ['id', 'source', 'approvalStatus'], `observation ${observation.id}`);
  if (!/^OBS-[A-Z-]+-[0-9]{3}$/.test(observation.id)) fail(`observation ${observation.id}: неверный ID`);
}
for (const rule of rules.filter((item) => item.status === 'provisional')) if (!rule.relatedQuestion || !questionMap.has(rule.relatedQuestion)) fail(`rule ${rule.id}: provisional rule требует open question`);
for (const template of templates) if (!bindingsDoc.templates?.[template.id]) fail(`template ${template.id}: отсутствует binding`);
for (const source of list(migrationDoc.sources)) if (!source.legacySource) fail('migration source без legacySource');

for (const [records, name] of [
  [entities, "entities"],
  [dictionary.states, "states"],
  [dictionary.markers, "markers"],
  [surfacesDictionary, "dictionary.surfaces"],
  [templates, "templates"],
  [content, "contentElements"],
  [surfaces, "surfaces"],
  [rules, "rules"],
  [exceptions, "exceptions"],
  [scenarios, "scenarios"],
]) unique(records, name);

const entityIds = ids(entities);
const surfaceDictionaryIds = ids(surfacesDictionary);
const surfaceMap = new Map(surfaces.map((item) => [item.id, item]));
const templateMap = new Map(templates.map((item) => [item.id, item]));
const contentMap = new Map(content.map((item) => [item.id, item]));
const ruleMap = new Map(rules.map((item) => [item.id, item]));
const exceptionMap = new Map(exceptions.map((item) => [item.id, item]));
const scenarioMap = new Map(scenarios.map((item) => [item.id, item]));
const actions = new Set(list(dictionary.actions));
const operators = new Set(list(dictionary.operators));
const targetTypes = new Set(list(dictionary.targetTypes));
const statuses = new Set(list(dictionary.ruleStatuses));
const priorities = new Set(list(precedence.levels).map((item) => item.priority));

for (const surface of surfaces) {
  required(surface, ["id", "name", "sections"], `surface ${surface.id}`);
  if (!surfaceDictionaryIds.has(surface.id)) fail(`surface ${surface.id}: нет в dictionary.json`);
  unique(surface.sections, `surface ${surface.id}.sections`);
}
for (const surface of surfacesDictionary) {
  if (!surfaceMap.has(surface.id)) fail(`dictionary surface ${surface.id}: нет в surfaces.json`);
}

for (const template of templates) {
  required(template, ["id", "entity", "slots", "supportedSurfaces", "variants"], `template ${template.id}`);
  if (!entityIds.has(template.entity)) fail(`template ${template.id}: неизвестная entity ${template.entity}`);
  for (const surfaceId of list(template.supportedSurfaces)) {
    if (!surfaceMap.has(surfaceId)) fail(`template ${template.id}: неизвестный surface ${surfaceId}`);
  }
  unique(template.variants, `template ${template.id}.variants`);
}

for (const element of content) {
  required(element, ["id", "name", "slot", "source", "required", "templates"], `content ${element.id}`);
  for (const templateId of list(element.templates)) {
    const template = templateMap.get(templateId);
    if (!template) {
      fail(`content ${element.id}: неизвестный template ${templateId}`);
      continue;
    }
    if (!list(template.slots).includes(element.slot)) {
      fail(`content ${element.id}: slot ${element.slot} отсутствует в ${templateId}`);
    }
  }
}

function checkWhen(when, context) {
  const conditions = [...list(when?.all), ...list(when?.any)];
  if (!conditions.length) fail(`${context}: when не содержит all или any`);
  for (const condition of conditions) {
    required(condition, ["path", "operator"], context);
    if (!operators.has(condition.operator)) fail(`${context}: неизвестный operator ${condition.operator}`);
    if (condition.value === undefined && condition.reference === undefined && !["exists", "not_exists"].includes(condition.operator)) {
      fail(`${context}: ${condition.path} не содержит value или reference`);
    }
  }
}

function checkEffect(effect, context) {
  if (!effect?.action || !actions.has(effect.action)) fail(`${context}: неизвестный action ${effect?.action}`);
}

function checkPlacement(target, context) {
  const surface = surfaceMap.get(target.surface);
  if (!surface) {
    fail(`${context}: неизвестный surface ${target.surface}`);
    return;
  }
  const sections = ids(surface.sections);
  if (target.section && !sections.has(target.section)) fail(`${context}: неизвестная секция ${target.surface}.${target.section}`);
  for (const section of Object.values(target.sectionMap ?? {})) {
    if (!sections.has(section)) fail(`${context}: неизвестная секция ${target.surface}.${section}`);
  }
}

for (const rule of rules) {
  const context = `rule ${rule.id}`;
  required(rule, ["id", "name", "status", "scope", "target", "when", "effect", "priority", "exceptions", "supersedes", "source", "tests"], context);
  if (!/^RULE-[A-Z]+-[0-9]{3}$/.test(rule.id)) fail(`${context}: неверный формат ID`);
  if (!statuses.has(rule.status)) fail(`${context}: неизвестный status ${rule.status}`);
  if (!priorities.has(rule.priority)) warn(`${context}: priority ${rule.priority} не соответствует базовому уровню`);
  if (!entityIds.has(rule.scope?.entity)) fail(`${context}: неизвестная entity ${rule.scope?.entity}`);

  for (const surfaceId of list(rule.scope?.surfaces)) {
    if (!surfaceMap.has(surfaceId)) fail(`${context}: неизвестный surface ${surfaceId}`);
  }
  for (const templateId of list(rule.scope?.templates)) {
    const template = templateMap.get(templateId);
    if (!template) {
      fail(`${context}: неизвестный template ${templateId}`);
      continue;
    }
    if (template.entity !== rule.scope.entity) fail(`${context}: entity не совпадает с ${templateId}`);
    for (const surfaceId of list(rule.scope.surfaces)) {
      if (!list(template.supportedSurfaces).includes(surfaceId)) fail(`${context}: ${templateId} не поддерживает ${surfaceId}`);
    }
  }

  const target = rule.target ?? {};
  if (!targetTypes.has(target.type)) fail(`${context}: неизвестный target.type ${target.type}`);
  if (["content_element", "action"].includes(target.type) && !contentMap.has(target.id)) fail(`${context}: неизвестный content ${target.id}`);
  if (target.type === "card_template" && !templateMap.has(target.id)) fail(`${context}: неизвестный template ${target.id}`);
  if (target.type === "card_variant") {
    const template = templateMap.get(target.template);
    if (!template || !list(template.variants).some((variant) => variant.id === target.id)) {
      fail(`${context}: неизвестный variant ${target.template}.${target.id}`);
    }
  }
  if (["placement", "order", "surface_visibility"].includes(target.type)) checkPlacement(target, context);

  checkWhen(rule.when, context);
  checkEffect(rule.effect, context);
  if (rule.otherwise) checkEffect(rule.otherwise, `${context}.otherwise`);

  for (const exceptionId of list(rule.exceptions)) if (!exceptionMap.has(exceptionId)) fail(`${context}: неизвестный exception ${exceptionId}`);
  for (const previousId of list(rule.supersedes)) if (!ruleMap.has(previousId)) fail(`${context}: неизвестный supersedes ${previousId}`);
  for (const scenarioId of list(rule.tests)) if (!scenarioMap.has(scenarioId)) fail(`${context}: неизвестный scenario ${scenarioId}`);
  if (rule.status === "active" && list(rule.tests).length < 2) fail(`${context}: нужно минимум два сценария`);
}

for (const exception of exceptions) {
  const context = `exception ${exception.id}`;
  required(exception, ["id", "name", "status", "baseRule", "when", "override", "priority", "reason"], context);
  if (!/^EXC-[A-Z]+-[0-9]{3}$/.test(exception.id)) fail(`${context}: неверный формат ID`);
  const base = ruleMap.get(exception.baseRule);
  if (!base) fail(`${context}: неизвестный baseRule ${exception.baseRule}`);
  else if (!list(base.exceptions).includes(exception.id)) fail(`${context}: нет обратной ссылки из ${exception.baseRule}`);
  checkWhen(exception.when, context);
  checkEffect(exception.override, context);
}

for (const scenario of scenarios) {
  const context = `scenario ${scenario.id}`;
  required(scenario, ["id", "name", "given", "expected"], context);
  if (!/^SCN-[A-Z]+-[0-9]{3}$/.test(scenario.id)) fail(`${context}: неверный формат ID`);
  if (scenario.given?.surface && !surfaceMap.has(scenario.given.surface)) fail(`${context}: неизвестный surface ${scenario.given.surface}`);
  if (scenario.expected?.template && !templateMap.has(scenario.expected.template)) fail(`${context}: неизвестный template ${scenario.expected.template}`);
  for (const elementId of [
    ...list(scenario.expected?.visibleContent),
    ...list(scenario.expected?.hiddenContent),
    ...list(scenario.expected?.enabledActions),
    ...list(scenario.expected?.disabledActions),
  ]) if (!contentMap.has(elementId)) fail(`${context}: неизвестный content ${elementId}`);
  for (const ruleId of list(scenario.expected?.appliedRules)) if (!ruleMap.has(ruleId)) fail(`${context}: неизвестный rule ${ruleId}`);
  for (const exceptionId of list(scenario.expected?.appliedExceptions)) if (!exceptionMap.has(exceptionId)) fail(`${context}: неизвестный exception ${exceptionId}`);
}

const signatures = new Map();
for (const rule of rules.filter((item) => item.status === "active")) {
  const signature = stable({ scope: rule.scope, target: rule.target, when: rule.when, priority: rule.priority });
  const previous = signatures.get(signature);
  if (previous && stable(previous.effect) !== stable(rule.effect)) {
    conflicts.push([previous.id, rule.id, rule.priority, stable(rule.target)]);
  } else if (!previous) signatures.set(signature, rule);
}

write("card-matrix.md", `# Матрица шаблонов и вариантов\n\n${table(
  ["Template", "Карточка", "Variant", "Название", "Табы", "Слоты"],
  templates.flatMap((template) => list(template.variants).map((variant) => [template.id, template.name, variant.id, variant.name, list(template.supportedSurfaces).join(", "), list(template.slots).join(", ")]))
)}`);

write("content-matrix.md", `# Матрица контента\n\n${table(
  ["ID", "Элемент", "Слот", "Источник", "Обязательный", "Fallback", "Шаблоны"],
  content.map((element) => [element.id, element.name, element.slot, element.source, element.required ? "Да" : "Нет", element.fallback, list(element.templates).join(", ")])
)}`);

write("placement-matrix.md", `# Матрица размещения\n\n${table(
  ["Surface", "Таб", "Section", "Секция", "Порядок", "Правила"],
  surfaces.flatMap((surface) => list(surface.sections).map((section) => {
    const related = rules.filter((rule) => rule.status === "active" && rule.target?.surface === surface.id && (rule.target.section === section.id || Object.values(rule.target.sectionMap ?? {}).includes(section.id)));
    return [surface.id, surface.name, section.id, section.name, section.order, related.map((rule) => rule.id).join(", ")];
  }))
)}`);

write("rules-matrix.md", `# Матрица правил\n\n${table(
  ["Rule ID", "Правило", "Статус", "Сущность", "Табы", "Цель", "Эффект", "Priority", "Исключения"],
  rules.map((rule) => [rule.id, rule.name, rule.status, rule.scope?.entity, list(rule.scope?.surfaces).join(", "), `${rule.target?.type}:${rule.target?.id ?? rule.target?.section ?? "map"}`, rule.effect?.action, rule.priority, list(rule.exceptions).join(", ")])
)}`);

write("approved-rules-matrix.md", `# Approved rules\n\n${table(["Rule ID", "Name"], rules.filter((rule) => rule.status === "active").sort((a, b) => a.id.localeCompare(b.id)).map((rule) => [rule.id, rule.name]))}`);
write("provisional-rules-matrix.md", `# Provisional rules\n\n${table(["Rule ID", "Question", "Source"], rules.filter((rule) => rule.status === "provisional").sort((a, b) => a.id.localeCompare(b.id)).map((rule) => [rule.id, rule.relatedQuestion, rule.source?.observation ?? rule.source?.code]))}`);
write("implementation-observations.md", `# Implementation observations\n\n${table(["ID", "Source", "Approval", "Question"], observations.sort((a, b) => a.id.localeCompare(b.id)).map((item) => [item.id, item.source, item.approvalStatus, item.relatedQuestion]))}`);
write("ui-states-matrix.md", `# UI states\n\n${table(["ID", "Surface", "Implementation", "Status"], uiStates.sort((a, b) => a.id.localeCompare(b.id)).map((item) => [item.id, list(item.usedOn).join(', '), item.currentImplementation, item.implementationStatus]))}`);
write("component-bindings-matrix.md", `# Component bindings\n\n${table(["Template", "Current", "Target", "Status"], Object.entries(bindingsDoc.templates ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([id, item]) => [id, item.currentComponent, item.targetComponent, item.migrationStatus]))}`);
write("migration-status.md", `# Migration status\n\n${table(["Source", "Status"], list(migrationDoc.sources).sort((a, b) => a.legacySource.localeCompare(b.legacySource)).map((item) => [item.legacySource, item.status]))}`);
write("scenarios-matrix.md", `# Scenarios\n\n${table(["ID", "Execution"], scenarios.sort((a, b) => a.id.localeCompare(b.id)).map((item) => [item.id, item.executionStatus]))}`);
write("open-blockers.md", `# Open blockers\n\n${table(["ID", "Title"], questions.filter((item) => item.blocking && item.status === "unresolved").sort((a, b) => a.id.localeCompare(b.id)).map((item) => [item.id, item.title]))}`);

const conflictText = conflicts.length
  ? table(["Правила", "Priority", "Цель"], conflicts.map(([a, b, priority, target]) => [`${a} / ${b}`, priority, target]))
  : "Активных неразрешённых конфликтов не найдено.";
const warningText = warnings.length ? warnings.map((message) => `- ${message}`).join("\n") : "Предупреждений нет.";
write("conflicts-report.md", `# Отчёт конфликтов\n\n## Конфликты\n\n${conflictText}\n\n## Предупреждения\n\n${warningText}`);

for (const [a, b] of conflicts) fail(`конфликт правил ${a} и ${b}`);

if (warnings.length) {
  console.warn(`Предупреждения (${warnings.length}):`);
  for (const message of warnings) console.warn(`- ${message}`);
}
if (errors.length) {
  console.error(`Ошибки правил карточек (${errors.length}):`);
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`Правила карточек валидны: ${rules.length} правил, ${exceptions.length} исключений, ${scenarios.length} сценариев.`);
