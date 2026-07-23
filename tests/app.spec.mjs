import { expect, test } from "@playwright/test";

async function dismissSettingsOnboarding(page) {
  const onboarding = page.getByRole("button", { name: "Закрыть подсказку настроек", exact: true });
  await expect(onboarding).toBeVisible({ timeout: 3_000 });
  await onboarding.click({ force: true });
  await expect(onboarding).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("status", { name: "Запуск сервиса", exact: true })).toBeVisible();
  await expect(page.getByText("настройте выдачу под себя", { exact: true })).toBeVisible({ timeout: 2500 });
  await dismissSettingsOnboarding(page);
});

test("запуск сервиса показывает спиннер, скелетоны и онбординг на каждом reload", async ({ page }) => {
  await page.reload();

  await expect(page.getByRole("status", { name: "Запуск сервиса", exact: true })).toBeVisible();
  await expect(page.locator('[data-ui-state="service_offer.skeleton"]')).toHaveCount(2, { timeout: 1500 });
  await expect(page.getByText("настройте выдачу под себя", { exact: true })).toBeVisible();
  const [onboardingTarget, settingsButton] = await Promise.all([
    page.locator(".settings-onboarding-target").boundingBox(),
    page.locator(".filter-icon-button-availability").boundingBox(),
  ]);
  expect(onboardingTarget).not.toBeNull();
  expect(settingsButton).not.toBeNull();
  expect(onboardingTarget.x + onboardingTarget.width / 2).toBeCloseTo(settingsButton.x + settingsButton.width / 2, 0);
  expect(onboardingTarget.y + onboardingTarget.height / 2).toBeCloseTo(settingsButton.y + settingsButton.height / 2, 0);
  await dismissSettingsOnboarding(page);
  await expect(page.getByText("настройте выдачу под себя", { exact: true })).toBeHidden();

  await page.reload();
  await expect(page.getByText("настройте выдачу под себя", { exact: true })).toBeVisible({ timeout: 2500 });
  await page.getByRole("button", { name: "Открыть настройки расписания", exact: true }).click();
  await expect(page.getByRole("heading", { name: "настройки расписания", exact: true })).toBeVisible();
});

