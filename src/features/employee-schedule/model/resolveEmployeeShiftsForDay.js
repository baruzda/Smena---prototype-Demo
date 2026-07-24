const DEFAULT_PRIMARY_SHIFT = Object.freeze({
  address: "Косой переулок, 550, к. 8",
  brand: "pyaterochka",
  distance: "350 м",
  hours: "10:00 – 22:00",
  metro: Object.freeze({
    city: "spb",
    color: "#d6083b",
    label: "Метро Санкт-Петербурга",
    station: "Площадь Восстания",
  }),
  title: "управление транспортом",
  type: "primary",
});

export function resolveEmployeeShiftsForDay({
  acceptedGigByDate,
  availabilityByDate,
  bookedTasks,
  day,
}) {
  const dayValue = (record) => record?.[day.id] ?? record?.[day.date];
  const acceptedShifts = [
    ...(dayValue(acceptedGigByDate) ? [{ ...dayValue(acceptedGigByDate), type: "gig" }] : []),
    ...bookedTasks
      .filter((booking) => booking.day.id === day.id || booking.day.date === day.date)
      .map((booking) => ({ ...booking.task, type: "gig" })),
  ];

  if (acceptedShifts.length > 0) return Object.freeze(acceptedShifts);
  if (dayValue(availabilityByDate) !== "busy") return Object.freeze([]);
  return Object.freeze([{ ...DEFAULT_PRIMARY_SHIFT }]);
}
