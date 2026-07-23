export function resolveSigningPresentation(booking) {
  const { day } = booking;
  const dateFragment = `${day.label}, ${day.secondaryLabel}`.match(/\d+ июня/)?.[0];
  const status = booking.signing?.status ?? "waiting_user";
  const statusLabel = status === "processing" ? "на проверке" : status === "signed" ? "подписано" : "на подписание";

  return Object.freeze({
    templateId: "signing_card",
    structuralVariant: status,
    status: Object.freeze({ label: statusLabel, tone: status === "signed" ? "success" : "warning" }),
    date: dateFragment ? `${dateFragment}, 2025` : `${day.label}, ${day.secondaryLabel}`,
    document: booking.document ?? null,
    deadline: booking.deadline ?? null,
    enabledActions: Object.freeze(status === "waiting_user" ? ["signing.primary_action"] : []),
    placement: "signing",
    section: status,
    appliedRuleIds: Object.freeze(["RULE-SIGNING-001"]),
    appliedExceptionIds: Object.freeze(status === "waiting_user" ? [] : ["EXC-SIGNING-001"]),
  });
}
