import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("x5-shift-prototype-state", JSON.stringify({ settingsOnboardingSeen: true }));
  });
  await page.reload();
});

test("подсказка настроек показывается один раз и ведёт в настройки", async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByText("настройте выдачу под себя", { exact: true })).toBeVisible();
  await page.locator(".settings-onboarding-dismiss").click({ position: { x: 24, y: 320 } });
  await expect(page.getByText("настройте выдачу под себя", { exact: true })).toBeHidden();

  await page.reload();
  await expect(page.getByText("настройте выдачу под себя", { exact: true })).toBeHidden();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Открыть настройки расписания", exact: true }).click();
  await expect(page.getByRole("heading", { name: "настройки расписания", exact: true })).toBeVisible();
});

test("выбор даты, сортировка и плавающий возврат к началу", async ({ page }) => {
  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await expect(page.getByRole("region", { name: "Избранное", exact: true })).toContainText("Избранных магазинов пока нет");
  await page.getByRole("button", { name: "задания", exact: true }).click();

  await page.getByRole("button", { name: "5 пт", exact: true }).click();
  await expect(page.getByRole("button", { name: "5 пт", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Сортировка", exact: true }).click();
  await page.getByRole("radio", { name: "сначала ближайшие", exact: true }).click();

  await page.locator(".screen").evaluate((element) => element.scrollTo({ top: 800 }));
  await expect(page.getByRole("button", { name: "Наверх", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Наверх", exact: true }).click();
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeLessThan(2);
});

test("сохранённая подборка открывает выдачу и удаляется из избранного", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("button", { name: "Пятёрочка", exact: true }).click();
  await page.getByRole("button", { name: "сохранить подборку", exact: true }).click();
  const saveDialog = page.getByRole("dialog", { name: "Сохранение подборки", exact: true });
  await expect(saveDialog).toBeVisible();
  await saveDialog.getByRole("checkbox", { name: "Письмо на почту", exact: true }).check();
  await saveDialog.getByRole("button", { name: "раз в день", exact: true }).click();
  await saveDialog.getByRole("button", { name: "сохранить подборку", exact: true }).click();
  await expect(page.getByRole("button", { name: "подборка сохранена", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Перекрёсток", exact: true }).click();
  await expect(page.getByRole("button", { name: "сохранить подборку", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Назад к заданиям", exact: true }).click();

  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  await expect(page.getByRole("region", { name: "Фильтры заданий", exact: true })).toHaveCount(0);
  await expect(page.getByText("Лефортовский Вал · до 1 км", { exact: true })).toBeVisible();
  await expect(page.getByText("Пятёрочка", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "изменить", exact: true }).click();
  await page.getByRole("button", { name: "Перекрёсток", exact: true }).click();
  await page.getByRole("button", { name: "применить", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  await expect(page.getByText("Пятёрочка, Перекрёсток", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "показать задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Список заданий", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  await page.getByRole("button", { name: "Удалить подборку Лефортовский Вал · до 1 км", exact: true }).click();
  await expect(page.getByText("Сохранённых подборок пока нет", { exact: true })).toBeVisible();
});

test("адрес, радиус и выдача синхронизированы между картой и фильтрами", async ({ page }) => {
  await page.route(/nominatim\.openstreetmap\.org\/search/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ display_name: "Москва, Красная площадь, 1", lat: "55.7539", lon: "37.6208" }]),
    });
  });

  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("button", { name: /территория улица Лефортовский Вал/ }).click();
  await expect(page.getByRole("button", { name: "применить", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Адрес для поиска", exact: true }).fill("Красная площадь");
  await expect(page.getByRole("button", { name: /Красная площадь, 1/ })).toBeVisible();
  await page.getByRole("button", { name: /Красная площадь, 1/ }).click();
  await expect(page.getByRole("textbox", { name: "Адрес для поиска", exact: true })).toHaveValue("Москва, Красная площадь, 1");
  await page.getByRole("button", { name: "50 км", exact: true }).click();
  await page.getByRole("button", { name: "применить", exact: true }).click();
  await expect(page.getByText("Новая территория применится после сохранения", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "применить", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("x5-shift-prototype-state") || "{}").searchRadius)).toBe(50);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("x5-shift-prototype-state") || "{}").searchLocation?.label)).toBe("Москва, Красная площадь, 1");

  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("x5-shift-prototype-state") || "{}").searchRadius)).toBe(50);
  await page.getByRole("button", { name: "Открыть задания на карте", exact: true }).click();
  await expect(page.getByRole("button", { name: "применить", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "50 км", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Приблизить карту", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Отдалить карту", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Показать выбранную область", exact: true }).click();
  const mapPaths = page.locator(".leaflet-overlay-pane svg path");
  expect(await mapPaths.count()).toBeGreaterThan(1);
  const mapBox = await page.locator(".location-map").boundingBox();
  const sheetBox = await page.locator(".location-picker-sheet").boundingBox();
  for (const radius of [1, 2, 5, 10, 50]) {
    await page.getByRole("button", { name: `${radius} км`, exact: true }).click();
    const circleBox = await mapPaths.nth(1).boundingBox();
    expect(circleBox).not.toBeNull();
    expect(circleBox.y).toBeGreaterThanOrEqual((mapBox?.y ?? 0) + 56);
    expect(circleBox.y + circleBox.height).toBeLessThanOrEqual(sheetBox?.y ?? 0);
  }
});

test("неудачный поиск можно отменить без потери подтверждённой точки", async ({ page }) => {
  await page.route(/nominatim\.openstreetmap\.org\/search/, async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.getByRole("button", { name: "Открыть задания на карте", exact: true }).click();
  await page.getByRole("textbox", { name: "Адрес для поиска", exact: true }).fill("несуществующий адрес");
  await expect(page.getByText("Ничего не нашли. Уточните адрес.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "указать на карте", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Адрес для поиска", exact: true })).toHaveValue("улица Лефортовский Вал");
  await expect(page.getByRole("button", { name: "применить", exact: true })).toBeEnabled();
});

test("настройки доступности блокируют занятые дни и сохраняют ручное время", async ({ page }) => {
  await page.getByRole("button", { name: "Настройки расписания", exact: true }).click();
  await page.getByRole("button", { name: "выберите дни", exact: true }).click();
  const busyDays = page.locator(".availability-calendar .availability-day-busy");
  expect(await busyDays.count()).toBeGreaterThan(0);
  await expect(busyDays.first()).toBeDisabled();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "готово", exact: true }).click();
  await page.getByRole("textbox", { name: "Доступен с", exact: true }).fill("09:30");
  await page.getByRole("button", { name: "короткие 4–6 часов", exact: true }).click();
  await page.getByRole("button", { name: "обычные 8–9 часов", exact: true }).click();
  await expect(page.getByRole("button", { name: "короткие 4–6 часов", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "обычные 8–9 часов", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "сохранить", exact: true }).click();

  await page.reload();
  await page.getByRole("button", { name: "Настройки расписания", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Доступен с", exact: true })).toHaveValue("09:30");
  await expect(page.getByRole("button", { name: "короткие 4–6 часов", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "обычные 8–9 часов", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("запись на смену появляется в истории и не дублируется", async ({ page }) => {
  await page.getByRole("button", { name: "Подробнее: приёмщик товара", exact: true }).click();
  await page.getByRole("button", { name: "записаться", exact: true }).click();
  await expect(page.getByText("вы записаны", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Мои задания", exact: true })).toContainText("приёмщик товара");

  await page.reload();
  await page.getByRole("button", { name: "Подробнее: приёмщик товара", exact: true }).click();
  await expect(page.getByRole("button", { name: "вы уже записаны", exact: true })).toBeDisabled();
});

test("запись блокируется при пересечении с принятой подработкой", async ({ page }) => {
  const sixthDayAction = page.locator('[data-day="6"] [role="button"]');
  expect(await sixthDayAction.count()).toBeGreaterThan(0);
  await sixthDayAction.first().click();
  await expect(page.getByRole("button", { name: "недоступно в этот день", exact: true })).toBeDisabled();
});
