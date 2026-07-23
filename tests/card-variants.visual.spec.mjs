import { expect, test } from "@playwright/test";

const variants = [
  "service_offer_card:default",
  "service_offer_card:special",
  "service_offer_card:restriction_status",
  "service_offer_card:restriction_status_plus",
  "service_offer_card:restriction_tags",
  "service_offer_card:favorite_unavailable",
  "employee_shift_card:primary_shift",
  "employee_shift_card:accepted_extra_shift",
  "my_service_card:pending",
  "my_service_card:booked",
  "my_service_card:active",
  "my_service_card:completed",
  "my_service_card:cancelled",
  "signing_card:waiting_user",
  "signing_card:processing",
  "signing_card:signed",
  "signing_card:rejected",
  "saved_collection_card:active_collection",
  "saved_collection_card:empty_collection",
  "favorite_store_card:default",
];

test("every registered structural variant has visual evidence", async ({ page }) => {
  await page.goto("/card-fixtures.html");

  for (const id of variants) {
    const fixture = page.locator(`[data-fixture="${id}"]`);
    await expect(fixture).toHaveCount(1);
    await expect(fixture).toHaveScreenshot(`${id.replaceAll(":", "--")}.png`, {
      animations: "disabled",
      mask: id === "service_offer_card:special" ? [fixture.getByLabel(/До окончания предложения/)] : [],
    });
  }

  await expect(page.locator('[data-fixture="saved_collection_card:excluded"] [data-card-template="saved_collection_card"]')).toHaveCount(0);
});