test("выбор даты, сортировка и плавающий возврат к началу", async ({ page }) => {
  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await expect(page.getByRole("region", { name: "Избранное", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "задания", exact: true }).click();

  await page.getByRole("button", { name: "5 пт", exact: true }).click();
  await expect(page.getByRole("button", { name: "5 пт", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeGreaterThan(320);

  await page.getByRole("button", { name: "Сортировка", exact: true }).click();
  await page.getByRole("radio", { name: "сначала ближайшие", exact: true }).click();

  await page.locator(".screen").evaluate((element) => {
    element.scrollTop = 800;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeGreaterThan(320);
  await expect(page.getByRole("button", { name: "Наверх", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Наверх", exact: true }).click();
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeLessThan(2);
});

test("специальное для вас приоритетно без сортировки и участвует в сортировке", async ({ page }) => {
  const firstDay = page.locator('[data-day="1"]');

  await expect(firstDay.locator('[data-card-template="service_offer_card"]').first()).toHaveAttribute("data-card-variant", "special");
  await expect(firstDay.getByText("специально для вас", { exact: false })).toBeVisible();
  await expect(firstDay.getByText("подходит вам", { exact: true })).toHaveCount(2);
  await expect(firstDay.getByLabel(/До окончания предложения/)).toHaveText(/^\d{2}:\d{2}:\d{2}$/);

  await page.getByRole("button", { name: "Сортировка", exact: true }).click();
  await page.getByRole("radio", { name: "сначала ближайшие", exact: true }).click();

  const distances = await firstDay.locator('[data-card-template="service_offer_card"] [data-testid="service-offer-address"]').evaluateAll((nodes) => nodes.map((node) => {
    const match = node.textContent?.match(/([\d,.]+)\s*(км|м)\s*$/);
    if (!match) return Number.POSITIVE_INFINITY;
    const value = Number.parseFloat(match[1].replace(",", "."));
    return match[2] === "км" ? value * 1000 : value;
  }));

  expect(distances[0]).toBe(Math.min(...distances));
  await expect(firstDay.getByText("специально для вас", { exact: false })).toBeVisible();
});

test("общий каталог не возвращает карточки, исключённые радиусом", async ({ page }) => {
  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).uncheck();
  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("button", { name: "1 км", exact: true }).click();
  await page.getByRole("button", { name: "применить", exact: true }).click();

  const firstDay = page.locator('[data-day="1"]');
  const cards = firstDay.locator('[data-card-template="service_offer_card"]');
  await expect(cards).toHaveCount(3);
  await expect(page.getByRole("checkbox", { name: "подходит мне", exact: true })).not.toBeChecked();

  const distances = await cards.locator('[data-testid="service-offer-address"]').evaluateAll((nodes) => nodes.map((node) => {
    const match = node.textContent?.match(/([\d,.]+)\s*(км|м)\s*$/);
    if (!match) return Number.POSITIVE_INFINITY;
    const value = Number.parseFloat(match[1].replace(",", "."));
    return match[2] === "км" ? value * 1000 : value;
  }));

  expect(distances.every((distance) => distance <= 1_000)).toBe(true);
});

test("полностью отфильтрованный день предлагает изменить фильтры без раскрытия исключённых карточек", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("textbox", { name: "Минимальная стоимость", exact: true }).fill("99999");
  await page.getByRole("button", { name: "применить", exact: true }).click();

  const firstDay = page.locator('[data-day="1"]');
  const state = firstDay.locator('[data-ui-state="catalog.filtered_empty"]');
  await expect(state).toBeVisible();
  await expect(firstDay.locator('[data-card-template="service_offer_card"]')).toHaveCount(0);
  await expect(state.getByRole("button", { name: "показать остальные", exact: true })).toHaveCount(0);
  await state.getByRole("button", { name: "изменить фильтры", exact: true }).click();
  await expect(page.getByRole("heading", { name: "фильтры", exact: true })).toBeVisible();
});

test("общий каталог показывает конфликты с основной сменой, но не разрешает запись", async ({ page }) => {
  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).uncheck();
  const busyDay = page.locator('[data-day="3"]');
  const cards = busyDay.locator('[data-card-template="service_offer_card"]');
  await expect(cards).toHaveCount(5);
  await cards.first().getByRole("button", { name: /Подробнее:/ }).click();
  await expect(page.getByRole("button", { name: "недоступно в этот день", exact: true })).toBeDisabled();
});

test("personal feed объясняет busy day и раскрывает общий каталог", async ({ page }) => {
  const busyDay = page.locator('[data-day="3"]');
  const state = busyDay.locator('[data-ui-state="catalog.filtered_empty"]');
  await expect(state).toContainText("скрыты из-за настроек доступности");
  await state.getByRole("button", { name: "показать остальные", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "подходит мне", exact: true })).not.toBeChecked();
  await expect(busyDay.locator('[data-card-template="service_offer_card"]')).toHaveCount(5);
});

test("в моих заданиях показаны демо-записи с разными статусами", async ({ page }) => {
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  const records = page.getByRole("region", { name: "Мои задания", exact: true }).locator("article");

  await expect(records).toHaveCount(4);
  await expect(records).toContainText(["записаны", "на подтверждении", "смена завершена", "отменена"]);
});

test("задание на подписание использует отдельную карточку и регион", async ({ page }) => {
  await page.getByRole("button", { name: "задания на подписание", exact: true }).click();
  const region = page.getByRole("region", { name: "Задания на подписание", exact: true });
  const card = region.locator('[data-card-template="signing_card"]');

  await expect(region).toBeVisible();
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute("data-card-variant", "waiting_user");
  await expect(card).toContainText("на подписание");
});

test("карточка услуги открывается с клавиатуры без вложенных interactive controls", async ({ page }) => {
  const openCard = page.getByRole("button", { name: /Подробнее:/ }).first();
  await expect(page.locator('[data-card-template] button button, [data-card-template] [role="button"] button')).toHaveCount(0);

  await openCard.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "детали задания", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Назад к заданиям", exact: true }).click();

  await page.getByRole("button", { name: /Подробнее:/ }).first().focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("heading", { name: "детали задания", exact: true })).toBeVisible();
});

test("runtime не пишет warnings, errors или unhandled page errors", async ({ page }) => {
  const issues = [];
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));

  await page.reload();
  await dismissSettingsOnboarding(page);
  await page.waitForTimeout(250);
  expect(issues).toEqual([]);
});

test("карточки сохраняют узкий viewport и reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.reload();
  await dismissSettingsOnboarding(page);

  const card = page.locator('[data-card-template="service_offer_card"]').first();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeLessThanOrEqual(320);
  await expect(card).toHaveCSS("animation-name", "none");
  await expect(card.getByRole("button", { name: /Подробнее:/ })).toBeVisible();
});

test("состояния отфильтрованных и отсутствующих заданий не смешиваются", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  await page.getByRole("button", { name: "выберите дни", exact: true }).click();
  await page.locator(".availability-calendar").getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("button", { name: "готово", exact: true }).click();
  await page.getByRole("button", { name: "сохранить", exact: true }).click();
  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).check();

  const filteredDay = page.locator('[data-day="1"]');
  await expect(filteredDay.getByText("в этот день нет подходящих услуг", { exact: true })).toBeVisible();
  await expect(filteredDay.getByText("в этот день услуг нет", { exact: true })).toHaveCount(0);
  await expect(filteredDay.getByText(/5 услуг скрыты из-за настроек доступности/)).toBeVisible();
  await filteredDay.getByRole("button", { name: /показать остальные/ }).click();
  await expect(filteredDay.locator('[data-card-template="service_offer_card"]')).toHaveCount(5);
  await expect(filteredDay.getByText("в этот день нет подходящих услуг", { exact: true })).toHaveCount(0);
  await filteredDay.getByRole("button", { name: "скрыть неподходящие", exact: true }).click();
  await expect(filteredDay.locator('[data-card-template="service_offer_card"]')).toHaveCount(0);
  await expect(filteredDay.getByText("в этот день нет подходящих услуг", { exact: true })).toBeVisible();

  const emptyDay = page.locator('[data-day="14"]');
  await expect(emptyDay.getByText("в этот день услуг нет", { exact: true })).toBeVisible();
  await expect(emptyDay.getByText("в этот день нет подходящих услуг", { exact: true })).toHaveCount(0);
});

