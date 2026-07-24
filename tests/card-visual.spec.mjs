import { expect, test } from "@playwright/test";

async function resetPrototype(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function waitForReadyPrototype(page) {
  await expect(page.getByText("настройте дни и часы доступности к подработкам", { exact: true })).toBeVisible({ timeout: 5_000 });
  const dismiss = page.getByRole("button", { name: "Закрыть подсказку настроек", exact: true });
  await dismiss.click({ force: true });
  await expect(dismiss).toBeHidden();
}

async function stabilizeCardScreenshots(page) {
  await page.addStyleTag({
    content: ".map-button, .bottom-navigation, .scroll-top-button { visibility: hidden !important; }",
  });
}

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title === "catalog loading sequence visual baseline") {
    await page.clock.install();
  }
  await resetPrototype(page);
});

test("catalog loading sequence visual baseline", async ({ page }) => {
  const launch = page.getByRole("status", { name: "Запуск сервиса", exact: true });
  await expect(launch).toBeVisible();
  await expect(launch).toHaveScreenshot("catalog-launch-spinner.png", { animations: "disabled" });

  await page.clock.runFor(1_000);
  const loading = page.getByRole("status", { name: "Загрузка заданий", exact: true });
  await expect(loading).toBeVisible({ timeout: 1_500 });
  await expect(loading).toHaveScreenshot("catalog-service-skeletons.png", { animations: "disabled" });
});

test("catalog cards and list states visual baseline", async ({ page }) => {
  await waitForReadyPrototype(page);
  await stabilizeCardScreenshots(page);

  const firstDay = page.locator("[data-day-key]").first();
  const specialCard = firstDay.locator('[data-card-template="service_offer_card"][data-card-variant="special"]');
  await expect(specialCard).toHaveCount(1);
  await expect(specialCard).toHaveScreenshot("service-offer-special.png", {
    animations: "disabled",
    mask: [specialCard.getByLabel(/До окончания предложения/)],
  });

  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).check();
  const suitableCard = firstDay.locator('[data-card-template="service_offer_card"][data-card-variant="default"]').first();
  await expect(suitableCard).toHaveScreenshot("service-offer-suitable.png", { animations: "disabled" });
  await expect(firstDay.locator('[data-ui-state="catalog.partially_hidden"]')).toHaveScreenshot("catalog-partially-hidden.png", { animations: "disabled" });

  await firstDay.getByRole("button", { name: "показать остальные", exact: true }).click();
  const restrictedCards = firstDay.locator('[data-card-variant="restriction_tags"]');
  expect(await restrictedCards.count()).toBeGreaterThan(0);
  await expect(restrictedCards.nth(0)).toHaveScreenshot("service-offer-restricted.png", { animations: "disabled" });
  const hideIncompatible = firstDay.getByRole("button", { name: "скрыть неподходящие", exact: true });
  await expect(hideIncompatible).toHaveScreenshot("catalog-hidden-services-action.png", { animations: "disabled" });
  await hideIncompatible.click();

  const primaryShift = page.locator('[data-card-template="employee_shift_card"][data-card-variant="primary_shift"]').first();
  await expect(primaryShift).toHaveScreenshot("employee-primary-shift.png", { animations: "disabled" });

  const extraShift = page.locator('[data-card-template="employee_shift_card"][data-card-variant="accepted_extra_shift"]').first();
  await expect(extraShift).toHaveScreenshot("employee-extra-shift.png", { animations: "disabled" });

  const emptyDay = page.locator('[data-ui-state="catalog.empty_day"]').first();
  await expect(emptyDay).toHaveScreenshot("catalog-empty-day.png", { animations: "disabled" });

  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  await page.getByRole("button", { name: "выберите дни", exact: true }).click();
  await page.locator(".availability-calendar .availability-day-free").first().click();
  await page.getByRole("button", { name: "готово", exact: true }).click();
  await page.getByRole("button", { name: "применить", exact: true }).click();
  await expect(firstDay.locator('[data-ui-state="catalog.filtered_empty"]')).toHaveScreenshot("catalog-filtered-empty.png", { animations: "disabled" });
});

test("catalog error and stale visual baseline", async ({ page }) => {
  await page.goto("/?catalogState=error");
  await waitForReadyPrototype(page);
  await stabilizeCardScreenshots(page);
  await expect(page.locator('[data-ui-state="catalog.error"]')).toHaveScreenshot("catalog-error.png", { animations: "disabled" });

  await page.goto("/?catalogState=stale");
  await waitForReadyPrototype(page);
  await stabilizeCardScreenshots(page);
  const staleState = page.locator('[data-ui-state="catalog.stale"]');
  await expect(staleState).toHaveScreenshot("catalog-stale.png", { animations: "disabled" });
  await expect(page.locator('[data-card-template="service_offer_card"]').first()).toBeVisible();
});

