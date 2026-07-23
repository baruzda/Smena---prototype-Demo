export function resolveEmployeeShiftPresentation(shift, day) {
  const structuralVariant = shift.type === "primary" ? "primary_shift" : "accepted_extra_shift";
  return Object.freeze({
    templateId: "employee_shift_card",
    structuralVariant,
    marker: structuralVariant === "primary_shift" ? "основная смена" : "сверхурочная смена",
    date: day?.label?.replace(/^сегодня,\s*/i, "") ?? "1 июня",
    secondaryDate: day?.secondaryLabel ?? "",
    placement: "tasks",
    section: "employee_schedule",
    order: 50,
    appliedRuleIds: Object.freeze(["RULE-SHIFT-001"]),
  });
}
