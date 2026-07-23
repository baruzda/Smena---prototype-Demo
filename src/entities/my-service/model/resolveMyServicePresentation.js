const statuses = Object.freeze({
  booked: { label: "записаны", tone: "success", section: "upcoming" },
  pending: { label: "на подтверждении", tone: "warning", section: "pending_confirmation" },
  active: { label: "выполняется", tone: "success", section: "active" },
  completed: { label: "смена завершена", tone: "neutral", section: "completed" },
  cancelled: { label: "отменена", tone: "danger", section: "cancelled" },
});

export function isMyServiceStatus(status) {
  return Boolean(statuses[status]);
}

export function resolveMyServicePresentation(booking) {
  const statusId = isMyServiceStatus(booking.status) ? booking.status : "booked";
  const status = statuses[statusId];
  const { day } = booking;
  const dateFragment = `${day.label}, ${day.secondaryLabel}`.match(/\d+ июня/)?.[0];

  return Object.freeze({
    templateId: "my_service_card",
    structuralVariant: statusId,
    status,
    date: dateFragment ? `${dateFragment}, 2025` : `${day.label}, ${day.secondaryLabel}`,
    placement: "my_tasks",
    section: status.section,
    appliedRuleIds: Object.freeze(["RULE-MYTASKS-001", "RULE-MYTASKS-002"]),
  });
}
