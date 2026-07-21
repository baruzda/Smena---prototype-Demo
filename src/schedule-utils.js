export function getTaskHours(task) {
  const [startTime, endTime] = task.hours.match(/\d{2}:\d{2}/g) ?? [];
  const start = Number.parseInt(startTime, 10);
  const end = Number.parseInt(endTime, 10);

  return { end, start };
}

function toDaySegments(task) {
  const { end, start } = getTaskHours(task);
  if (end > start) return [[start, end]];

  return [[start, 24], [0, end]];
}

export function shiftsOverlap(first, second) {
  return toDaySegments(first).some(([firstStart, firstEnd]) => toDaySegments(second).some(([secondStart, secondEnd]) => (
    firstStart < secondEnd && secondStart < firstEnd
  )));
}
