import { expect, test } from "@playwright/test";

async function dismissSettingsOnboarding(page) {
  const onboarding = page.getByRole("button", { name: "Закрыть подсказку настроек", exact: true });
  await expect(onboarding).toBeVisible({ timeout: 6_000 });
  await onboarding.click({ force: true });
  await expect(onboarding).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("status", { name: "Запуск сервиса", exact: true })).toBeVisible();
  await expect(page.getByText("настройте дни и часы доступности к подработкам", { exact: true })).toBeVisible({ timeout: 5000 });
  await dismissSettingsOnboarding(page);
});

test("запуск сервиса показывает спиннер, скелетоны и онбординг на каждом reload", async ({ page }) => {
  await page.reload();

  await expect(page.getByRole("status", { name: "Запуск сервиса", exact: true })).toBeVisible();
  await expect(page.locator('[data-ui-state="service_offer.skeleton"]')).toHaveCount(2, { timeout: 1500 });
  await expect(page.getByText("настройте дни и часы доступности к подработкам", { exact: true })).toBeVisible();
  const [onboardingTarget, settingsButton] = await Promise.all([
    page.locator(".settings-onboarding-target").boundingBox(),
    page.locator(".filter-icon-button-availability").boundingBox(),
  ]);
  expect(onboardingTarget).not.toBeNull();
  expect(settingsButton).not.toBeNull();
  expect(onboardingTarget.x + onboardingTarget.width / 2).toBeCloseTo(settingsButton.x + settingsButton.width / 2, 0);
  expect(onboardingTarget.y + onboardingTarget.height / 2).toBeCloseTo(settingsButton.y + settingsButton.height / 2, 0);
  await dismissSettingsOnboarding(page);
  await expect(page.getByText("настройте дни и часы доступности к подработкам", { exact: true })).toBeHidden();

  await page.reload();
  await expect(page.getByText("настройте дни и часы доступности к подработкам", { exact: true })).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Открыть настройки расписания", exact: true }).click();
  await expect(page.getByRole("heading", { name: "настройки расписания", exact: true })).toBeVisible();
});

test("выбор даты, сортировка и программный возврат к началу", async ({ page }) => {
  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await expect(page.getByRole("region", { name: "Избранное", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "задания", exact: true }).click();

  const targetDay = page.locator(".date-timeline button").nth(8);
  await targetDay.click();
  await expect(targetDay).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeGreaterThan(320);

  await page.getByRole("button", { name: "Сортировка", exact: true }).click();
  await page.getByRole("radio", { name: "сначала ближайшие", exact: true }).click();

  await page.locator(".screen").evaluate((element) => {
    element.scrollTop = 800;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeGreaterThan(320);
  await page.locator(".screen").evaluate((element) => { element.scrollTop = 0; });
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeLessThan(2);
});

test("специальное для вас приоритетно без сортировки и участвует в сортировке", async ({ page }) => {
  const firstDay = page.locator("[data-day-key]").first();

  await expect(firstDay.locator('[data-card-template="service_offer_card"]').first()).toHaveAttribute("data-card-variant", "special");
  await expect(firstDay.getByText("специально для вас", { exact: false })).toBeVisible();
  await expect(firstDay.getByText("подходит вам", { exact: true })).toHaveCount(0);
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

  const firstDay = page.locator("[data-day-key]").first();
  const cards = firstDay.locator('[data-card-template="service_offer_card"]');
  await expect.poll(() => cards.count()).toBeGreaterThan(0);
  await expect.poll(() => cards.count()).toBeLessThan(60);
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

  const firstDay = page.locator("[data-day-key]").first();
  const state = firstDay.locator('[data-ui-state="catalog.filtered_empty"]');
  await expect(state).toBeVisible();
  await expect(firstDay.locator('[data-card-template="service_offer_card"]')).toHaveCount(0);
  await expect(state.getByRole("button", { name: "показать остальные", exact: true })).toHaveCount(0);
  await state.getByRole("button", { name: "изменить фильтры", exact: true }).click();
  await expect(page.getByRole("heading", { name: "фильтры", exact: true })).toBeVisible();
});

test("общий каталог исключает конфликты с основной сменой", async ({ page }) => {
  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).uncheck();
  const busyDay = page.locator("[data-day-key]").nth(4);
  const cards = busyDay.locator('[data-card-template="service_offer_card"]');
  await expect.poll(() => cards.count()).toBeGreaterThan(0);
  await expect.poll(() => cards.count()).toBeLessThan(60);
  await expect(busyDay.locator('[data-card-template="employee_shift_card"]')).toBeVisible();
});

test("personal feed раскрывает только непротиворечащие смене остальные услуги", async ({ page }) => {
  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).check();
  const busyDay = page.locator("[data-day-key]").nth(4);
  await expect(busyDay.locator('[data-card-template="service_offer_card"]')).toHaveCount(0);
  await busyDay.getByRole("button", { name: /показать остальные/ }).click();
  await expect.poll(() => busyDay.locator('[data-card-template="service_offer_card"]').count()).toBeGreaterThan(0);
  await expect.poll(() => busyDay.locator('[data-card-template="service_offer_card"]').count()).toBeLessThan(60);
});

test("исключённые фильтрами услуги дают recovery без раскрытия карточек", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("textbox", { name: "Минимальная стоимость", exact: true }).fill("99999");
  await page.getByRole("button", { name: "применить", exact: true }).click();

  const firstDay = page.locator("[data-day-key]").first();
  const state = firstDay.locator('[data-ui-state="catalog.filtered_empty"]');
  await expect(state).toHaveCount(1);
  await expect(state).toContainText("скрыты из-за фильтров");
  await expect(state.getByRole("button", { name: "изменить фильтры", exact: true })).toBeVisible();
  await expect(state.getByRole("button", { name: "показать остальные", exact: true })).toHaveCount(0);
});