test("карточка скрытых заданий показывает актуальные действия", async ({ page }) => {
  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).check();
  const firstDay = page.locator('[data-day="1"]');
  const filteredNotice = firstDay.locator('[data-ui-state="catalog.partially_hidden"]');

  await expect(filteredNotice.getByRole("button", { name: "подписаться на новые задания", exact: true })).toBeVisible();
  await expect(filteredNotice.getByRole("button", { name: /показать остальные/ })).toBeVisible();
  await filteredNotice.getByRole("button", { name: /показать остальные/ }).click();
  await expect(firstDay.locator('[data-card-template="service_offer_card"]')).toHaveCount(5);
  await expect(firstDay.getByRole("button", { name: "скрыть неподходящие", exact: true })).toBeVisible();
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
  const collectionCard = page.locator('[data-card-template="saved_collection_card"]').filter({ has: page.getByRole("heading", { name: "новая подборка", exact: true }) });
  await expect(collectionCard).toBeVisible();
  await expect(collectionCard.getByText("до 50 км", { exact: true })).toBeVisible();
  await expect(collectionCard.getByRole("img", { name: "Пятёрочка", exact: true })).toBeVisible();

  await collectionCard.getByRole("button", { name: "Настройки подборки новая подборка", exact: true }).click();
  await page.getByRole("button", { name: "Перекрёсток", exact: true }).click();
  await page.getByRole("button", { name: "применить", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  const updatedCollectionCard = page.locator('[data-card-template="saved_collection_card"]').filter({ has: page.getByRole("heading", { name: "новая подборка", exact: true }) });
  await expect(updatedCollectionCard.getByRole("img", { name: "Перекрёсток", exact: true })).toBeVisible();

  await updatedCollectionCard.getByRole("button", { name: "показать задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Список заданий", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  await page.locator('[data-card-template="saved_collection_card"] [aria-label^="Удалить подборку"]').evaluate((button) => button.click());
  await expect(page.getByText("Сохранённых подборок пока нет", { exact: true })).toBeVisible();
});

test("адрес, радиус и выдача синхронизированы в сессии и сбрасываются после перезагрузки", async ({ page }) => {
  await page.route(/nominatim\.openstreetmap\.org\/search/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ display_name: "Москва, Красная площадь, 1", lat: "55.7539", lon: "37.6208" }]),
    });
  });

  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("button", { name: "территория", exact: true }).click();
  await expect(page.getByRole("button", { name: "применить", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Адрес для поиска", exact: true }).fill("Красная площадь");
  await expect(page.getByRole("button", { name: /Красная площадь, 1/ })).toBeVisible();
  await page.getByRole("button", { name: /Красная площадь, 1/ }).click();
  await expect(page.getByRole("textbox", { name: "Адрес для поиска", exact: true })).toHaveValue("Москва, Красная площадь, 1");
  await page.getByRole("button", { name: "50 км", exact: true }).click();
  await page.getByRole("button", { name: "применить", exact: true }).click();
  await expect(page.getByText("Новая территория применится после сохранения", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "применить", exact: true }).click();

  await page.getByRole("button", { name: "Открыть задания на карте", exact: true }).click();
  await expect(page.getByRole("button", { name: "применить", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "50 км", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("textbox", { name: "Адрес для поиска", exact: true })).toHaveValue("Москва, Красная площадь, 1");
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

  await page.reload();
  await dismissSettingsOnboarding(page);
  await page.getByRole("button", { name: "Открыть задания на карте", exact: true }).click();
  await expect(page.getByRole("button", { name: "1 км", exact: true })).toHaveAttribute("aria-pressed", "true");
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

test("настройки доступности применяются в сессии и сбрасываются после перезагрузки", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
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

  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Доступен с", exact: true })).toHaveValue("09:30");
  await expect(page.getByRole("button", { name: "короткие 4–6 часов", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "обычные 8–9 часов", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await dismissSettingsOnboarding(page);
  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Доступен с", exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "короткие 4–6 часов", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "обычные 8–9 часов", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("периоды доступности поддерживают мультивыбор и ручной ввод", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  const allDay = page.getByRole("button", { name: "весь день", exact: true });
  const morning = page.getByRole("button", { name: "утро", exact: true });
  const evening = page.getByRole("button", { name: "вечер", exact: true });

  await expect(allDay).toHaveAttribute("aria-pressed", "false");
  await morning.click();
  await evening.click();
  await expect(morning).toHaveAttribute("aria-pressed", "true");
  await expect(evening).toHaveAttribute("aria-pressed", "true");

  await morning.click();
  await expect(morning).toHaveAttribute("aria-pressed", "false");
  await expect(evening).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("textbox", { name: "Доступен с", exact: true }).fill("17:00");
  await expect(evening).toHaveAttribute("aria-pressed", "false");
});

test("запись на смену появляется в истории и не дублируется", async ({ page }) => {
  const taskCard = page.locator('[data-card-template="service_offer_card"]').first();
  const taskName = await taskCard.locator("h2").textContent();
  await taskCard.getByRole("button", { name: `Подробнее: ${taskName}`, exact: true }).click();
  await page.getByRole("button", { name: "записаться", exact: true }).click();
  await expect(page.getByText("вы записаны", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Мои задания", exact: true })).toContainText(taskName || "");
  await expect(page.getByRole("region", { name: "Мои задания", exact: true }).locator("article").filter({ hasText: "записаны" })).toHaveCount(2);

  await page.reload();
  await dismissSettingsOnboarding(page);
  await expect(page.getByRole("region", { name: "Список заданий", exact: true }).getByRole("button", { name: `Подробнее: ${taskName}`, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Мои задания", exact: true })).toContainText(taskName || "");
});

test("запись блокируется при пересечении с принятой подработкой", async ({ page }) => {
  const sixthDay = page.locator('[data-day="6"]');
  await sixthDay.getByRole("button", { name: "показать остальные", exact: true }).click();
  const sixthDayAction = sixthDay.getByRole("button", { name: /Подробнее:/ }).first();
  await expect(sixthDayAction).toBeVisible();
  await sixthDayAction.click();
  await expect(page.getByRole("button", { name: "недоступно в этот день", exact: true })).toBeDisabled();
});
