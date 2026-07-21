import { expect, test } from "@playwright/test";
import { shiftsOverlap } from "../src/schedule-utils.js";

test("ночные интервалы блокируют пересекающиеся смены", () => {
  expect(shiftsOverlap({ hours: "20:00 – 06:00" }, { hours: "02:00 – 10:00" })).toBe(true);
  expect(shiftsOverlap({ hours: "20:00 – 06:00" }, { hours: "11:00 – 18:00" })).toBe(false);
});