test("в моих заданиях показаны демо-записи с разными статусами", async ({ page }) => {
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  const records = page.getByRole("region", { name: "Мои задания", exact: true }).locator("article");

  await expect(records).toHaveCount(4);
  await expect(records).toContainText(["записаны", "на подтверждении", "смена завершена", "отменена"]);
});

test("[SCN-FAVORITES-007][SCN-FAVORITES-008] избранные услуги открываются и удаляются по утверждённому контракту", async ({ page }) => {
  await page.getByRole("button", { name: "избранное", exact: true }).click();
  const favorites = page.getByRole("region", { name: "Избранное", exact: true });
  const cards = favorites.locator('[data-card-template="service_offer_card"]');
  const servicesTab = favorites.getByRole("tab", { name: "услуги", exact: true });

  await expect(servicesTab).toHaveAttribute("aria-selected", "true");
  await expect(favorites.getByRole("tab")).toHaveText(["услуги", "магазины", "подборки"]);
  await expect(favorites.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "favorites-tab-services");
  await servicesTab.focus();
  await page.keyboard.press("ArrowRight");
  const storesTab = favorites.getByRole("tab", { name: "магазины", exact: true });
  await expect(storesTab).toHaveAttribute("aria-selected", "true");
  await expect(storesTab).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(servicesTab).toHaveAttribute("aria-selected", "true");
  await expect(servicesTab).toBeFocused();
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAttribute("data-card-variant", "default");
  await expect(cards.nth(1)).toHaveAttribute("data-card-variant", "favorite_unavailable");
  await expect(favorites.getByText("доступные", { exact: true })).toBeVisible();
  await expect(favorites.getByText("больше недоступны", { exact: true })).toBeVisible();
  await expect(cards.nth(1).getByText("больше недоступно", { exact: true })).toBeVisible();
  await expect(cards.nth(1).getByRole("button", { name: "удалить из избранного", exact: true })).toBeVisible();
  await expect(cards.nth(1).getByRole("button", { name: /Подробнее:/ })).toHaveCount(0);

  const availableTitle = await cards.nth(0).locator("h2").textContent();
  await cards.nth(0).getByRole("button", { name: `Подробнее: ${availableTitle}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "детали задания", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Назад к заданиям", exact: true }).click();
  await expect(favorites).toBeVisible();

  const unavailableCard = favorites.locator('[data-card-variant="favorite_unavailable"]');
  await unavailableCard.getByRole("button", { name: "удалить из избранного", exact: true }).click();
  await expect(unavailableCard).toHaveCount(0);
  await expect(favorites.locator('[data-card-template="service_offer_card"]')).toHaveCount(1);
  await expect(favorites.getByText("больше недоступны", { exact: true })).toHaveCount(0);
});

test("[SCN-SIGNING-005] задания на подписание показывают утверждённые состояния и переводят документ на проверку", async ({ page }) => {
  await page.getByRole("button", { name: "задания на подписание", exact: true }).click();
  const region = page.getByRole("region", { name: "Задания на подписание", exact: true });
  const cards = region.locator('[data-card-template="signing_card"]');
  const waitingCard = region.locator('[data-record-id="demo-signing-task-ready"]');

  await expect(region).toBeVisible();
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toHaveAttribute("data-card-variant", "waiting_user");
  await expect(cards.nth(1)).toHaveAttribute("data-card-variant", "processing");
  await expect(cards.nth(2)).toHaveAttribute("data-card-variant", "signed");
  await expect(cards.nth(3)).toHaveAttribute("data-card-variant", "rejected");
  await expect(cards).toContainText(["на подписание", "на проверке", "подписано", "отклонено"]);
  await expect(waitingCard.getByRole("button", { name: "подписать", exact: true })).toBeVisible();
  await expect(region.getByRole("button", { name: "подписать", exact: true })).toHaveCount(1);

  await waitingCard.getByRole("button", { name: "подписать", exact: true }).click();
  await expect(waitingCard).toHaveAttribute("data-card-variant", "processing");
  await expect(waitingCard).toContainText("на проверке");
  await expect(waitingCard.getByRole("button", { name: "подписать", exact: true })).toHaveCount(0);
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

  await page.getByRole("button", { name: "избранное", exact: true }).click();
  const favorites = page.getByRole("region", { name: "Избранное", exact: true });
  const regionBox = await favorites.boundingBox();
  const tabsBox = await favorites.getByRole("tablist", { name: "Разделы избранного", exact: true }).boundingBox();
  expect(regionBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  expect(tabsBox.x).toBeGreaterThanOrEqual(regionBox.x);
  expect(tabsBox.x + tabsBox.width).toBeLessThanOrEqual(regionBox.x + regionBox.width);
  await expect(favorites.getByRole("tab")).toHaveCount(3);
});

test("состояния отфильтрованных и отсутствующих заданий не смешиваются", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  await page.getByRole("button", { name: "выберите дни", exact: true }).click();
  await page.locator(".availability-calendar .availability-day-free").first().click();
  await page.getByRole("button", { name: "готово", exact: true }).click();
  await page.getByRole("button", { name: "применить", exact: true }).click();
  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).check();

  const filteredDay = page.locator("[data-day-key]").first();
  await expect(filteredDay.getByText("в этот день нет подходящих услуг", { exact: true })).toBeVisible();
  await expect(filteredDay.getByText("в этот день услуг нет", { exact: true })).toHaveCount(0);
  await expect(filteredDay.getByText(/услуг скрыты из-за настроек доступности/)).toBeVisible();
  await filteredDay.getByRole("button", { name: /показать остальные/ }).click();
  await expect.poll(() => filteredDay.locator('[data-card-template="service_offer_card"]').count()).toBeGreaterThan(0);
  await expect(filteredDay.getByText("в этот день нет подходящих услуг", { exact: true })).toHaveCount(0);
  await filteredDay.getByRole("button", { name: "скрыть неподходящие", exact: true }).click();
  await expect(filteredDay.locator('[data-card-template="service_offer_card"]')).toHaveCount(0);
  await expect(filteredDay.getByText("в этот день нет подходящих услуг", { exact: true })).toBeVisible();

  const emptyDay = page.locator('[data-day="14"]').first();
  await expect(emptyDay.getByText("в этот день услуг нет", { exact: true })).toBeVisible();
  await expect(emptyDay.getByText("в этот день нет подходящих услуг", { exact: true })).toHaveCount(0);
});

test("[SCN-CATALOG-005] карточка скрытых заданий показывает актуальные действия", async ({ page }) => {
  await page.getByRole("checkbox", { name: "подходит мне", exact: true }).check();
  const firstDay = page.locator("[data-day-key]").first();
  const filteredNotice = firstDay.locator('[data-ui-state="catalog.partially_hidden"]');
  const hiddenServicesMessage = filteredNotice.locator('[data-ui-state="hidden_services.message"]');

  await expect(hiddenServicesMessage).toBeVisible();
  await expect(hiddenServicesMessage.getByRole("button", { name: "подписаться на новые задания", exact: true })).toBeVisible();
  await expect(hiddenServicesMessage.getByRole("button", { name: /показать остальные/ })).toBeVisible();
  await hiddenServicesMessage.getByRole("button", { name: /показать остальные/ }).click();
  await expect.poll(() => firstDay.locator('[data-card-template="service_offer_card"]').count()).toBeGreaterThan(0);
  await expect(firstDay.getByRole("button", { name: "скрыть неподходящие", exact: true })).toBeVisible();
});

test("[SCN-CATALOG-006] ошибка без данных заменяет каталог и восстанавливается по retry", async ({ page }) => {
  await page.goto("/?catalogState=error");
  await dismissSettingsOnboarding(page);
  const errorState = page.locator('[data-ui-state="catalog.error"]');
  await expect(errorState).toBeVisible({ timeout: 5_000 });
  await expect(errorState.getByRole("heading", { name: "не удалось обновить каталог", exact: true })).toBeVisible();
  await expect(page.locator('[data-card-template="service_offer_card"]')).toHaveCount(0);
  await errorState.getByRole("button", { name: "повторить", exact: true }).click();
  await expect(errorState).toBeHidden();
  await expect(page.locator('[data-card-template="service_offer_card"]').first()).toBeVisible();
});

test("[SCN-CATALOG-007] stale сохраняет карточки и восстанавливается по refresh", async ({ page }) => {
  await page.goto("/?catalogState=stale");
  await dismissSettingsOnboarding(page);
  const staleState = page.locator('[data-ui-state="catalog.stale"]');
  await expect(staleState).toBeVisible({ timeout: 5_000 });
  await expect(staleState.getByRole("heading", { name: "показаны неактуальные данные", exact: true })).toBeVisible();
  await expect(page.locator('[data-card-template="service_offer_card"]').first()).toBeVisible();
  await staleState.getByRole("button", { name: "обновить", exact: true }).click();
  await expect(staleState).toBeHidden();
  await expect(page.locator('[data-card-template="service_offer_card"]').first()).toBeVisible();
});

test("дальний переход по таймлайну показывает skeleton перед прокруткой", async ({ page }) => {
  const loadingState = page.getByRole("status", { name: "Загрузка заданий", exact: true });

  const farDay = page.locator(".date-timeline button").nth(8);
  await farDay.click();
  await expect(loadingState).toBeVisible();
  await expect(loadingState).toBeHidden({ timeout: 1_000 });
  await expect.poll(() => page.locator(".screen").evaluate((element) => element.scrollTop)).toBeGreaterThan(10);

  await page.locator(".date-timeline button").first().click();
  await expect(loadingState).toBeVisible();
  await expect(loadingState).toBeHidden({ timeout: 1_000 });
});

test("сохранённая подборка открывает выдачу и удаляется из избранного", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("button", { name: "Пятёрочка", exact: true }).click();
  await page.getByRole("button", { name: "сохранить в подборку", exact: true }).click();
  const saveDialog = page.getByRole("dialog", { name: "Сохранение подборки", exact: true });
  await expect(saveDialog).toBeVisible();
  await saveDialog.getByRole("checkbox", { name: "Письмо на почту", exact: true }).check();
  await saveDialog.getByRole("button", { name: "раз в день", exact: true }).click();
  await saveDialog.getByRole("button", { name: "сохранить подборку", exact: true }).click();
  await expect(page.getByRole("button", { name: "подборка сохранена", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Перекрёсток", exact: true }).click();
  await expect(page.getByRole("button", { name: "сохранить в подборку", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Назад к заданиям", exact: true }).click();

  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  const collectionCard = page.locator('[data-card-template="saved_collection_card"]').filter({ has: page.getByRole("heading", { name: "новая подборка", exact: true }) });
  await expect(collectionCard).toBeVisible();
  await expect(collectionCard.getByText("до 50 км", { exact: true })).toBeVisible();
  await expect(collectionCard.getByRole("img", { name: "Пятёрочка", exact: true })).toBeVisible();

  await collectionCard.getByRole("button", { name: "Настройки подборки новая подборка", exact: true }).click();
  await collectionCard.getByRole("button", { name: "изменить подборку", exact: true }).click();
  await page.getByRole("button", { name: "Перекрёсток", exact: true }).click();
  await page.getByRole("button", { name: "применить", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  const updatedCollectionCard = page.locator('[data-card-template="saved_collection_card"]').filter({ has: page.getByRole("heading", { name: "новая подборка", exact: true }) });
  await expect(updatedCollectionCard.getByRole("img", { name: "Перекрёсток", exact: true })).toBeVisible();

  await updatedCollectionCard.getByRole("button", { name: "показать задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Список заданий", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  const removableCollection = page.locator('[data-card-template="saved_collection_card"]').filter({ has: page.getByRole("heading", { name: "новая подборка", exact: true }) });
  await removableCollection.getByRole("button", { name: "Настройки подборки новая подборка", exact: true }).click();
  await removableCollection.getByRole("button", { name: "удалить подборку", exact: true }).click();
  await expect(page.getByRole("heading", { name: "новая подборка", exact: true })).toHaveCount(0);
  await expect(page.locator('[data-card-template="saved_collection_card"]')).toHaveCount(3);
});

test("[SCN-FAVORITES-012] пустая подборка предлагает изменить условия и не открывает пустую выдачу", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть фильтры", exact: true }).click();
  await page.getByRole("textbox", { name: "Минимальная стоимость", exact: true }).fill("99999");
  await page.getByRole("button", { name: "сохранить в подборку", exact: true }).click();
  const saveDialog = page.getByRole("dialog", { name: "Сохранение подборки", exact: true });
  await saveDialog.getByRole("button", { name: "сохранить подборку", exact: true }).click();
  await page.getByRole("button", { name: "Назад к заданиям", exact: true }).click();

  await page.getByRole("button", { name: "избранное", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  const emptyCollection = page.locator('[data-card-template="saved_collection_card"][data-card-variant="empty_collection"]');
  await expect(emptyCollection).toBeVisible();
  await expect(emptyCollection.getByText("сейчас подходящих заданий нет", { exact: true })).toBeVisible();
  await expect(emptyCollection.getByText("измените условия подборки — покажем новые варианты", { exact: true })).toBeVisible();
  await expect(emptyCollection.getByRole("button", { name: "показать задания", exact: true })).toHaveCount(0);
  await emptyCollection.getByRole("button", { name: "изменить подборку", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Минимальная стоимость", exact: true })).toHaveValue("99999");

  await page.getByRole("button", { name: "Назад к заданиям", exact: true }).click();
  await page.getByRole("tab", { name: "подборки", exact: true }).click();
  const removableCollection = page.locator('[data-card-template="saved_collection_card"][data-card-variant="empty_collection"]');
  await removableCollection.getByRole("button", { name: "Настройки подборки новая подборка", exact: true }).click();
  await expect(removableCollection.getByRole("button", { name: "удалить подборку", exact: true })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "1 км", exact: true })).toHaveAttribute("aria-pressed", "false");
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
  await page.locator(".availability-calendar .availability-day-free").first().click();
  await page.getByRole("button", { name: "готово", exact: true }).click();
  await page.getByRole("textbox", { name: "Доступен с", exact: true }).fill("09:30");
  await page.getByRole("button", { name: "короткие 4–6 часов", exact: true }).click();
  await page.getByRole("button", { name: "обычные 8–9 часов", exact: true }).click();
  await expect(page.getByRole("button", { name: "короткие 4–6 часов", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "обычные 8–9 часов", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "применить", exact: true }).click();

  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Доступен с", exact: true })).toHaveValue("09:30");
  await expect(page.getByRole("button", { name: "короткие 4–6 часов", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "обычные 8–9 часов", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await dismissSettingsOnboarding(page);
  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Доступен с", exact: true })).toHaveValue("08:00");
  await expect(page.getByRole("button", { name: "короткие 4–6 часов", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "обычные 8–9 часов", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("периоды доступности поддерживают мультивыбор и ручной ввод", async ({ page }) => {
  await page.getByRole("button", { name: "Открыть настройки доступности", exact: true }).click();
  const allDay = page.getByRole("button", { name: "весь день", exact: true });
  const morning = page.getByRole("button", { name: "утро", exact: true });
  const evening = page.getByRole("button", { name: "вечер", exact: true });

  await expect(allDay).toHaveAttribute("aria-pressed", "true");
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
  const taskId = await taskCard.getAttribute("data-card-id");
  const taskName = await taskCard.locator("h2").textContent();
  await taskCard.getByRole("button", { name: `Подробнее: ${taskName}`, exact: true }).click();
  await page.getByRole("button", { name: "записаться", exact: true }).click();
  await expect(page.getByText("вы записаны", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Мои задания", exact: true })).toContainText(taskName || "");
  await expect(page.getByRole("region", { name: "Мои задания", exact: true }).locator("article").filter({ hasText: "записаны" })).toHaveCount(2);

  await page.reload();
  await dismissSettingsOnboarding(page);
  await expect(page.getByRole("region", { name: "Список заданий", exact: true }).locator(`[data-card-id="${taskId}"]`)).toHaveCount(0);
  await page.getByRole("button", { name: "мои задания", exact: true }).click();
  await expect(page.getByRole("region", { name: "Мои задания", exact: true })).toContainText(taskName || "");
});

test("принятая подработка исключает пересекающиеся услуги из каталога", async ({ page }) => {
  await page.getByRole("button", { name: /^6 / }).first().click();
  const sixthDay = page.locator('[data-day="6"]');
  await expect(sixthDay.locator('[data-card-template="employee_shift_card"][data-card-variant="accepted_extra_shift"]')).toBeVisible();
  await expect(sixthDay.getByRole("button", { name: "показать остальные", exact: true })).toHaveCount(0);
  await expect(sixthDay.locator('[data-card-variant="restriction_tags"]')).toHaveCount(0);
});
