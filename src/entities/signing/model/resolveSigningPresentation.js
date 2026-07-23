const signingStates = Object.freeze({
  waiting_user: Object.freeze({
    label: "на подписание",
    order: 100,
    placementRuleId: "RULE-SIGNING-001",
    tone: "warning",
  }),
  processing: Object.freeze({
    label: "на проверке",
    order: 200,
    placementRuleId: "RULE-SIGNING-002",
    tone: "warning",
  }),
  signed: Object.freeze({
    label: "подписано",
    order: 300,
    placementRuleId: "RULE-SIGNING-003",
    tone: "success",
  }),
  rejected: Object.freeze({
    label: "отклонено",
    order: 400,
    placementRuleId: "RULE-SIGNING-004",
    tone: "danger",
  }),
});

export function resolveSigningPresentation(booking) {
  const { day } = booking;
  const dateFragment = `${day.label}, ${day.secondaryLabel}`.match(/\d+ июня/)?.[0];
  const requestedStatus = booking.signing?.status;
  const hasKnownStatus = Boolean(signingStates[requestedStatus]);
  const structuralVariant = hasKnownStatus ? requestedStatus : "processing";
  const state = signingStates[structuralVariant];
  const canSign = requestedStatus === "waiting_user";

  return Object.freeze({
    templateId: "signing_card",
    structuralVariant,
    status: Object.freeze({ label: hasKnownStatus ? state.label : "статус уточняется", tone: state.tone }),
    date: dateFragment ? `${dateFragment}, 2025` : `${day.label}, ${day.secondaryLabel}`,
    document: booking.document ?? null,
    deadline: booking.deadline ?? null,
    primaryAction: canSign ? Object.freeze({ id: "signing.primary_action", label: "подписать" }) : null,
    enabledActions: Object.freeze(canSign ? ["signing.primary_action"] : []),
    placement: "signing",
    section: structuralVariant,
    order: state.order,
    appliedRuleIds: Object.freeze([state.placementRuleId, "RULE-SIGNING-005"]),
    appliedExceptionIds: Object.freeze(canSign ? [] : ["EXC-SIGNING-001"]),
  });
}
