export function resolveEmployeeShiftPresentation(shift, day) {
  const structuralVariant = shift.type === "primary" ? "primary_shift" : "accepted_extra_shift";
  return Object.freeze({
    templateId: "employee_shift_card",
    structuralVariant,
    marker: structuralVariant === "primary_shift" ? "основная смена" : "сверхурочная смена",
    date: day?.calendarDate?.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
      ?? day?.label?.replace(/^(сегодня|завтра),\s*/i, "")
      ?? "1 июня",
    secondaryDate: day?.weekday
      ? ({ пн: "понедельник", вт: "вторник", ср: "среда", чт: "четверг", пт: "пятница", сб: "суббота", вс: "воскресенье" })[day.weekday]
      : day?.secondaryLabel ?? "",
    placement: "tasks",
    section: "employee_schedule",
    order: 50,
    appliedRuleIds: Object.freeze(structuralVariant === "primary_shift" ? ["RULE-SHIFT-001"] : []),
  });
}
