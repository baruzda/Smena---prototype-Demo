import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("x5-shift-prototype-state", JSON.stringify({ defaultStateVersion: 3, settingsOnboardingVersion: 3 }));
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

test("специальное для вас приоритетно без сортировки и участвует в сортировке", async ({ page }) => {
  const firstDay = page.locator('[data-day="1"]');

  await expect(firstDay.locator(".gig-task-card").first()).toHaveClass(/gig-task-card-special/);
  await expect(firstDay.getByText("специально для вас", { exact: false })).toBeVisible();
  await expect(firstDay.locator(".gig-task-badge")).toHaveCount(2);
  await expect(firstDay.locator(".special-card-timer")).toHaveText(/^\d{2}:\d{2}:\d{2}$/);

  await page.getByRole("button", { name: "Сортировка", exact: true }).click();
  await page.getByRole("radio", { name: "сначала ближайшие", exact: true }).click();

  const distances = await firstDay.locator(".gig-task-card .gig-task-address-text").evaluateAll((nodes) => nodes.map((node) => {
    const match = node.textContent?.match(/([\d,.]+)\s*(км|м)\s*$/);
    if (!match) return Number.POSITIVE_INFINITY;
    const value = Number.parseFloat(match[1].replace(",", "."));
    return match[2] === "км" ? value * 1000 : value;
  }));

  expect(distances[0]).toBe(Math.min(...distances));
  await expect(firstDay.getByText("специально для вас", { exact: false })).toBeVisible();
});

test("неподходящие задания раскрываются после подходящих с причинами", async ({ page }) => {
  const firstDay = page.locator('[data-day="1"]');

  await page.locator(".toggle-label input").uncheck();
  const cards = firstDay.locator(".gig-task-card");
  const restrictedCards = firstDay.locator(".gig-task-card:has(.gig-task-restrictions)");

  await expect(restrictedCards).toHaveCount(2);
  await expect(restrictedCards.filter({ hasText: "Вне радиуса" })).toHaveCount(2);
  await expect(restrictedCards.filter({ hasText: "Пересекается со сменой" })).toHaveCount(1);
  await expect(restrictedCards.locator(".gig-task-badge, .special-card-badges")).toHaveCount(0);

  const firstRestrictedIndex = await restrictedCards.first().evaluate((card) => Array.from(card.parentElement?.children || []).indexOf(card));
  const suitableCards = await cards.evaluateAll((nodes) => nodes.filter((card) => !card.querySelector(".gig-task-restrictions")).length);
  expect(firstRestrictedIndex).toBeGreaterThanOrEqual(suitableCards);
});

test("в моих заданиях показаны демо-записи с разными статусами", async ({ page }) => {
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  const records = page.locator(".my-task-card");

  await expect(records).toHaveCount(4);
  await expect(records).toContainText(["записаны", "на подтверждении", "смена завершена", "отменена"]);
});

test("состояния отфильтрованных и отсутствующих заданий не смешиваются", async ({ page }) => {
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("x5-shift-prototype-state") || "{}");
    localStorage.setItem("x5-shift-prototype-state", JSON.stringify({
      ...state,
      selectedAvailabilityDates: ["2"],
      selectedAvailabilityWeekdays: [],
    }));
  });
  await page.reload();

  const filteredDay = page.locator('[data-day="1"]');
  await expect(filteredDay.getByText("подходящих услуг больше нет", { exact: true })).toBeVisible();
  await expect(filteredDay.getByText("в этот день услуг нет", { exact: true })).toHaveCount(0);
  await expect(filteredDay.getByText("ещё 5 услуг скрыты из-за фильтров", { exact: false })).toBeVisible();
  await filteredDay.getByRole("button", { name: /показать остальные/ }).click();
  await expect(filteredDay.locator(".gig-task-card")).toHaveCount(5);
  await expect(filteredDay.getByText("подходящих услуг больше нет", { exact: true })).toHaveCount(0);
  await filteredDay.getByRole("button", { name: "скрыть неподходящие", exact: true }).click();
  await expect(filteredDay.locator(".gig-task-card")).toHaveCount(0);
  await expect(filteredDay.getByText("подходящих услуг больше нет", { exact: true })).toBeVisible();

  const emptyDay = page.locator('[data-day="14"]');
  await expect(emptyDay.getByText("в этот день услуг нет", { exact: true })).toBeVisible();
  await expect(emptyDay.getByText("подходящих услуг больше нет", { exact: true })).toHaveCount(0);
});

test("иконки в карточке скрытых заданий открывают фильтры и настройки в боттомшитах", async ({ page }) => {
  const filteredNotice = page.locator('[data-day="1"] .task-message-card').first();

  await filteredNotice.getByRole("button", { name: "Открыть фильтры для этого дня", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Фильтры заданий", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Закрыть фильтры", exact: true }).click();

  await filteredNotice.getByRole("button", { name: "Открыть настройки доступности для этого дня", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Настройки доступности", exact: true })).toBeVisible();
});

test("дальний переход по таймлайну показывает skeleton перед прокруткой", async ({ page }) => {
  const loadingState = page.getByRole("status", { name: "Загрузка заданий", exact: true });

  await page.getByRole("button", { name: "7 вс", exact: true }).click();
  await expect(loadingState).toBeVisible();
  await expect(loadingState).toBeHidden({ timeout: 1_000 });
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeGreaterThan(10);

  await page.getByRole("button", { name: "1 пн", exact: true }).click();
  await expect(loadingState).toBeVisible();
  await expect(loadingState).toBeHidden({ timeout: 1_000 });
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

test("периоды доступности поддерживают мультивыбор и ручной ввод", async ({ page }) => {
  await page.getByRole("button", { name: "Настройки расписания", exact: true }).click();
  const allDay = page.getByRole("button", { name: "весь день", exact: true });
  const morning = page.getByRole("button", { name: "утро", exact: true });
  const evening = page.getByRole("button", { name: "вечер", exact: true });

  await expect(allDay).toHaveAttribute("aria-pressed", "true");
  await morning.click();
  await evening.click();
  await expect(allDay).toHaveAttribute("aria-pressed", "false");
  await expect(morning).toHaveAttribute("aria-pressed", "true");
  await expect(evening).toHaveAttribute("aria-pressed", "true");

  await morning.click();
  await expect(morning).toHaveAttribute("aria-pressed", "false");
  await expect(evening).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("textbox", { name: "Доступен с", exact: true }).fill("17:00");
  await expect(evening).toHaveAttribute("aria-pressed", "false");
});

test("запись на смену появляется в истории и не дублируется", async ({ page }) => {
  const taskCard = page.locator(".gig-task-card[role='button']").first();
  const taskName = await taskCard.locator("h2").textContent();
  await taskCard.click();
  await page.getByRole("button", { name: "записаться", exact: true }).click();
  await expect(page.getByText("вы записаны", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Мои задания", exact: true })).toContainText(taskName || "");
  await expect(page.locator(".my-task-card").filter({ hasText: "записаны" })).toHaveCount(2);

  await page.reload();
  await page.getByRole("button", { name: `Подробнее: ${taskName}`, exact: true }).click();
  await expect(page.getByRole("button", { name: "вы уже записаны", exact: true })).toBeDisabled();
});

test("запись блокируется при пересечении с принятой подработкой", async ({ page }) => {
  const sixthDayAction = page.locator('[data-day="6"] [role="button"]');
  expect(await sixthDayAction.count()).toBeGreaterThan(0);
  await sixthDayAction.first().click();
  await expect(page.getByRole("button", { name: "недоступно в этот день", exact: true })).toBeDisabled();
});