test("my tasks, signing and favorites visual baseline", async ({ page }) => {
  await waitForReadyPrototype(page);
  await stabilizeCardScreenshots(page);

  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  const myTaskCards = page.getByRole("region", { name: "Мои задания", exact: true }).locator("article");
  await expect(myTaskCards).toHaveCount(4);
  await expect(myTaskCards.nth(0)).toHaveScreenshot("my-service-booked.png", { animations: "disabled" });
  await expect(myTaskCards.nth(1)).toHaveScreenshot("my-service-pending.png", { animations: "disabled" });
  await expect(myTaskCards.nth(2)).toHaveScreenshot("my-service-completed.png", { animations: "disabled" });
  await expect(myTaskCards.nth(3)).toHaveScreenshot("my-service-cancelled.png", { animations: "disabled" });

  await page.getByRole("button", { name: "задания на подписание", exact: true }).click();
  const signingCards = page.getByRole("region", { name: "Задания на подписание", exact: true }).locator('[data-card-template="signing_card"]');
  await expect(signingCards).toHaveCount(4);
  await expect(signingCards.nth(0)).toHaveScreenshot("signing-card-waiting-user.png", { animations: "disabled" });
  await expect(signingCards.nth(1)).toHaveScreenshot("signing-card-processing.png", { animations: "disabled" });
  await expect(signingCards.nth(2)).toHaveScreenshot("signing-card-signed.png", { animations: "disabled" });
  await expect(signingCards.nth(3)).toHaveScreenshot("signing-card-rejected.png", { animations: "disabled" });

  await page.getByRole("button", { name: "избранное", exact: true }).click();
  const favoriteServices = page.getByRole("region", { name: "Избранное", exact: true }).locator('[data-card-template="service_offer_card"]');
  await expect(favoriteServices).toHaveCount(2);
  await expect(favoriteServices.nth(0)).toHaveScreenshot("favorite-service-available.png", { animations: "disabled" });
  await expect(favoriteServices.nth(1)).toHaveScreenshot("favorite-service-unavailable.png", { animations: "disabled" });
  await page.getByRole("tab", { name: "магазины", exact: true }).click();
  await expect(page.locator('[data-card-template="favorite_store_card"]').first()).toHaveScreenshot("favorite-store.png", { animations: "disabled" });
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  await expect(page.locator('[data-card-template="saved_collection_card"]').first()).toHaveScreenshot("favorite-default-collection.png", { animations: "disabled" });
});

test("favorites services narrow viewport visual baseline", async ({ page }) => {
  await waitForReadyPrototype(page);
  await stabilizeCardScreenshots(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.locator(".screen").evaluate((element) => { element.scrollTop = 0; });

  await expect(page).toHaveScreenshot("favorites-services-narrow.png", {
    animations: "disabled",
  });
});

test("saved collection visual baseline", async ({ page }) => {
  await waitForReadyPrototype(page);
  await stabilizeCardScreenshots(page);

  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("button", { name: "Пятёрочка", exact: true }).click();
  await page.getByRole("button", { name: "сохранить в подборку", exact: true }).click();
  const saveDialog = page.getByRole("dialog", { name: "Сохранение подборки", exact: true });
  await saveDialog.getByRole("button", { name: "сохранить подборку", exact: true }).click();
  await page.getByRole("button", { name: "Назад к заданиям", exact: true }).click();
  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();

  const savedCollection = page.locator('[data-card-template="saved_collection_card"]').filter({ has: page.getByRole("heading", { name: "новая подборка", exact: true }) });
  await expect(savedCollection).toHaveScreenshot("favorite-saved-collection.png", { animations: "disabled" });
});

test("empty saved collection visual baseline", async ({ page }) => {
  await waitForReadyPrototype(page);
  await stabilizeCardScreenshots(page);

  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("textbox", { name: "Минимальная стоимость", exact: true }).fill("99999");
  await page.getByRole("button", { name: "сохранить в подборку", exact: true }).click();
  const saveDialog = page.getByRole("dialog", { name: "Сохранение подборки", exact: true });
  await saveDialog.getByRole("button", { name: "сохранить подборку", exact: true }).click();
  await page.getByRole("button", { name: "Назад к заданиям", exact: true }).click();
  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();

  const emptyCollection = page.locator('[data-card-template="saved_collection_card"][data-card-variant="empty_collection"]');
  await expect(emptyCollection).toHaveScreenshot("favorite-empty-collection.png", { animations: "disabled" });

  await page.setViewportSize({ width: 320, height: 700 });
  await emptyCollection.getByRole("button", { name: "Настройки подборки новая подборка", exact: true }).click();
  await expect(emptyCollection).toHaveScreenshot("favorite-empty-collection-narrow-menu.png", { animations: "disabled" });
});
