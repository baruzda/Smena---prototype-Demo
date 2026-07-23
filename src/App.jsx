import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getTaskHours, shiftsOverlap } from "./schedule-utils.js";
import { Badge, Button } from "./shared/ui/index.js";
import { MyTaskCard as MyTaskCardView } from "./features/my-tasks/components/MyTaskCard/index.js";
import { EmployeeShiftCard as EmployeeShiftCardView } from "./features/schedule/components/EmployeeShiftCard/index.js";
import { TaskCardShell } from "./features/tasks/components/TaskCardShell/index.js";
import { taskCardStyles } from "./features/tasks/components/TaskCard/index.js";

const assetUrl = (name) => `${import.meta.env.BASE_URL}figma-assets/${name}`;
const cssAssetUrl = (name) => {
  const href = typeof window === "undefined" ? assetUrl(name) : new URL(assetUrl(name), window.location.href).href;
  return `url("${href}")`;
};

const tabs = ["задания", "избранное", "мои задания", "задания на подписание"];
const metroIconAssets = {
  msk: "metro-msk.svg",
  spb: "metro-spb.svg",
  nino: "metro-nino.svg",
};

const defaultCollectionBrands = ["pyaterochka", "perekrestok", "vprok", "chizhik"];
const timelineToday = new Date();
timelineToday.setHours(12, 0, 0, 0);
const timelineEnd = new Date(timelineToday.getFullYear(), timelineToday.getMonth() + 2, 0, 12);
const days = Array.from({ length: Math.round((timelineEnd - timelineToday) / 86_400_000) + 1 }, (_, index) => {
  const calendarDate = new Date(timelineToday);
  calendarDate.setDate(timelineToday.getDate() + index);
  return {
    calendarDate,
    date: String(calendarDate.getDate()),
    isMonthStart: index === 0 || calendarDate.getDate() === 1,
    monthLabel: calendarDate.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""),
    weekday: ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][calendarDate.getDay()],
  };
});

const calendarWeekdays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const weekdayNames = {
  "пн": "Пн",
  "вт": "Вт",
  "ср": "Ср",
  "чт": "Чт",
  "пт": "Пт",
  "сб": "Сб",
  "вс": "Вс",
};

const prototypeToday = new Date();
prototypeToday.setHours(12, 0, 0, 0);

function buildAvailabilityCalendar(monthOffset) {
  const shownMonth = new Date(prototypeToday.getFullYear(), prototypeToday.getMonth() + monthOffset, 1);
  const firstWeekday = (shownMonth.getDay() + 6) % 7;
  const gridStart = new Date(shownMonth);
  gridStart.setDate(1 - firstWeekday);

  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isCurrentMonth = date.getMonth() === shownMonth.getMonth();
    const isPast = date < prototypeToday;
    const day = date.getDate();
    const isFree = isCurrentMonth && !isPast && (day - 1) % 4 < 2;
    return {
      id: date.toISOString().slice(0, 10),
      day,
      month: isCurrentMonth ? "current" : "outside",
      selectionKey: monthOffset === 0 ? String(day) : `next-${day}`,
      status: isFree ? "free" : "busy",
      weekday: calendarWeekdays[(date.getDay() + 6) % 7],
    };
  });

  return cells.slice(-7).some((day) => day.month === "current") ? cells : cells.slice(0, -7);
}

const availabilityByDate = Object.fromEntries(
  days.map(({ date }, index) => [date, index % 5 === 4 ? "busy" : "free"]),
);

const defaultSearchLocation = {
  coords: [55.7582, 37.7041],
  label: "улица Лефортовский Вал",
};

const emptySearchLocation = {
  coords: defaultSearchLocation.coords,
  label: "",
};

const emptyFilters = { brands: [], minimumPayment: "", service: [], stores: [] };

function normalizeSelectedServices(value) {
  const services = Array.isArray(value) ? value : typeof value === "string" && value.trim() ? [value] : [];
  return [...new Set(services.map((service) => service.trim()).filter(Boolean))];
}

function normalizeSelectedStores(value) {
  const stores = Array.isArray(value) ? value : typeof value === "string" && value.trim() ? [value] : [];
  return [...new Set(stores.map((store) => store.trim()).filter(Boolean))];
}

function getServiceSelectionSummary(value, emptyLabel = "услуга") {
  const services = normalizeSelectedServices(value);
  if (services.length === 0) return emptyLabel;
  if (services.length === 1) return services[0];
  return `${services.length} ${getRussianPlural(services.length, ["услуга выбрана", "услуги выбраны", "услуг выбрано"])}`;
}

const emptyAvailabilityTime = { from: "", to: "", preset: null, presets: [] };

const prototypeDefaultStateVersion = 4;
const availabilityTimePresets = [
  { id: "all-day", label: "весь день", from: "08:00", to: "22:00" },
  { id: "morning", label: "утро", from: "08:00", to: "12:00" },
  { id: "afternoon", label: "день", from: "12:00", to: "16:00" },
  { id: "evening", label: "вечер", from: "16:00", to: "22:00" },
  { id: "night", label: "ночью", from: "22:00", to: "6:00" },
];
const defaultAvailabilityTime = { from: "08:00", to: "22:00", preset: "all-day", presets: ["all-day"] };

function isVisualDefaultAvailability({ from, preset, presets, to }) {
  const presetIds = Array.isArray(presets) ? presets : preset ? [preset] : [];
  return from === defaultAvailabilityTime.from
    && to === defaultAvailabilityTime.to
    && presetIds.length === 1
    && presetIds[0] === "all-day";
}

const prototypeStorageKey = "x5-shift-prototype-state";

function readPrototypeState() {
  try {
    const state = JSON.parse(window.localStorage.getItem(prototypeStorageKey) || "{}");
    return state.defaultStateVersion === prototypeDefaultStateVersion ? state : {};
  } catch {
    return {};
  }
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (window.__leafletLoading) return window.__leafletLoading;

  window.__leafletLoading = new Promise((resolve, reject) => {
    const stylesheet = document.createElement("link");
    stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    stylesheet.rel = "stylesheet";
    document.head.appendChild(stylesheet);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = () => {
      window.__leafletLoading = null;
      reject(new Error("Leaflet failed to load"));
    };
    document.head.appendChild(script);
  });

  return window.__leafletLoading;
}

const acceptedGigByDate = {
  "6": {
    address: "Санкт-Петербург, пр. Энергетиков, 70",
    brand: "perekrestok",
    distance: "4,6 км",
    hours: "12:00 – 22:00",
    metro: { city: "spb", color: "#3f9c35", label: "Метро Санкт-Петербурга", station: "Ладожская" },
    title: "курьер на автомобиле",
  },
};

// Названия услуг для демо-карточек (вариант 2 из таблицы).
const DEMO_SERVICE_TITLES = [
  "погрузка-разгрузка",
  "выкладка и предпродажная подготовка",
  "формовка и выпечка",
  "сборка товара",
  "погрузка-разгрузка и выкладка",
  "комплексное обслуживание зала",
  "комплектация на РЦ",
  "управление электроштабелером",
  "комплексное обслуживание торгового объекта",
  "учёт товарных запасов",
  "сопровождение комплектации",
  "обработка некондиционного товара",
  "обеспечение безопасности",
  "обработка вторсырья и оборотной тары",
  "проверка качества товара",
  "техническое обслуживание РЦ",
  "обработка документов",
  "консультирование покупателей на КСО",
  "сборка и упаковка товара",
  "выкладка фруктов/овощей",
  "контроль и администрирование торгового зала",
  "выкладка в торговом зале",
  "приготовление и продажа напитков",
  "выкладка алкоголя",
  "выкладка гастрономии",
  "выкладка морепродуктов",
  "приготовление и выкладка собственного производства",
  "приготовление и выкладка кондитерских изделий",
  "приготовление и выкладка хлебобулочных изделий",
  "выпечка в тандыре",
  "обслуживание покупателей кафе",
  "приготовление и выкладка продуктов и кофе",
  "комплексное обслуживание кафе",
  "комплектация, приёмка, отгрузка",
  "размещение и перемещение товаров (электропогрузчик)",
  "сортировка и перемещение в зоне брака",
  "оценка качества товара",
  "складской учёт",
  "маршрутизация доставки",
  "приготовление и заготовка блюд",
  "приготовление суши и роллов",
  "приготовление пиццы",
  "проведение инвентаризации",
  "управление электропогрузчиком",
  "обработка вторсырья",
  "поддержка складской системы",
  "сопровождение приёмки и отгрузки",
  "администрирование WMS",
  "погрузка-разгрузка бананов",
  "зона бананов: приёмка, размещение и перемещение ТМЦ",
  "дозревание бананов",
];

const DEMO_STORES = [
  { id: "store-8", building: 8 },
  { id: "store-40", building: 40 },
  { id: "store-67", building: 67 },
  { id: "store-12", building: 12 },
  { id: "store-1", building: 1 },
  { id: "store-86", building: 86 },
  { id: "store-44", building: 44 },
  { id: "store-51", building: 51 },
  { id: "store-7", building: 7 },
  { id: "store-53", building: 53 },
  { id: "store-27", building: 27 },
  { id: "store-36", building: 36 },
];

function getStoreAddress(locationLabel, store) {
  const location = (locationLabel || defaultSearchLocation.label).replace(/, Россия$/u, "");
  return `${location}, д. ${store.building}`;
}

const taskTemplates = [
  {
    id: "cashier-spb",
    title: "кассир в торговом зале",
    address: "Косой переулок, 550, к. 8",
    metro: { city: "spb", color: "#d6083b", label: "Метро Санкт-Петербурга", station: "Площадь Восстания" },
    distance: "350 м",
    hours: "08:00 – 20:00",
    payment: "1 875,00 ₽",
    rate: "187 ₽/час",
    breakInfo: "11 ч + 1 ч перерыв",
    brand: "chizhik",
  },
  {
    id: "logistics-rostov",
    title: "управление транспортом",
    address: "Ростов на Дону, ул. Адмирала Долгопузова, 325",
    badge: "подходит вам",
    distance: "35 км",
    hours: "09:00 – 21:00",
    payment: "3 120,00 ₽",
    rate: "312 ₽/час",
    breakInfo: "11 ч + 1 ч перерыв",
    brand: "pyaterochka",
  },
  {
    id: "picker-moscow",
    title: "сборщик онлайн-заказов",
    address: "Москва, ул. Большая Тульская, 13",
    metro: { city: "msk", color: "#8f8f8f", label: "Метро Москвы", station: "Тульская" },
    distance: "1,2 км",
    hours: "10:00 – 22:00",
    payment: "2 640,00 ₽",
    rate: "264 ₽/час",
    breakInfo: "11 ч + 1 ч перерыв",
    brand: "perekrestok",
  },
  {
    id: "baker-nino",
    title: "пекарь",
    address: "Нижний Новгород, ул. Родионова, 187",
    metro: { city: "nino", color: "#0078c9", label: "Метро Нижнего Новгорода", station: "Горьковская" },
    distance: "2,8 км",
    hours: "07:00 – 19:00",
    payment: "2 310,00 ₽",
    rate: "231 ₽/час",
    breakInfo: "11 ч + 1 ч перерыв",
    brand: "vprok",
  },
  {
    id: "courier-spb",
    title: "курьер на автомобиле",
    address: "Санкт-Петербург, пр. Энергетиков, 70",
    distance: "4,6 км",
    hours: "12:00 – 22:00",
    payment: "2 800,00 ₽",
    rate: "280 ₽/час",
    breakInfo: "9 ч + 1 ч перерыв",
    brand: "mnogoLososya",
  },
  {
    id: "storekeeper-moscow",
    title: "кладовщик",
    address: "Москва, Варшавское шоссе, 37",
    metro: { city: "msk", color: "#8f8f8f", label: "Метро Москвы", station: "Нагатинская" },
    distance: "700 м",
    hours: "08:00 – 17:00",
    payment: "2 250,00 ₽",
    rate: "250 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "perekrestok",
  },
  {
    id: "stock-spb",
    title: "выкладка товара",
    address: "Санкт-Петербург, ул. Савушкина, 116",
    metro: { city: "spb", color: "#3f9c35", label: "Метро Санкт-Петербурга", station: "Беговая" },
    distance: "1,8 км",
    hours: "14:00 – 23:00",
    payment: "2 160,00 ₽",
    rate: "240 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "pyaterochka",
  },
  {
    id: "loader-kazan",
    title: "грузчик",
    address: "Казань, ул. Чистопольская, 75",
    distance: "3,1 км",
    hours: "06:00 – 15:00",
    payment: "2 430,00 ₽",
    rate: "270 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "chizhik",
  },
  {
    id: "barista-rostov",
    title: "бариста",
    address: "Ростов-на-Дону, пр. Будённовский, 80",
    distance: "950 м",
    hours: "09:00 – 18:00",
    payment: "2 070,00 ₽",
    rate: "230 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "mnogoLososya",
  },
  {
    id: "seller-moscow",
    title: "продавец-консультант",
    address: "Москва, ул. Миклухо-Маклая, 32а",
    metro: { city: "msk", color: "#f28c28", label: "Метро Москвы", station: "Беляево" },
    distance: "2,3 км",
    hours: "11:00 – 20:00",
    payment: "2 520,00 ₽",
    rate: "280 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "perekrestok",
  },
  {
    id: "delivery-nino",
    title: "сборщик доставки",
    address: "Нижний Новгород, ул. Белинского, 61",
    metro: { city: "nino", color: "#0078c9", label: "Метро Нижнего Новгорода", station: "Горьковская" },
    distance: "1,1 км",
    hours: "16:00 – 23:00",
    payment: "1 960,00 ₽",
    rate: "280 ₽/час",
    breakInfo: "7 ч без перерыва",
    brand: "vprok",
  },
  {
    id: "cleaner-spb",
    title: "работник торгового зала",
    address: "Санкт-Петербург, Лиговский проспект, 30",
    metro: { city: "spb", color: "#f58220", label: "Метро Санкт-Петербурга", station: "Электросила" },
    distance: "500 м",
    hours: "13:00 – 21:00",
    payment: "1 840,00 ₽",
    rate: "230 ₽/час",
    breakInfo: "7 ч + 1 ч перерыв",
    brand: "chizhik",
  },
  {
    id: "inventory-rostov",
    title: "инвентаризация",
    address: "Ростов-на-Дону, ул. Большая Садовая, 54",
    distance: "1,7 км",
    hours: "20:00 – 06:00",
    payment: "3 600,00 ₽",
    rate: "360 ₽/час",
    breakInfo: "9 ч + 1 ч перерыв",
    brand: "pyaterochka",
  },
  {
    id: "kitchen-moscow",
    title: "помощник на кухне",
    address: "Москва, ул. Маршала Бирюзова, 19",
    metro: { city: "msk", color: "#8f8f8f", label: "Метро Москвы", station: "Аэропорт" },
    distance: "850 м",
    hours: "08:00 – 16:00",
    payment: "2 320,00 ₽",
    rate: "290 ₽/час",
    breakInfo: "7 ч + 1 ч перерыв",
    brand: "mnogoLososya",
  },
  {
    id: "acceptance-nino",
    title: "приёмщик товара",
    address: "Нижний Новгород, Московское шоссе, 12",
    distance: "5,4 км",
    hours: "07:00 – 16:00",
    payment: "2 475,00 ₽",
    rate: "275 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "vprok",
  },
  {
    id: "cashier-kazan",
    title: "кассир",
    address: "Казань, пр. Победы, 91",
    distance: "2,6 км",
    hours: "15:00 – 23:00",
    payment: "2 080,00 ₽",
    rate: "260 ₽/час",
    breakInfo: "7 ч + 1 ч перерыв",
    brand: "perekrestok",
  },
  {
    id: "packer-spb",
    title: "упаковщик заказов",
    address: "Санкт-Петербург, ул. Профессора Попова, 38",
    metro: { city: "spb", color: "#0078c9", label: "Метро Санкт-Петербурга", station: "Петроградская" },
    distance: "1,4 км",
    hours: "10:00 – 18:00",
    payment: "2 160,00 ₽",
    rate: "270 ₽/час",
    breakInfo: "7 ч + 1 ч перерыв",
    brand: "vprok",
  },
  {
    id: "merch-rostov",
    title: "мерчендайзер",
    address: "Ростов-на-Дону, ул. Красноармейская, 157",
    distance: "2,1 км",
    hours: "08:00 – 17:00",
    payment: "2 340,00 ₽",
    rate: "260 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "pyaterochka",
  },
  {
    id: "order-issue-moscow",
    title: "выдача онлайн-заказов",
    address: "Москва, ул. Ярцевская, 22",
    metro: { city: "msk", color: "#0078c9", label: "Метро Москвы", station: "Молодёжная" },
    distance: "600 м",
    hours: "12:00 – 21:00",
    payment: "2 610,00 ₽",
    rate: "290 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "perekrestok",
  },
  {
    id: "goods-check-kazan",
    title: "контроль качества товара",
    address: "Казань, ул. Декабристов, 85б",
    distance: "4,2 км",
    hours: "09:00 – 18:00",
    payment: "2 520,00 ₽",
    rate: "280 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "chizhik",
  },
  {
    id: "driver-nino",
    title: "водитель-экспедитор",
    address: "Нижний Новгород, ул. Коминтерна, 39",
    metro: { city: "nino", color: "#0078c9", label: "Метро Нижнего Новгорода", station: "Буревестник" },
    distance: "3,7 км",
    hours: "06:00 – 18:00",
    payment: "3 480,00 ₽",
    rate: "290 ₽/час",
    breakInfo: "11 ч + 1 ч перерыв",
    brand: "vprok",
  },
  {
    id: "kitchen-spb",
    title: "работник кухни",
    address: "Санкт-Петербург, Московский проспект, 139",
    metro: { city: "spb", color: "#3f9c35", label: "Метро Санкт-Петербурга", station: "Пионерская" },
    distance: "900 м",
    hours: "11:00 – 19:00",
    payment: "2 480,00 ₽",
    rate: "310 ₽/час",
    breakInfo: "7 ч + 1 ч перерыв",
    brand: "mnogoLososya",
  },
  {
    id: "night-stock-moscow",
    title: "ночная выкладка товара",
    address: "Москва, Ленинградский проспект, 62",
    metro: { city: "msk", color: "#e63535", label: "Метро Москвы", station: "Крылатское" },
    distance: "1,6 км",
    hours: "22:00 – 07:00",
    payment: "3 150,00 ₽",
    rate: "350 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "pyaterochka",
  },
  {
    id: "receiving-rostov",
    title: "приёмка поставки",
    address: "Ростов-на-Дону, пр. Стачки, 25",
    distance: "3,9 км",
    hours: "05:00 – 14:00",
    payment: "2 700,00 ₽",
    rate: "300 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "chizhik",
  },
  {
    id: "shop-assistant-kazan",
    title: "помощник продавца",
    address: "Казань, ул. Баумана, 36",
    distance: "1,3 км",
    hours: "10:00 – 19:00",
    payment: "2 205,00 ₽",
    rate: "245 ₽/час",
    breakInfo: "8 ч + 1 ч перерыв",
    brand: "perekrestok",
  },
  {
    id: "courier-nino",
    title: "велокурьер",
    address: "Нижний Новгород, ул. Большая Покровская, 82",
    distance: "2,0 км",
    hours: "17:00 – 23:00",
    payment: "2 100,00 ₽",
    rate: "350 ₽/час",
    breakInfo: "6 ч без перерыва",
    brand: "mnogoLososya",
  },
  {
    id: "bakery-moscow",
    title: "продавец пекарни",
    address: "Москва, ул. Академика Семёнова, 21",
    metro: { city: "msk", color: "#8f8f8f", label: "Метро Москвы", station: "Бунинская аллея" },
    distance: "2,5 км",
    hours: "07:00 – 15:00",
    payment: "2 320,00 ₽",
    rate: "290 ₽/час",
    breakInfo: "7 ч + 1 ч перерыв",
    brand: "pyaterochka",
  },
  {
    id: "inventory-spb",
    title: "пересчёт остатков",
    address: "Санкт-Петербург, пр. Науки, 10",
    metro: { city: "spb", color: "#3f9c35", label: "Метро Санкт-Петербурга", station: "Академическая" },
    distance: "750 м",
    hours: "19:00 – 03:00",
    payment: "2 880,00 ₽",
    rate: "360 ₽/час",
    breakInfo: "7 ч + 1 ч перерыв",
    brand: "vprok",
  },
];

taskTemplates.forEach((template, index) => {
  template.title = DEMO_SERVICE_TITLES[index % DEMO_SERVICE_TITLES.length];
});

const weekdayLongNames = { "пн": "понедельник", "вт": "вторник", "ср": "среда", "чт": "четверг", "пт": "пятница", "сб": "суббота", "вс": "воскресенье" };
const dayLabels = days.map((day, index) => {
  const dateLabel = day.calendarDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  if (index === 0) return [`сегодня, ${dateLabel}`, weekdayLongNames[day.weekday]];
  if (index === 1) return [`завтра, ${dateLabel}`, weekdayLongNames[day.weekday]];
  return [weekdayLongNames[day.weekday], dateLabel];
});

const dayGroups = days.map((day, dayIndex) => {
  const [label, secondaryLabel] = dayLabels[dayIndex];
  const firstTemplate = taskTemplates[(dayIndex * 2) % taskTemplates.length];
  const secondTemplate = taskTemplates[(dayIndex * 2 + 1) % taskTemplates.length];
  const thirdTemplate = taskTemplates[(dayIndex * 2 + 11) % taskTemplates.length];

  return {
    ...day,
    label,
    secondaryLabel,
    tasks: [firstTemplate, secondTemplate, thirdTemplate].map((task, taskIndex) => ({
      ...task,
      badge: taskIndex < 2 ? "подходит вам" : undefined,
      id: `${day.date}-${task.id}-${taskIndex}`,
    })),
  };
});

const myTaskStatuses = {
  booked: { label: "записаны", tone: "success" },
  pending: { label: "на подтверждении", tone: "warning" },
  signing: { label: "на подписание", tone: "warning" },
  completed: { label: "смена завершена", tone: "neutral" },
  cancelled: { label: "отменена", tone: "danger" },
};

const demoMyTaskRecords = [
  { day: dayGroups[1], id: "demo-my-task-booked", status: "booked", task: dayGroups[1].tasks[0] },
  { day: dayGroups[3], id: "demo-my-task-pending", status: "pending", task: dayGroups[3].tasks[1] },
  { day: dayGroups[8], id: "demo-my-task-completed", status: "completed", task: dayGroups[8].tasks[0] },
  { day: dayGroups[10], id: "demo-my-task-cancelled", status: "cancelled", task: dayGroups[10].tasks[2] },
];

const demoSigningTaskRecords = [
  { day: dayGroups[2], id: "demo-signing-task-ready", status: "signing", task: dayGroups[2].tasks[0] },
];

const sortOptions = [
  { id: "nearby", label: "сначала ближайшие" },
  { id: "recommended", label: "рекомендуемые" },
  { id: "earnings", label: "выше заработок" },
  { id: "hourly-rate", label: "выше цена за час" },
];

function getDistanceInMeters(distance) {
  const value = Number.parseFloat(distance.replace(",", "."));
  return distance.includes("км") ? value * 1000 : value;
}

function getPaymentValue(payment) {
  return Number(payment.replace(/[^\d]/g, ""));
}

function getHourlyRateValue(rate) {
  return Number(rate.replace(/[^\d]/g, ""));
}

function getTaskDuration(task) {
  const { end, start } = getTaskHours(task);
  return (end - start + 24) % 24;
}

function isTaskWithinAvailability(task, availability) {
  const { end, start } = getTaskHours(task);
  const duration = getTaskDuration(task);
  const isWithinWindow = (from, to) => {
    const availableFrom = Number.parseInt(from, 10);
    const availableTo = Number.parseInt(to, 10);
    if (![start, end, availableFrom, availableTo].every(Number.isFinite)) return true;

    const isInside = (hour) => (availableFrom < availableTo
      ? hour >= availableFrom && hour <= availableTo
      : hour >= availableFrom || hour <= availableTo);

    return Array.from({ length: duration + 1 }, (_, index) => isInside((start + index) % 24)).every(Boolean);
  };
  const selectedPresetIds = Array.isArray(availability.presets)
    ? availability.presets
    : availability.preset ? [availability.preset] : [];
  const selectedPresets = availabilityTimePresets.filter((preset) => selectedPresetIds.includes(preset.id));

  if (selectedPresets.length > 0) {
    return selectedPresets.some((preset) => isWithinWindow(preset.from, preset.to));
  }

  return isWithinWindow(availability.from, availability.to);
}

function matchesDurationPreference(task, preference) {
  const duration = getTaskDuration(task);
  if (!preference.length) return true;

  return preference.some((option) => (
    (option === "short" && duration >= 4 && duration <= 6)
    || (option === "regular" && duration >= 8 && duration <= 9)
    || (option === "long" && duration >= 10)
  ));
}

function seededValue(seed) {
  let value = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return (value >>> 0) / 4294967296;
}

function formatPayment(value) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)},00 ₽`;
}

function getShortLocationLabel(label) {
  return label.split(",")[0].trim() || "выбранная точка";
}

function getSortedTasks(tasks, sortBy) {
  if (sortBy === "recommended") {
    return [...tasks].sort((first, second) => (second.recommendation ?? 0) - (first.recommendation ?? 0));
  }

  return [...tasks].sort((first, second) => {
    if (sortBy === "nearby") {
      return getDistanceInMeters(first.distance) - getDistanceInMeters(second.distance);
    }

    if (sortBy === "hourly-rate") {
      return getHourlyRateValue(second.rate) - getHourlyRateValue(first.rate);
    }

    return getPaymentValue(second.payment) - getPaymentValue(first.payment);
  });
}

function getOrderedTasks(tasks, sortBy, hasAppliedSort) {
  if (hasAppliedSort) return getSortedTasks(tasks, sortBy);

  // Personal offers stay first until the employee explicitly chooses a sort order.
  return [
    ...tasks.filter((task) => task.variant === "special"),
    ...tasks.filter((task) => task.variant !== "special"),
  ];
}

function BrandMark({ brand }) {
  const logos = {
    pyaterochka: { alt: "Пятёрочка", src: assetUrl("logo-pyaterochka.svg") },
    perekrestok: { alt: "Перекрёсток", src: assetUrl("logo-perekrestok.svg") },
    chizhik: { alt: "Чижик", src: assetUrl("logo-chizhik.svg") },
    vprok: { alt: "Впрок", src: assetUrl("logo-vprok.svg") },
    mnogoLososya: { alt: "Много лосося", src: assetUrl("logo-mnogo-lososya.svg") },
  };
  const logo = logos[brand];

  return <img alt={logo.alt} className="brand-logo" src={logo.src} />;
}

function MetroIcon({ metro }) {
  return (
    <span
      aria-label={metro.label}
      className="metro-icon"
      style={{ "--metro-color": metro.color, "--metro-icon": cssAssetUrl(metroIconAssets[metro.city]) }}
    />
  );
}

function formatCountdown(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

function OfferCountdown({ initialSeconds = 19936, render }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const interval = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const value = formatCountdown(secondsLeft);
  const ariaLabel = `До окончания предложения ${value}`;
  return render ? render({ value, ariaLabel }) : <span aria-label={ariaLabel} className="special-card-timer">{value}</span>;
}

function getShortDayLabel(day) {
  return day?.label?.replace(/^сегодня,\s*/i, "") ?? "1 июня";
}

function getGigTaskCardVariant(task, { revealRestrictionTags = false } = {}) {
  const restrictionCount = task.restrictionTags?.length ?? 0;
  if (task.variant === "special" && restrictionCount === 0) return "special";
  if (restrictionCount > 0) return revealRestrictionTags ? "bottom-tags" : "default";
  if (task.badge) return "match";
  return "default";
}

function TaskCard({ day, revealRestrictionTags = false, task, onOpen }) {
  const cardVariant = getGigTaskCardVariant(task, { revealRestrictionTags });
  const isPersonalOffer = cardVariant === "special";
  const showMatchBadge = cardVariant === "match";
  const showStatus = cardVariant === "status" || cardVariant === "status-plus";
  const showRestrictionTags = cardVariant === "bottom-tags";
  return (
    <TaskCardShell
      ariaLabel={onOpen ? `Подробнее: ${task.title}` : undefined}
      className={isPersonalOffer ? taskCardStyles.special : undefined}
      onOpen={onOpen}
      brand={<BrandMark brand={task.brand} />}
      header={<>
          {showMatchBadge && <Badge className="gig-task-badge" tone="accent" variant="soft">подходит вам</Badge>}
          {showStatus && <Badge className="gig-task-status-label" leadingIcon={<i />} tone="success" variant="plain">{cardVariant === "status-plus" ? "есть ограничения" : "не подходит"}</Badge>}
          {isPersonalOffer && <span className="special-card-badges"><Badge tone="accent">специально для вас</Badge><OfferCountdown render={({ value, ariaLabel }) => <Badge aria-label={ariaLabel} tone="accent">{value}</Badge>} /></span>}
          <h2 className={taskCardStyles.title}>{task.title}</h2>
          <p className={taskCardStyles.address}>
            {task.metro && <MetroIcon metro={task.metro} />}
            <span>
              {task.metro && <>{task.metro.station} · </>}
              {task.address} · <img alt="" className="distance-mark" src={assetUrl("map-pin.svg")} />{task.distance}
            </span>
          </p>
      </>}
      details={<><div className={taskCardStyles.payment}>
          <p>{task.payment}</p>
          <p>{task.rate}</p>
        </div><div className={taskCardStyles.time}>
          <p>{task.hours}</p>
          <p>{task.breakInfo}</p>
        </div></>}
      restrictions={showRestrictionTags && task.restrictionTags.map((tag) => <Badge key={tag} size="small" tone="warning" variant="soft">{tag}</Badge>)}
      action={isPersonalOffer && <Button fullWidth onClick={(event) => { event.stopPropagation(); onOpen?.(); }} size="small" variant="secondary">принять задание</Button>}
    />
  );
}

function TaskSkeletonCard() {
  return (
    <article aria-label="Загрузка заданий" className="task-skeleton-card">
      <div className="task-skeleton-top"><span /><i /></div>
      <span className="task-skeleton-title" />
      <span className="task-skeleton-address" />
      <div className="task-skeleton-divider" />
      <div className="task-skeleton-bottom"><span /><span /></div>
    </article>
  );
}

function TimelineLoadingState() {
  return (
    <section aria-label="Загрузка заданий" className="timeline-loading-state" role="status">
      <TaskSkeletonCard />
      <TaskSkeletonCard />
    </section>
  );
}

function ServiceLaunchScreen() {
  return (
    <section aria-label="Запуск сервиса" className="service-launch-screen" role="status">
      <span aria-hidden="true" className="service-launch-spinner" />
    </section>
  );
}

function getRussianPlural(count, forms) {
  const remainder = Math.abs(count) % 100;
  const lastDigit = remainder % 10;
  if (remainder > 10 && remainder < 20) return forms[2];
  if (lastDigit === 1) return forms[0];
  if (lastDigit > 1 && lastDigit < 5) return forms[1];
  return forms[2];
}

function TaskMessageCard({ hiddenCount, onShowAll, variant = "no-more" }) {
  const isDayEmpty = variant === "empty-day-filtered";
  const title = isDayEmpty ? "в этот день нет подходящих услуг" : "подходящих услуг больше нет";
  const servicesLabel = `${hiddenCount} ${getRussianPlural(hiddenCount, ["услуга", "услуги", "услуг"])}`;
  const subtitle = isDayEmpty
    ? `есть ещё ${servicesLabel} по другим условиям`
    : `ещё ${servicesLabel} по другим условиям`;
  return (
    <article className={`task-message-card ${isDayEmpty ? "task-message-card-filtered-day" : "task-message-card-no-more"}`}>
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <div className="task-message-actions">
        <Button className="task-message-subscribe" fullWidth leadingIcon={<img alt="" src={assetUrl("task-hidden-star.svg")} />} variant="ghost">подписаться на новые задания</Button>
        <Button className="task-message-show-all" fullWidth onClick={onShowAll} trailingIcon={<img alt="" src={assetUrl("task-hidden-chevron-down.svg")} />} variant="primary">показать остальные</Button>
      </div>
    </article>
  );
}

function NoTasksForDayCard() {
  return (
    <article className="task-message-card task-message-card-empty">
      <h3>в этот день услуг нет</h3>
      <Button className="task-message-subscribe" fullWidth leadingIcon={<img alt="" src={assetUrl("task-hidden-star.svg")} />} variant="ghost">подписаться на новые задания</Button>
    </article>
  );
}

function CardFiltersSheet({ filters, onApply, onClose, onOpenFullFilters }) {
  const [brands, setBrands] = useState(filters.brands);
  const [minimumPayment, setMinimumPayment] = useState(filters.minimumPayment);
  const brandOptions = [
    { id: "pyaterochka", label: "Пятёрочка" },
    { id: "perekrestok", label: "Перекрёсток" },
    { id: "chizhik", label: "Чижик" },
  ];

  function toggleBrand(id) {
    setBrands((current) => current.includes(id)
      ? current.filter((brand) => brand !== id)
      : [...current, id]);
  }

  return (
    <div className="card-sheet-layer" onClick={onClose}>
      <section aria-label="Фильтры заданий" aria-modal="true" className="card-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <span aria-hidden="true" className="card-sheet-handle" />
        <div className="card-sheet-header">
          <h2>фильтры</h2>
          <button aria-label="Закрыть фильтры" className="card-sheet-close" onClick={onClose} type="button">×</button>
        </div>
        <p className="card-sheet-description">Уточните, какие смены показывать в этот день</p>
        <div className="card-sheet-brands">
          {brandOptions.map((brand) => {
            const isSelected = brands.includes(brand.id);
            return <button
              aria-pressed={isSelected}
              className={isSelected ? "brand-filter-chip brand-filter-chip-selected" : "brand-filter-chip"}
              key={brand.id}
              onClick={() => toggleBrand(brand.id)}
              type="button"
            ><BrandMark brand={brand.id} /><span>{brand.label}</span></button>;
          })}
        </div>
        <label className={minimumPayment ? "card-sheet-field card-sheet-field-filled" : "card-sheet-field"}>
          <span>мин. стоимость ₽</span>
          <input aria-label="Минимальная стоимость в боттомшите" inputMode="numeric" onChange={(event) => setMinimumPayment(event.target.value)} placeholder="Не указана" type="text" value={minimumPayment} />
        </label>
        <button className="card-sheet-link" onClick={onOpenFullFilters} type="button">все фильтры</button>
        <button className="card-sheet-primary" onClick={() => onApply({ ...filters, brands, minimumPayment })} type="button">применить</button>
      </section>
    </div>
  );
}

function CardAvailabilitySheet({ availability, onApply, onClose, onOpenFullSettings }) {
  const hasAvailabilitySelection = Boolean(availability.from || availability.to || availability.preset || availability.presets?.length);
  const [from, setFrom] = useState(availability.from || defaultAvailabilityTime.from);
  const [to, setTo] = useState(availability.to || defaultAvailabilityTime.to);
  const [presets, setPresets] = useState(() => (
    hasAvailabilitySelection
      ? (Array.isArray(availability.presets) ? availability.presets : availability.preset ? [availability.preset] : [])
      : defaultAvailabilityTime.presets
  ));

  function togglePreset(preset) {
    setPresets((current) => preset.id === "all-day"
      ? (current.includes("all-day") ? [] : ["all-day"])
      : (current.includes(preset.id)
        ? current.filter((id) => id !== preset.id)
        : [...current.filter((id) => id !== "all-day"), preset.id]));
  }

  return (
    <div className="card-sheet-layer" onClick={onClose}>
      <section aria-label="Настройки доступности" aria-modal="true" className="card-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <span aria-hidden="true" className="card-sheet-handle" />
        <div className="card-sheet-header">
          <h2>доступность</h2>
          <button aria-label="Закрыть настройки доступности" className="card-sheet-close" onClick={onClose} type="button">×</button>
        </div>
        <p className="card-sheet-description">Покажем смены, которые не пересекаются с вашим графиком</p>
        <div className="card-sheet-time-inputs">
          <label className="availability-time-input"><span>доступен с</span><input aria-label="Доступен с в боттомшите" onChange={(event) => { setFrom(event.target.value); setPresets([]); }} type="text" value={from} /></label>
          <label className="availability-time-input"><span>доступен до</span><input aria-label="Доступен до в боттомшите" onChange={(event) => { setTo(event.target.value); setPresets([]); }} type="text" value={to} /></label>
        </div>
        <div className="availability-time-presets">
          {availabilityTimePresets.map((preset) => <button
            aria-pressed={presets.includes(preset.id)}
            className={presets.includes(preset.id) ? "availability-time-preset availability-time-preset-selected" : "availability-time-preset"}
            key={preset.id}
            onClick={() => togglePreset(preset)}
            type="button"
          >{preset.label}</button>)}
        </div>
        <button className="card-sheet-link" onClick={onOpenFullSettings} type="button">выбрать дни</button>
        <button className="card-sheet-primary" onClick={() => onApply({ from, to, preset: presets[0] ?? null, presets })} type="button">применить</button>
      </section>
    </div>
  );
}

function TaskDetailsScreen({ task, day, onBack, onBook, bookingState }) {
  return (
    <section className="details-screen">
      <header className="details-header">
        <IconButton alt="" label="Назад к заданиям" onClick={onBack} src={assetUrl("back.svg")} />
        <h1>детали задания</h1>
      </header>
      <main className="details-content">
        <div className="details-brand"><BrandMark brand={task.brand} /></div>
        {!task.restrictionTags?.length && task.badge && <Badge className="details-match-badge" size="small" tone="accent" variant="soft">{task.badge}</Badge>}
        <h2>{task.title}</h2>
        <p className="details-payment">{task.payment}</p>
        <p className="details-rate">{task.rate}</p>
        <div className="details-section"><strong>{day.label}, {day.secondaryLabel}</strong><span>{task.hours}</span><span>{task.breakInfo}</span></div>
        <div className="details-section"><strong>адрес</strong><span>{task.address}</span><span>{task.distance} от выбранной точки</span></div>
        <div className="details-section"><strong>условия</strong><span>Опыт не требуется. Нужны аккуратность и готовность работать в команде.</span></div>
      </main>
      <button className="details-book-button" disabled={bookingState !== "available"} onClick={onBook} type="button">
        {bookingState === "booked" ? "вы уже записаны" : bookingState === "conflict" ? "недоступно в этот день" : "записаться"}
      </button>
    </section>
  );
}

function BookingSuccessScreen({ task, day, onGoToMyTasks, onBackToTasks }) {
  return (
    <section className="success-screen">
      <div className="success-mark">✓</div>
      <h1>вы записаны</h1>
      <p>{task.title}</p>
      <p>{day.label}, {day.secondaryLabel}<br />{task.hours}</p>
      <div className="success-actions">
        <button className="success-secondary" onClick={onBackToTasks} type="button">к заданиям</button>
        <button className="success-primary" onClick={onGoToMyTasks} type="button">мои задания</button>
      </div>
    </section>
  );
}

function MyTasksView({ bookedTasks }) {
  const records = [
    ...bookedTasks.map((booking) => ({ ...booking, status: "booked" })),
    ...demoMyTaskRecords,
  ].filter((booking) => myTaskStatuses[booking.status]);

  return <section className="my-tasks-list">
    {records.map((booking) => <MyTaskCard booking={booking} key={booking.id} />)}
  </section>;
}

function SigningTasksView() {
  const records = demoSigningTaskRecords.filter((booking) => booking.status === "signing" && myTaskStatuses[booking.status]);

  if (records.length === 0) {
    return <p className="task-empty-state my-tasks-empty">Заданий на подписание нет</p>;
  }

  return <section className="my-tasks-list">
    {records.map((booking) => <MyTaskCard booking={booking} key={booking.id} />)}
  </section>;
}

function MyTaskCard({ booking }) {
  const { day, task } = booking;
  const dateFragment = `${day.label}, ${day.secondaryLabel}`.match(/\d+ июня/)?.[0];
  const date = dateFragment ? `${dateFragment}, 2025` : `${day.label}, ${day.secondaryLabel}`;
  const status = myTaskStatuses[booking.status] ?? myTaskStatuses.booked;

  return <MyTaskCardView
    address={task.metro ? <>{task.metro.station} · {task.address}</> : task.address}
    brand={<BrandMark brand={task.brand} />}
    date={date}
    distance={task.distance}
    distanceMark={<img alt="" className="distance-mark" src={assetUrl("map-pin.svg")} />}
    hours={task.hours}
    metro={task.metro && <MetroIcon metro={task.metro} />}
    payment={task.payment}
    rate={task.rate}
    status={status}
    title={task.title}
  />;
}

function FavoriteCollectionsView({ collections, onApplyCollection, onEditCollection, onRemoveCollection }) {
  const [section, setSection] = useState("stores");
  const demoStoreChips = ["уборка урожая пшеницы", "1, 2, 3 июня", "Пн, Ср, Пт", "от 1500 ₽"];

  return (
    <div className="favorites-view">
      <div aria-label="Разделы избранного" className="favorites-tabs" role="tablist">
        <button
          aria-selected={section === "stores"}
          className={section === "stores" ? "favorites-tab favorites-tab-active" : "favorites-tab"}
          onClick={() => setSection("stores")}
          role="tab"
          type="button"
        >
          магазины
        </button>
        <button
          aria-selected={section === "collections"}
          className={section === "collections" ? "favorites-tab favorites-tab-active" : "favorites-tab"}
          onClick={() => setSection("collections")}
          role="tab"
          type="button"
        >
          подборки
        </button>
      </div>

      {section === "stores" ? (
        <article className="favorite-store-card">
          <div className="favorite-store-details">
            <div className="favorite-store-header">
              <div>
                <h2>название подборки конкретного магазина</h2>
                <p><BrandMark brand="pyaterochka" /><img alt="" aria-hidden="true" className="favorite-store-metro-icon" src={assetUrl("collection-metro.svg")} />Площадь Восстания · Косой переулок 5, к. 8</p>
              </div>
              <button aria-label="Настройки подборки магазина" className="card-kebab-button" type="button"><img alt="" src={assetUrl("kebab.svg")} /></button>
            </div>
            <div className="favorite-chip-row">
              {demoStoreChips.map((chip) => <span className="favorite-chip" key={chip}>{chip}</span>)}
            </div>
          </div>
          <button className="favorite-apply" onClick={() => setSection("collections")} type="button">показать задания</button>
        </article>
      ) : collections.length === 0 ? (
        <p className="task-empty-state my-tasks-empty">Сохранённых подборок пока нет</p>
      ) : (
        <div className="favorite-collections-list">
          {collections.map((collection) => {
            const collectionBrands = collection.filters.brands.length ? collection.filters.brands : defaultCollectionBrands;
            const collectionServices = normalizeSelectedServices(collection.filters.service);
            const collectionChips = [
              collectionServices.length ? getServiceSelectionSummary(collectionServices) : "уборка урожая пшеницы",
              "1, 2, 3 июня",
              "Пн, Ср, Пт",
              collection.filters.minimumPayment ? `от ${collection.filters.minimumPayment} ₽` : "от 1500 ₽",
              collection.radius ? `до ${collection.radius} км` : "до 50 км",
              collection.location.label ? `... ${getShortLocationLabel(collection.location.label)}` : null,
            ].filter(Boolean);

            return (
              <article className="favorite-collection-card" key={collection.id}>
                <div className="favorite-collection-header">
                  <h2>{collection.title}</h2>
                  <button aria-label={`Настройки подборки ${collection.title}`} className="card-kebab-button" onClick={() => onEditCollection(collection)} type="button"><img alt="" src={assetUrl("kebab.svg")} /></button>
                </div>
                <div className="favorite-brand-row">
                  {collectionBrands.slice(0, 4).map((brand) => <BrandMark brand={brand} key={brand} />)}
                </div>
                <div className="favorite-chip-row">
                  {collectionChips.map((chip) => <span className="favorite-chip" key={chip}>{chip}</span>)}
                </div>
                <button className="favorite-apply" onClick={() => onApplyCollection(collection)} type="button">показать задания</button>
                <button aria-label={`Удалить подборку ${collection.title}`} className="favorite-delete" onClick={() => onRemoveCollection(collection.id)} type="button">
                  <img alt="" src={assetUrl("trash.svg")} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmployeeShiftCard({ day, shift }) {
  const isPrimaryShift = shift.type === "primary";
  const shiftTitle = isPrimaryShift ? "основная смена" : "сверхурочная смена";

  return <EmployeeShiftCardView
    address={shift.address}
    brand={<BrandMark brand={shift.brand} />}
    breakInfo={shift.breakInfo ?? "11 ч + 1 ч перерыв"}
    date={day.secondaryLabel}
    distance={shift.distance}
    distanceMark={<img alt="" className="distance-mark" src={assetUrl("map-pin.svg")} />}
    hours={shift.hours}
    metro={shift.metro && <><MetroIcon metro={shift.metro} />{shift.metro.station} ·</>}
    shiftTitle={shiftTitle}
    title={shift.title}
    weekday={getShortDayLabel(day)}
  />;
}

function IconButton({ alt, src, label, onClick }) {
  return (
    <button aria-label={label} className="icon-button" onClick={onClick} type="button">
      <img alt={alt} src={src} />
    </button>
  );
}

function ScheduleSettings({ initialAvailabilityTime, initialSelectedDates, initialSelectedWeekdays, initialSelectedDuration, onBack, onSave }) {
  const [selectedDates, setSelectedDates] = useState(initialSelectedDates);
  const [selectedWeekdays, setSelectedWeekdays] = useState(initialSelectedWeekdays);
  const hasInitialAvailabilitySelection = Boolean(
    initialAvailabilityTime.from
    || initialAvailabilityTime.to
    || initialAvailabilityTime.preset
    || initialAvailabilityTime.presets?.length,
  );
  const initialAvailableFrom = initialAvailabilityTime.from || defaultAvailabilityTime.from;
  const initialAvailableTo = initialAvailabilityTime.to || defaultAvailabilityTime.to;
  const initialTimePresets = hasInitialAvailabilitySelection
    ? (Array.isArray(initialAvailabilityTime.presets)
      ? initialAvailabilityTime.presets
      : initialAvailabilityTime.preset ? [initialAvailabilityTime.preset] : [])
    : defaultAvailabilityTime.presets;
  const [availableFrom, setAvailableFrom] = useState(initialAvailableFrom);
  const [availableTo, setAvailableTo] = useState(initialAvailableTo);
  const [selectedTimePresets, setSelectedTimePresets] = useState(() => (
    initialTimePresets
  ));
  const [selectedDuration, setSelectedDuration] = useState(() => (
    Array.isArray(initialSelectedDuration) ? initialSelectedDuration : initialSelectedDuration ? [initialSelectedDuration] : []
  ));
  const [isDaysPickerOpen, setIsDaysPickerOpen] = useState(false);
  const [availabilityMonthOffset, setAvailabilityMonthOffset] = useState(0);
  const hasSelection = selectedDates.length > 0 || selectedWeekdays.length > 0;
  const initialDuration = Array.isArray(initialSelectedDuration) ? initialSelectedDuration : initialSelectedDuration ? [initialSelectedDuration] : [];
  const hasChanges = selectedDates.join(",") !== initialSelectedDates.join(",")
    || selectedWeekdays.join(",") !== initialSelectedWeekdays.join(",")
    || availableFrom !== initialAvailableFrom
    || availableTo !== initialAvailableTo
    || selectedTimePresets.join(",") !== initialTimePresets.join(",")
    || selectedDuration.join(",") !== initialDuration.join(",");
  const hasAppliedSettings = initialSelectedDates.length > 0
    || initialSelectedWeekdays.length > 0
    || (hasInitialAvailabilitySelection && !isVisualDefaultAvailability(initialAvailabilityTime))
    || initialDuration.length > 0;
  const isDraftEmpty = selectedDates.length === 0
    && selectedWeekdays.length === 0
    && ((!availableFrom && !availableTo && selectedTimePresets.length === 0)
      || isVisualDefaultAvailability({ from: availableFrom, presets: selectedTimePresets, to: availableTo }))
    && selectedDuration.length === 0;

  function saveSettings() {
    onSave({
      selectedDates,
      selectedWeekdays,
      availabilityTime: {
        from: availableFrom,
        to: availableTo,
        preset: selectedTimePresets[0] ?? null,
        presets: selectedTimePresets,
      },
      selectedDuration,
    });
  }

  function resetAllSettings() {
    onSave({
      selectedDates: [],
      selectedWeekdays: [],
      availabilityTime: emptyAvailabilityTime,
      selectedDuration: [],
    });
  }

  function toggleDate(day) {
    if (day.status !== "free") return;

    setSelectedDates((current) => {
      const next = current.includes(day.selectionKey)
        ? current.filter((date) => date !== day.selectionKey)
        : [...current, day.selectionKey];

      setSelectedWeekdays((weekdays) => weekdays.filter((weekday) => {
        const matchingFreeDays = availabilityCalendarDays.filter((calendarDay) => (
          calendarDay.month === "current" && calendarDay.status === "free" && calendarDay.weekday === weekday
        ));
        return matchingFreeDays.every((calendarDay) => next.includes(calendarDay.selectionKey));
      }));

      return next;
    });
  }

  function toggleWeekday(weekday) {
    const matchingFreeDays = availabilityCalendarDays.filter((day) => (
      day.month === "current" && day.status === "free" && day.weekday === weekday
    ));
    const keys = matchingFreeDays.map((day) => day.selectionKey);

    setSelectedWeekdays((current) => {
      const isSelected = current.includes(weekday);
      setSelectedDates((dates) => isSelected
        ? dates.filter((date) => !keys.includes(date))
        : [...new Set([...dates, ...keys])]);
      return isSelected ? current.filter((item) => item !== weekday) : [...current, weekday];
    });
  }

  function resetSelection() {
    setSelectedDates([]);
    setSelectedWeekdays([]);
  }

  function applyTimePreset(preset) {
    setSelectedTimePresets((current) => {
      const next = preset.id === "all-day"
        ? (current.includes("all-day") ? [] : ["all-day"])
        : (current.includes(preset.id)
          ? current.filter((id) => id !== preset.id)
          : [...current.filter((id) => id !== "all-day"), preset.id]);
      const selected = availabilityTimePresets.filter((item) => next.includes(item.id));

      if (selected.length > 0) {
        if (selected.length === 1) {
          setAvailableFrom(selected[0].from);
          setAvailableTo(selected[0].to);
          return next;
        }

        const starts = selected.map((item) => Number.parseInt(item.from, 10));
        setAvailableFrom(`${String(Math.min(...starts)).padStart(2, "0")}:00`);
        setAvailableTo(selected.some((item) => item.id === "night")
          ? "6:00"
          : `${String(Math.max(...selected.map((item) => Number.parseInt(item.to, 10)))).padStart(2, "0")}:00`);
      }

      return next;
    });
  }

  function updateTime(setTime) {
    return (event) => {
      setTime(event.target.value);
      setSelectedTimePresets([]);
    };
  }

  const availabilityCalendarDays = buildAvailabilityCalendar(availabilityMonthOffset);
  const availabilityMonthLabel = new Date(prototypeToday.getFullYear(), prototypeToday.getMonth() + availabilityMonthOffset, 1)
    .toLocaleDateString("ru-RU", { month: "long" });

  if (isDaysPickerOpen) return (
    <div className="availability-sheet-backdrop">
    <section aria-modal="true" className="availability-screen" role="dialog" aria-labelledby="availability-sheet-title">
      <header className="availability-header">
        <span aria-hidden="true" className="availability-handle" />
        <div className="availability-heading">
          <div>
            <h1 id="availability-sheet-title">укажите свою доступность</h1>
            <p>выберите дни недели или даты, когда вы готовы оказывать услуги</p>
          </div>
          <button aria-label="Закрыть выбор дней" className="availability-close" onClick={() => setIsDaysPickerOpen(false)} type="button">×</button>
        </div>
      </header>

      <main className="availability-content">
        <section className="availability-calendar-section" aria-label={`Календарь ${availabilityMonthLabel}`}>
          <div className="availability-month-nav">
            <button aria-label="Предыдущий месяц" disabled={availabilityMonthOffset === 0} onClick={() => setAvailabilityMonthOffset(0)} type="button">‹</button>
            <h2>{availabilityMonthLabel}</h2>
            <button aria-label="Следующий месяц" disabled={availabilityMonthOffset === 1} onClick={() => setAvailabilityMonthOffset(1)} type="button">›</button>
          </div>
          <div className="regular-days-options availability-weekday-chips">
            {calendarWeekdays.map((weekday) => {
              const isSelected = selectedWeekdays.includes(weekday);
              return <button aria-pressed={isSelected} className={isSelected ? "regular-day regular-day-selected" : "regular-day"} key={weekday} onClick={() => toggleWeekday(weekday)} type="button">{weekday}</button>;
            })}
          </div>
          <div className="availability-calendar">
            {availabilityCalendarDays.map((day) => {
              const isSelected = day.month === "current" && selectedDates.includes(day.selectionKey);
              const isPast = day.month === "current" && new Date(`${day.id}T12:00:00`) < prototypeToday;
              const isDisabled = day.status !== "free";
              const className = [
                "availability-day",
                `availability-day-${day.status}`,
                day.status === "busy" && day.day % 3 === 0 ? "availability-day-overtime" : "",
                day.month !== "current" || isPast ? "availability-day-outside" : "",
                isSelected ? "availability-day-selected" : "",
              ].filter(Boolean).join(" ");

              return (
                <button
                  aria-pressed={isSelected}
                  className={className}
                  data-weekday={day.weekday}
                  disabled={isDisabled}
                  key={day.id}
                  onClick={() => toggleDate(day)}
                  type="button"
                >
                  <strong>{day.day}</strong>
                  {day.status === "busy" && <small>10:00<br />22:00</small>}
                  {isSelected && <small>08:00<br />22:00</small>}
                </button>
              );
            })}
          </div>
          <div className="availability-legend" aria-label="Обозначения календаря">
            <span><i className="legend-swatch legend-busy" />занято</span>
            <span><i className="legend-swatch legend-overtime" />сверхурочные</span>
            <span><i className="legend-swatch legend-free" />свободно</span>
            <span><i className="legend-swatch legend-selected" />выбрано</span>
          </div>
        </section>
      </main>

      <footer className="availability-actions">
        <button className="availability-reset" onClick={resetSelection} type="button">сбросить</button>
        <button className="availability-save" onClick={() => setIsDaysPickerOpen(false)} type="button">готово</button>
      </footer>
    </section>
    </div>
  );

  const selectedDaysSummary = `выбрано дней: ${selectedDates.length + selectedWeekdays.length}`;

  return (
    <section className="settings-screen">
      <header className="settings-header">
        <div className="settings-navigation-row">
          <IconButton alt="" label="Назад к заданиям" onClick={onBack} src={assetUrl("back.svg")} />
        </div>
        <div className="settings-intro">
          <h1>настройки<br />расписания</h1>
          <p>расскажите, когда и в какое время вы готовы выполнять задания</p>
          <button className="how-it-works" type="button">
            <img alt="" src={assetUrl("settings-help.svg")} />
            <span>как это работает</span>
          </button>
        </div>
      </header>

      <main className="settings-content">
        <section className="availability-section">
          <button aria-expanded={isDaysPickerOpen} className="settings-select" onClick={() => { setAvailabilityMonthOffset(0); setIsDaysPickerOpen(true); }} type="button">
            <span className="settings-select-copy">
              {hasSelection ? <><small>выберите дни</small><strong>{selectedDaysSummary}</strong></> : <strong className="settings-select-placeholder">выберите дни</strong>}
            </span>
            <img alt="" src={assetUrl("chevron-down.svg")} />
          </button>

          <section className="availability-time-section" aria-label="Время доступности">
            <div className="availability-time-inputs">
              <label className="availability-time-input">
                <span>доступен с</span>
                <input aria-label="Доступен с" inputMode="numeric" onChange={updateTime(setAvailableFrom)} type="text" value={availableFrom} />
              </label>
              <label className="availability-time-input">
                <span>доступен до</span>
                <input aria-label="Доступен до" inputMode="numeric" onChange={updateTime(setAvailableTo)} type="text" value={availableTo} />
              </label>
            </div>
            <div className="availability-time-presets">
              {availabilityTimePresets.map((preset) => (
                <button
                  aria-pressed={selectedTimePresets.includes(preset.id)}
                  className={selectedTimePresets.includes(preset.id) ? "availability-time-preset availability-time-preset-selected" : "availability-time-preset"}
                  key={preset.id}
                  onClick={() => applyTimePreset(preset)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>
        </section>

        <section className="duration-section">
          <h2>продолжительность заданий</h2>
          <div className="duration-options">
            {[
              { id: "short", label: "короткие", detail: "4–6 часов" },
              { id: "regular", label: "обычные", detail: "8–9 часов" },
              { id: "long", label: "длинные", detail: "10 ч и более" },
            ].map((option) => (
              <button
                aria-pressed={selectedDuration.includes(option.id)}
                className={selectedDuration.includes(option.id) ? "duration-chip duration-chip-selected" : "duration-chip"}
                key={option.id}
                onClick={() => setSelectedDuration((current) => current.includes(option.id)
                  ? current.filter((item) => item !== option.id)
                  : [...current, option.id])}
                type="button"
              >
                <span>{option.label}</span>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="settings-actions">
        {!hasChanges && !hasAppliedSettings ? (
          <button className="availability-reset availability-action-single" onClick={onBack} type="button">закрыть</button>
        ) : !hasChanges ? (
          <>
            <button className="availability-reset" onClick={onBack} type="button">закрыть</button>
            <button className="availability-reset" onClick={resetAllSettings} type="button">сбросить</button>
          </>
        ) : (
          <>
            <button className="availability-reset" onClick={onBack} type="button">отмена</button>
            <button className="availability-save" onClick={saveSettings} type="button">{isDraftEmpty ? "показать все" : "применить"}</button>
          </>
        )}
      </footer>
    </section>
  );
}

function LocationPicker({ initialLocation, initialRadius, onApply, onBack }) {
  const [location, setLocation] = useState(initialLocation.label ? initialLocation : defaultSearchLocation);
  const [coords, setCoords] = useState(initialLocation.coords || defaultSearchLocation.coords);
  const [query, setQuery] = useState(initialLocation.label);
  const [radius, setRadius] = useState(initialRadius || 1);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isQueryDirty, setIsQueryDirty] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [mapError, setMapError] = useState(false);
  const [mapLoadAttempt, setMapLoadAttempt] = useState(0);
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const geocodeRequestRef = useRef(0);

  async function resolveLocation(nextCoords) {
    const requestId = ++geocodeRequestRef.current;
    setIsResolving(true);
    setSearchError("");

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextCoords[0]}&lon=${nextCoords[1]}&zoom=18`);
      if (!response.ok) throw new Error("Reverse geocoding failed");
      const result = await response.json();
      if (requestId !== geocodeRequestRef.current) return;
      const label = result.display_name ?? "Выбранная точка на карте";
      setLocation({ coords: nextCoords, label });
      setQuery(label);
      setIsQueryDirty(false);
    } catch {
      if (requestId !== geocodeRequestRef.current) return;
      const label = "Выбранная точка на карте";
      setLocation({ coords: nextCoords, label });
      setQuery(label);
      setIsQueryDirty(false);
      setSearchError("Адрес точки не определился. Можно применить выбранное место.");
    } finally {
      if (requestId === geocodeRequestRef.current) setIsResolving(false);
    }
  }

  function selectSearchResult(result) {
    const nextCoords = [Number(result.lat), Number(result.lon)];
    const label = result.display_name ?? query.trim();
    setCoords(nextCoords);
    setLocation({ coords: nextCoords, label });
    setQuery(label);
    setIsQueryDirty(false);
    setIsSearchMode(false);
    setSearchError("");
    setSearchResults([]);
  }

  useEffect(() => {
    const searchQuery = query.trim();
    if (!isSearchMode || !isQueryDirty || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return undefined;
    }

    const requestId = ++geocodeRequestRef.current;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error("Address search failed");
        const results = await response.json();
        if (requestId !== geocodeRequestRef.current) return;
        setSearchResults(results);
        if (!results.length) setSearchError("Ничего не нашли. Уточните адрес.");
      } catch {
        if (requestId === geocodeRequestRef.current) setSearchError("Не удалось найти адрес. Попробуйте ещё раз.");
      } finally {
        if (requestId === geocodeRequestRef.current) setIsSearching(false);
      }
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [isQueryDirty, isSearchMode, query]);

  useEffect(() => {
    let isDisposed = false;

    loadLeaflet().then((L) => {
      if (isDisposed || !mapElementRef.current) return;

      const map = L.map(mapElementRef.current, { attributionControl: false, zoomControl: false }).setView(coords, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (event) => {
        const nextCoords = [event.latlng.lat, event.latlng.lng];
        setCoords(nextCoords);
        resolveLocation(nextCoords);
      });
      mapRef.current = map;
      setMapError(false);
      setIsMapReady(true);
    }).catch(() => {
      setIsMapReady(false);
      setMapError(true);
    });

    return () => {
      isDisposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapLoadAttempt]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.L) return;

    const L = window.L;
    if (!markerRef.current) {
      markerRef.current = L.circleMarker(coords, {
        color: "#6446ff",
        fillColor: "#6446ff",
        fillOpacity: 1,
        radius: 9,
        weight: 5,
      }).addTo(mapRef.current);
      circleRef.current = L.circle(coords, {
        color: "#8f79ff",
        fillColor: "#8f79ff",
        fillOpacity: 0.18,
        radius: radius * 1000,
        weight: 2,
      }).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(coords);
      circleRef.current.setLatLng(coords).setRadius(radius * 1000);
    }

    mapRef.current.invalidateSize({ pan: false });
    mapRef.current.fitBounds(circleRef.current.getBounds(), {
      animate: false,
      maxZoom: 15,
      paddingBottomRight: [20, 360],
      paddingTopLeft: [20, 72],
    });
  }, [coords, isMapReady, radius]);

  const canApply = !isSearching && !isResolving && !isQueryDirty && Boolean(location.label);

  function focusSelectedArea() {
    if (!mapRef.current || !circleRef.current) return;
    mapRef.current.fitBounds(circleRef.current.getBounds(), {
      animate: true,
      maxZoom: 15,
      paddingBottomRight: [20, 360],
      paddingTopLeft: [20, 72],
    });
  }

  return (
    <section className="location-picker-screen">
      <div className="location-map" ref={mapElementRef}>
        {!isMapReady && !mapError && <span className="location-map-loading">Загружаем карту...</span>}
        {mapError && <button className="location-map-retry" onClick={() => { setMapError(false); setMapLoadAttempt((current) => current + 1); }} type="button">повторить загрузку карты</button>}
      </div>
      {!isSearchMode && <div aria-label="Управление картой" className="map-controls">
        <button aria-label="Приблизить карту" onClick={() => mapRef.current?.zoomIn()} type="button"><img alt="" src={assetUrl("map-zoom-in.svg")} /></button>
        <button aria-label="Отдалить карту" onClick={() => mapRef.current?.zoomOut()} type="button"><img alt="" src={assetUrl("map-zoom-out.svg")} /></button>
        <button aria-label="Показать выбранную область" onClick={focusSelectedArea} type="button"><img alt="" src={assetUrl("map-controls-chevron.svg")} /></button>
      </div>}

      <section className={isSearchMode ? "location-picker-sheet location-picker-sheet-search" : "location-picker-sheet"}>
        <span aria-hidden="true" className="location-picker-handle" />
        <div className="location-picker-title-row">
          <button aria-label="Вернуться к фильтрам" className="location-picker-back" onClick={onBack} type="button">
            <img alt="" src={assetUrl("back.svg")} />
          </button>
          <h1>показать задания рядом</h1>
        </div>
        <p>укажите точку на карте или конкретный адрес</p>
        <label className="location-address-field">
          <span>территория</span>
          <input
            aria-label="Адрес для поиска"
            onChange={(event) => {
              geocodeRequestRef.current += 1;
              setIsSearching(false);
              setIsResolving(false);
              setSearchError("");
              setQuery(event.target.value);
              setIsQueryDirty(true);
              setIsSearchMode(true);
            }}
            onFocus={() => setIsSearchMode(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults[0]) selectSearchResult(searchResults[0]);
            }}
            type="text"
            value={query}
          />
          {query && <button aria-label="Очистить адрес" className="location-search-clear" onClick={() => {
            geocodeRequestRef.current += 1;
            setQuery("");
            setIsQueryDirty(true);
            setSearchError("");
            setSearchResults([]);
            setIsSearchMode(true);
          }} type="button" />}
        </label>
        {isSearchMode ? <>
          <button className="location-use-map" onClick={() => {
            geocodeRequestRef.current += 1;
            setQuery(location.label);
            setIsQueryDirty(false);
            setIsSearching(false);
            setSearchError("");
            setSearchResults([]);
            setIsSearchMode(false);
          }} type="button"><img alt="" src={assetUrl("map-pin.svg")} />указать на карте</button>
          {isSearching && <p className="location-search-status" role="status">Ищем адрес...</p>}
          {searchError && <p className="location-search-error" role="status">{searchError}</p>}
          <div aria-label="Варианты адреса" className="location-search-results">
            {searchResults.map((result) => {
              const [title, ...details] = (result.display_name ?? "Выбранный адрес").split(", ");
              const isCurrentLocation = result.display_name === location.label;
              return <button className="location-search-result" key={`${result.lat}-${result.lon}`} onClick={() => selectSearchResult(result)} type="button">
                <span><strong>{title}</strong><small>{details.join(", ")}</small></span>
                <i aria-hidden="true" className={isCurrentLocation ? "location-search-radio location-search-radio-selected" : "location-search-radio"} />
              </button>;
            })}
          </div>
        </> : <>
          {searchError && <p className="location-search-error" role="status">{searchError}</p>}
          <div className="location-radius-options">
            {[1, 2, 5, 10, 50].map((value) => (
              <button
                aria-pressed={radius === value}
                className={radius === value ? "location-radius-chip location-radius-chip-selected" : "location-radius-chip"}
                key={value}
                onClick={() => setRadius(value)}
                type="button"
              >
                {value} км
              </button>
            ))}
          </div>
          <button className="location-apply-button" disabled={!canApply} onClick={() => onApply(location, radius)} type="button">применить</button>
        </>}
      </section>
    </section>
  );
}

function FiltersScreen({ initialFilters, initialLocation, initialRadius, isEditingCollection = false, onBack, onSave, onSaveCollection }) {
  const [selectedBrands, setSelectedBrands] = useState(initialFilters.brands);
  const initialStores = normalizeSelectedStores(initialFilters.stores);
  const [selectedStores, setSelectedStores] = useState(initialStores);
  const [isStorePickerOpen, setIsStorePickerOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const initialServices = normalizeSelectedServices(initialFilters.service);
  const [selectedServices, setSelectedServices] = useState(initialServices);
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [minimumPayment, setMinimumPayment] = useState(initialFilters.minimumPayment);
  const [radius, setRadius] = useState(initialRadius);
  const [location, setLocation] = useState(initialLocation);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isCollectionSaveSheetOpen, setIsCollectionSaveSheetOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [pushUpdates, setPushUpdates] = useState(false);
  const [notificationFrequency, setNotificationFrequency] = useState("instant");
  const [quietHours, setQuietHours] = useState(true);
  const [savedCollectionSnapshot, setSavedCollectionSnapshot] = useState(null);
  const brands = [
    { id: "pyaterochka", label: "Пятёрочка" },
    { id: "perekrestok", label: "Перекрёсток" },
    { id: "chizhik", label: "Чижик" },
  ];
  const stores = DEMO_STORES.map((store) => ({ ...store, address: getStoreAddress(location.label, store) }));
  const normalizedStoreQuery = storeSearch.trim().toLocaleLowerCase("ru-RU");
  const visibleStores = normalizedStoreQuery
    ? stores.filter((store) => store.address.toLocaleLowerCase("ru-RU").includes(normalizedStoreQuery))
    : stores;
  const normalizedServiceQuery = serviceSearch.trim().toLocaleLowerCase("ru-RU");
  const visibleServices = normalizedServiceQuery
    ? DEMO_SERVICE_TITLES.filter((service) => service.toLocaleLowerCase("ru-RU").includes(normalizedServiceQuery))
    : DEMO_SERVICE_TITLES;
  const isDirty = selectedBrands.join(",") !== initialFilters.brands.join(",")
    || [...selectedStores].sort().join("\u0000") !== [...initialStores].sort().join("\u0000")
    || [...selectedServices].sort().join("\u0000") !== [...initialServices].sort().join("\u0000")
    || minimumPayment !== initialFilters.minimumPayment
    || radius !== initialRadius
    || location.label !== initialLocation.label
    || location.coords[0] !== initialLocation.coords[0]
    || location.coords[1] !== initialLocation.coords[1];
  const hasLocationDraft = radius !== initialRadius
    || location.label !== initialLocation.label
    || location.coords[0] !== initialLocation.coords[0]
    || location.coords[1] !== initialLocation.coords[1];
  const collectionSnapshot = JSON.stringify({
    brands: [...selectedBrands].sort(),
    location: { coords: location.coords, label: location.label },
    minimumPayment,
    radius,
    service: [...selectedServices].sort(),
    stores: [...selectedStores].sort(),
  });
  const isCollectionSaved = savedCollectionSnapshot === collectionSnapshot;
  const hasAppliedFilters = initialFilters.brands.length > 0
    || initialStores.length > 0
    || initialServices.length > 0
    || Boolean(initialFilters.minimumPayment)
    || initialRadius !== null
    || Boolean(initialLocation.label);
  const isDraftEmpty = selectedBrands.length === 0
    && selectedStores.length === 0
    && selectedServices.length === 0
    && !minimumPayment
    && radius === null
    && !location.label;

  function toggleBrand(brand) {
    setSelectedBrands((current) => current.includes(brand)
      ? current.filter((item) => item !== brand)
      : [...current, brand]);
  }

  function toggleService(service) {
    setSelectedServices((current) => current.includes(service)
      ? current.filter((item) => item !== service)
      : [...current, service]);
  }

  function toggleStore(storeId) {
    setSelectedStores((current) => current.includes(storeId)
      ? current.filter((item) => item !== storeId)
      : [...current, storeId]);
  }

  function getStoreSelectionSummary() {
    const selected = stores.filter((store) => selectedStores.includes(store.id));
    if (selected.length === 1) return selected[0].address;
    return `${selected.length} ${getRussianPlural(selected.length, ["магазин выбран", "магазина выбраны", "магазинов выбрано"])}`;
  }

  function saveFilters() {
    onSave({
      filters: { brands: selectedBrands, minimumPayment, service: selectedServices, stores: selectedStores },
      location,
      radius,
    });
  }

  function resetAllFilters() {
    onSave({
      filters: { ...emptyFilters, brands: [], service: [], stores: [] },
      location: { ...emptySearchLocation, coords: [...emptySearchLocation.coords] },
      radius: null,
    });
  }

  function getDefaultCollectionName() {
    if (!location.label) return "новая подборка";
    return `${getShortLocationLabel(location.label).replace(/^улица\s+/iu, "")} · до ${radius} км`;
  }

  function openCollectionSaveSheet() {
    setCollectionName(getDefaultCollectionName());
    setEmailUpdates(false);
    setPushUpdates(false);
    setNotificationFrequency("instant");
    setQuietHours(true);
    setIsCollectionSaveSheetOpen(true);
  }

  function saveCollection() {
    const title = collectionName.trim() || getDefaultCollectionName();
    onSaveCollection({
      filters: { brands: selectedBrands, minimumPayment, service: selectedServices, stores: selectedStores },
      location: { ...location, coords: [...location.coords] },
      notifications: {
        email: emailUpdates,
        frequency: emailUpdates || pushUpdates ? notificationFrequency : null,
        push: pushUpdates,
        quietHours: pushUpdates && quietHours,
      },
      radius,
      title,
    });
    setSavedCollectionSnapshot(collectionSnapshot);
    setIsCollectionSaveSheetOpen(false);
  }

  if (isLocationPickerOpen) return (
    <LocationPicker
      initialLocation={location}
      initialRadius={radius}
      onApply={(nextLocation, nextRadius) => {
        setLocation(nextLocation);
        setRadius(nextRadius);
        setIsLocationPickerOpen(false);
      }}
      onBack={() => setIsLocationPickerOpen(false)}
    />
  );

  return (
    <section className="filters-screen">
      <header className="filters-header">
        <div className="filters-navigation-row">
          <IconButton alt="" label="Назад к заданиям" onClick={onBack} src={assetUrl("back.svg")} />
        </div>
        <h1>фильтры</h1>
      </header>

      <main className="filters-content filters-content-with-actions">
        <section className="filter-section">
          <h2>торговая сеть</h2>
          <div className="brand-filter-options">
            {brands.map((brand) => {
              const isSelected = selectedBrands.includes(brand.id);

              return (
                <button
                  aria-label={brand.label}
                  aria-pressed={isSelected}
                  className={isSelected ? "brand-filter-chip brand-filter-chip-selected" : "brand-filter-chip"}
                  key={brand.id}
                  onClick={() => toggleBrand(brand.id)}
                  type="button"
                >
                  <BrandMark brand={brand.id} />
                  <span>{brand.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="filter-fields">
          <div className={isStorePickerOpen ? "filter-picker filter-picker-open" : "filter-picker"}>
            <button
              aria-controls="store-filter-options"
              aria-expanded={isStorePickerOpen}
              aria-label="Выбрать адреса магазинов"
              className={selectedStores.length ? "filter-field filter-field-filled filter-picker-trigger" : "filter-field filter-field-placeholder filter-picker-trigger"}
              onClick={() => setIsStorePickerOpen((current) => !current)}
              type="button"
            >
              {selectedStores.length ? (
                <span className="filter-field-content">
                  <small>адреса магазинов</small>
                  <strong>{getStoreSelectionSummary()}</strong>
                </span>
              ) : <span>адрес магазина</span>}
              <img alt="" className="filter-picker-chevron" src={assetUrl("chevron-down.svg")} />
            </button>
            {isStorePickerOpen && (
              <div className="filter-picker-panel" id="store-filter-options">
                <label className="filter-picker-search-field">
                  <img alt="" aria-hidden="true" src={assetUrl("search.svg")} />
                  <input
                    aria-label="Поиск по адресу магазина"
                    autoComplete="off"
                    className="filter-picker-search"
                    onChange={(event) => setStoreSearch(event.target.value)}
                    placeholder="найти адрес"
                    type="search"
                    value={storeSearch}
                  />
                </label>
                <div aria-label="Список адресов магазинов" className="filter-picker-options">
                  {visibleStores.length ? visibleStores.map((store) => (
                    <label className={selectedStores.includes(store.id) ? "filter-picker-option filter-picker-option-selected" : "filter-picker-option"} key={store.id}>
                      <span>{store.address}</span>
                      <input
                        checked={selectedStores.includes(store.id)}
                        onChange={() => toggleStore(store.id)}
                        type="checkbox"
                      />
                    </label>
                  )) : <p className="filter-picker-empty" role="status">ничего не найдено</p>}
                </div>
              </div>
            )}
          </div>
          <div className={isServicePickerOpen ? "filter-picker filter-picker-open" : "filter-picker"}>
            <button
              aria-controls="service-filter-options"
              aria-expanded={isServicePickerOpen}
              aria-label="Выбрать услуги"
              className={selectedServices.length ? "filter-field filter-field-filled filter-picker-trigger" : "filter-field filter-field-placeholder filter-picker-trigger"}
              onClick={() => setIsServicePickerOpen((current) => !current)}
              type="button"
            >
              {selectedServices.length ? (
                <span className="filter-field-content">
                  <small>услуги</small>
                  <strong>{getServiceSelectionSummary(selectedServices)}</strong>
                </span>
              ) : <span>услуга</span>}
              <img alt="" className="filter-picker-chevron" src={assetUrl("chevron-down.svg")} />
            </button>
            {isServicePickerOpen && (
              <div className="filter-picker-panel" id="service-filter-options">
                <label className="filter-picker-search-field">
                  <img alt="" aria-hidden="true" src={assetUrl("search.svg")} />
                  <input
                    aria-label="Поиск по услугам"
                    autoComplete="off"
                    className="filter-picker-search"
                    onChange={(event) => setServiceSearch(event.target.value)}
                    placeholder="найти услугу"
                    type="search"
                    value={serviceSearch}
                  />
                </label>
                <div aria-label="Список услуг" className="filter-picker-options">
                  {visibleServices.length ? visibleServices.map((service) => (
                    <label className={selectedServices.includes(service) ? "filter-picker-option filter-picker-option-selected" : "filter-picker-option"} key={service}>
                      <span>{service}</span>
                      <input
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleService(service)}
                        type="checkbox"
                      />
                    </label>
                  )) : <p className="filter-picker-empty" role="status">ничего не найдено</p>}
                </div>
              </div>
            )}
          </div>
          <label className={minimumPayment ? "filter-field filter-field-filled" : "filter-field filter-field-placeholder"}>
            {minimumPayment && <small>мин. стоимость ₽</small>}
            <input
              aria-label="Минимальная стоимость"
              inputMode="numeric"
              onChange={(event) => setMinimumPayment(event.target.value)}
              placeholder="мин. стоимость ₽"
              type="text"
              value={minimumPayment}
            />
          </label>
        </section>

        <section className="filter-section search-area-section">
          <h2>где искать</h2>
          <button
            className={location.label ? "filter-field filter-field-filled" : "filter-field filter-field-placeholder"}
            onClick={() => setIsLocationPickerOpen(true)}
            type="button"
          >
            {location.label ? (
              <span className="filter-field-content">
                <small>территория</small>
                <strong>{location.label}</strong>
              </span>
            ) : <span>территория</span>}
            <img alt="" src={assetUrl("chevron-down.svg")} />
          </button>
          <div aria-label="Радиус поиска" className="radius-options">
            {[1, 2, 5, 10, 50].map((value) => (
              <button
                aria-pressed={radius === value}
                className={radius === value ? "radius-chip radius-chip-selected" : "radius-chip"}
                key={value}
                onClick={() => setRadius(value)}
                type="button"
              >
                {value} км
              </button>
            ))}
          </div>
          {hasLocationDraft && <p className="filter-location-notice" role="status">Новая территория применится после сохранения</p>}
        </section>
      </main>

      <div className={isDirty ? "filter-actions" : "filter-actions filter-actions-compact"}>
          <div className="filter-actions-content">
            {isDirty && !isEditingCollection && <button
              className="filter-collection-save"
              disabled={isCollectionSaved}
              onClick={openCollectionSaveSheet}
              type="button"
            >
              <span aria-hidden="true" className="filter-collection-save-icon">
                <img alt="" src={assetUrl("save-collection-star.svg")} />
              </span>
              <span>{isCollectionSaved ? "подборка сохранена" : "сохранить в подборку"}</span>
            </button>}
            {!isDirty && !hasAppliedFilters ? (
              <div className="filter-actions-row">
                <button className="filter-action-reset filter-action-single" onClick={onBack} type="button">закрыть</button>
              </div>
            ) : !isDirty ? (
              <div className="filter-actions-row">
                <button className="filter-action-reset" onClick={onBack} type="button">закрыть</button>
                <button className="filter-action-reset" onClick={resetAllFilters} type="button">сбросить</button>
              </div>
            ) : (
              <div className="filter-actions-row">
                <button className="filter-action-reset" onClick={onBack} type="button">отмена</button>
                <button className="filter-action-save" onClick={saveFilters} type="button">{isDraftEmpty ? "показать все" : "применить"}</button>
              </div>
            )}
          </div>
          <span aria-hidden="true" className="filter-actions-home-indicator" />
        </div>

      {isCollectionSaveSheetOpen && <div className="collection-save-sheet-layer" onClick={() => setIsCollectionSaveSheetOpen(false)}>
        <section
          aria-label="Сохранение подборки"
          aria-modal="true"
          className="collection-save-sheet"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <span aria-hidden="true" className="collection-save-sheet-handle" />
          <label className="collection-name-field">
            <span>название подборки</span>
            <textarea aria-label="Название подборки" onChange={(event) => setCollectionName(event.target.value)} rows="2" value={collectionName} />
            {collectionName && <button aria-label="Очистить название подборки" className="collection-name-clear" onClick={() => setCollectionName("")} type="button" />}
          </label>

          <h2>присылать обновления через</h2>
          <label className="collection-notification-row">
            <span className="collection-notification-label"><i aria-hidden="true" className="collection-notification-icon collection-notification-icon-email" />письмо на почту</span>
            <input aria-label="Письмо на почту" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} type="checkbox" />
            <span aria-hidden="true" className="collection-toggle" />
          </label>
          {(emailUpdates || pushUpdates) && <div aria-label="Частота уведомлений" className="collection-frequency-options">
            {[{ id: "instant", label: "сразу" }, { id: "daily", label: "раз в день" }, { id: "weekly", label: "раз в неделю" }].map((option) => <button
              aria-pressed={notificationFrequency === option.id}
              className={notificationFrequency === option.id ? "collection-frequency collection-frequency-selected" : "collection-frequency"}
              key={option.id}
              onClick={() => setNotificationFrequency(option.id)}
              type="button"
            >{option.label}</button>)}
          </div>}
          <label className="collection-notification-row">
            <span className="collection-notification-label"><i aria-hidden="true" className="collection-notification-icon collection-notification-icon-push" />Пуш-уведомления</span>
            <input aria-label="Пуш-уведомления" checked={pushUpdates} onChange={(event) => setPushUpdates(event.target.checked)} type="checkbox" />
            <span aria-hidden="true" className="collection-toggle" />
          </label>
          {pushUpdates && <label className="collection-quiet-hours">
            <span>не присылать с 22:00 до 9:00</span>
            <input aria-label="Не присылать с 22:00 до 9:00" checked={quietHours} onChange={(event) => setQuietHours(event.target.checked)} type="checkbox" />
            <span aria-hidden="true" className="collection-checkbox" />
          </label>}
          <button className="collection-save-confirm" disabled={!collectionName.trim()} onClick={saveCollection} type="button">сохранить подборку</button>
        </section>
      </div>}
    </section>
  );
}

export function App() {
  const persistedStateRef = useRef(readPrototypeState());
  const persistedState = persistedStateRef.current;
  const [activeTab, setActiveTab] = useState(0);
  const [activeDay, setActiveDay] = useState(days[0].date);
  const [onlyMatching, setOnlyMatching] = useState(true);
  const [networkFilter, setNetworkFilter] = useState("торговая сеть");
  const [filterScrollState, setFilterScrollState] = useState("at-start");
  const [isBottomChromeHidden, setIsBottomChromeHidden] = useState(false);
  const [hasContentScrolled, setHasContentScrolled] = useState(false);
  const [isControlsRevealed, setIsControlsRevealed] = useState(false);
  const [isScrollTopVisible, setIsScrollTopVisible] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [cardSheet, setCardSheet] = useState(null);
  const [sortBy, setSortBy] = useState(persistedState.sortBy || "recommended");
  const [hasAppliedSort, setHasAppliedSort] = useState(Boolean(persistedState.hasAppliedSort));
  const [searchRadius, setSearchRadius] = useState(persistedState.searchRadius ?? null);
  const [searchLocation, setSearchLocation] = useState(persistedState.searchLocation || emptySearchLocation);
  const [appliedFilters, setAppliedFilters] = useState(persistedState.appliedFilters || emptyFilters);
  const [favoriteCollections, setFavoriteCollections] = useState(persistedState.favoriteCollections || []);
  const [editingCollection, setEditingCollection] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(persistedState.catalogVersion || 0);
  const [selectedAvailabilityDates, setSelectedAvailabilityDates] = useState(persistedState.selectedAvailabilityDates || []);
  const [selectedAvailabilityWeekdays, setSelectedAvailabilityWeekdays] = useState(persistedState.selectedAvailabilityWeekdays || []);
  const [availabilityTime, setAvailabilityTime] = useState(persistedState.availabilityTime || emptyAvailabilityTime);
  const [selectedAvailabilityDuration, setSelectedAvailabilityDuration] = useState(() => (
    Array.isArray(persistedState.selectedAvailabilityDuration)
      ? persistedState.selectedAvailabilityDuration
      : persistedState.selectedAvailabilityDuration ? [persistedState.selectedAvailabilityDuration] : []
  ));
  const [bookedTasks, setBookedTasks] = useState(persistedState.bookedTasks || []);
  const [currentView, setCurrentView] = useState("tasks");
  const [isSettingsOnboardingVisible, setIsSettingsOnboardingVisible] = useState(true);
  const [settingsOnboardingAnchor, setSettingsOnboardingAnchor] = useState(null);
  const [startupPhase, setStartupPhase] = useState("spinner");
  const [selectedTask, setSelectedTask] = useState(null);
  const [scrollTargetDay, setScrollTargetDay] = useState(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [expandedFilteredDays, setExpandedFilteredDays] = useState([]);
  const hasFilterChangesFromDefault = appliedFilters.brands.length > 0
    || Boolean(appliedFilters.minimumPayment)
    || normalizeSelectedServices(appliedFilters.service).length > 0
    || normalizeSelectedStores(appliedFilters.stores).length > 0
    || searchRadius !== null
    || searchLocation.label !== emptySearchLocation.label;
  const hasAvailabilityChangesFromDefault = Boolean(selectedAvailabilityDates.length > 0
    || selectedAvailabilityWeekdays.length > 0
    || selectedAvailabilityDuration.length > 0
    || ((availabilityTime.from || availabilityTime.to || availabilityTime.preset || availabilityTime.presets?.length)
      && !isVisualDefaultAvailability(availabilityTime)));
  const screenRef = useRef(null);
  const scheduleSettingsButtonRef = useRef(null);
  const daySectionRefs = useRef({});
  const timelineDayRefs = useRef({});
  const programmaticDayRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const timelineLoadTimerRef = useRef(null);

  useLayoutEffect(() => {
    if (!isSettingsOnboardingVisible || startupPhase === "spinner") {
      setSettingsOnboardingAnchor(null);
      return undefined;
    }

    const updateAnchor = () => {
      const source = scheduleSettingsButtonRef.current;
      const prototype = source?.closest(".mobile-prototype");
      if (!source || !prototype) return;

      const sourceRect = source.getBoundingClientRect();
      const prototypeRect = prototype.getBoundingClientRect();
      const nextAnchor = {
        left: Math.round(sourceRect.left - prototypeRect.left + (sourceRect.width - 40) / 2),
        top: Math.round(sourceRect.top - prototypeRect.top + (sourceRect.height - 40) / 2),
      };

      setSettingsOnboardingAnchor((currentAnchor) => (
        currentAnchor?.left === nextAnchor.left && currentAnchor?.top === nextAnchor.top
          ? currentAnchor
          : nextAnchor
      ));
    };

    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    screenRef.current?.addEventListener("scroll", updateAnchor, { passive: true });

    return () => {
      window.removeEventListener("resize", updateAnchor);
      screenRef.current?.removeEventListener("scroll", updateAnchor);
    };
  }, [isSettingsOnboardingVisible, startupPhase]);

  useEffect(() => {
    const showSkeletonsTimer = window.setTimeout(() => setStartupPhase("skeleton"), 1000);
    const showTasksTimer = window.setTimeout(() => setStartupPhase("ready"), 2000);

    return () => {
      window.clearTimeout(showSkeletonsTimer);
      window.clearTimeout(showTasksTimer);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(prototypeStorageKey, JSON.stringify({
      appliedFilters,
      availabilityTime,
      bookedTasks,
      catalogVersion,
      defaultStateVersion: prototypeDefaultStateVersion,
      favoriteCollections,
      hasAppliedSort,
      searchLocation,
      searchRadius,
      selectedAvailabilityDates,
      selectedAvailabilityDuration,
      selectedAvailabilityWeekdays,
      sortBy,
    }));
  }, [appliedFilters, availabilityTime, bookedTasks, catalogVersion, favoriteCollections, hasAppliedSort, searchLocation, searchRadius, selectedAvailabilityDates, selectedAvailabilityDuration, selectedAvailabilityWeekdays, sortBy]);

  useEffect(() => {
    const timeline = document.querySelector(".date-timeline");
    const activeButton = timelineDayRefs.current[activeDay];
    if (!timeline || !activeButton) return;

    const buttonLeft = activeButton.offsetLeft - timeline.scrollLeft;
    const buttonRight = buttonLeft + activeButton.offsetWidth;
    if (buttonLeft >= 16 && buttonRight <= timeline.clientWidth - 16) return;

    const cellStep = activeButton.offsetWidth + 8;
    const centeredPosition = activeButton.offsetLeft - (timeline.clientWidth - activeButton.offsetWidth) / 2;
    const maxScroll = timeline.scrollWidth - timeline.clientWidth;
    const nextPosition = Math.min(maxScroll, Math.max(0, Math.round(centeredPosition / cellStep) * cellStep));

    timeline.scrollTo({ left: nextPosition, behavior: "smooth" });
  }, [activeDay]);

  useEffect(() => {
    if (!scrollTargetDay) return;

    const screen = document.querySelector(".screen");
    const section = screen?.querySelector(`[data-day="${scrollTargetDay}"]`);
    if (screen && section) {
      screen.scrollTo({
        top: Math.max(0, section.offsetTop - (isControlsRevealed ? 226 : 154)),
        behavior: "smooth",
      });
    }
    setScrollTargetDay(null);
  }, [isControlsRevealed, scrollTargetDay]);

  useEffect(() => () => window.clearTimeout(timelineLoadTimerRef.current), []);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return undefined;

    const onScroll = () => updateScrollState(screen);
    screen.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => screen.removeEventListener("scroll", onScroll);
  }, [currentView]);

  function handleFilterScroll(event) {
    const { clientWidth, scrollLeft, scrollWidth } = event.currentTarget;
    const hasScrolled = scrollLeft > 1;
    const reachedEnd = scrollLeft + clientWidth >= scrollWidth - 1;

    if (hasScrolled && !reachedEnd) {
      setFilterScrollState("in-progress");
      return;
    }

    setFilterScrollState(reachedEnd ? "at-end" : "at-start");
  }

  function updateScrollState(screen) {
    const currentScrollTop = screen.scrollTop;
    const previousScrollTop = lastScrollTopRef.current;
    const scrollDelta = currentScrollTop - previousScrollTop;

    const isProgrammaticNavigation = Boolean(programmaticDayRef.current);

    if (isProgrammaticNavigation) {
      lastScrollTopRef.current = currentScrollTop;
    } else if (currentScrollTop <= 8) {
      setIsControlsRevealed(false);
    } else if (scrollDelta < -2) {
      setIsControlsRevealed(true);
    } else if (scrollDelta > 2) {
      setIsControlsRevealed(false);
    }

    lastScrollTopRef.current = currentScrollTop;
    const activationLine = screen.getBoundingClientRect().top + 154;
    let nextActiveDay = dayGroups[0].date;
    const targetDay = programmaticDayRef.current;

    if (targetDay) {
      const targetSection = daySectionRefs.current[targetDay];
      if (targetSection?.getBoundingClientRect().top <= activationLine + 4) {
        programmaticDayRef.current = null;
      } else {
        nextActiveDay = targetDay;
      }
    }

    if (!programmaticDayRef.current) {
      dayGroups.forEach((day) => {
        const section = daySectionRefs.current[day.date];
        if (section && section.getBoundingClientRect().top <= activationLine) {
          nextActiveDay = day.date;
        }
      });
    }

    setActiveDay((current) => current === nextActiveDay ? current : nextActiveDay);
    const shouldHideBottomChrome = currentScrollTop > 8;
    setIsBottomChromeHidden((current) => current === shouldHideBottomChrome ? current : shouldHideBottomChrome);
    setHasContentScrolled((current) => current === (currentScrollTop > 1) ? current : currentScrollTop > 1);
    setIsScrollTopVisible((current) => current === (currentScrollTop >= 320) ? current : currentScrollTop >= 320);
  }

  function scrollToDay(date) {
    const distance = Math.abs(days.findIndex((day) => day.date === date) - days.findIndex((day) => day.date === activeDay));
    programmaticDayRef.current = date;
    setActiveDay(date);

    if (distance > 4) {
      window.clearTimeout(timelineLoadTimerRef.current);
      setIsTimelineLoading(true);
      timelineLoadTimerRef.current = window.setTimeout(() => {
        setIsTimelineLoading(false);
        setScrollTargetDay(date);
      }, 100);
      return;
    }

    setScrollTargetDay(date);
  }

  function scrollToTop() {
    screenRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTaskDetails(task, day) {
    setSelectedTask({ day, task });
    setCurrentView("details");
  }

  function bookSelectedTask() {
    if (!selectedTask || getBookingState(selectedTask) !== "available") return;
    setBookedTasks((current) => [...current, { ...selectedTask, id: selectedTask.task.id }]);
    setCurrentView("success");
  }

  function getBookingState(candidate) {
    if (bookedTasks.some((booking) => booking.id === candidate.task.id)) return "booked";
    if (!isAvailableForMatching(candidate.day.date) || !isTaskWithinAvailability(candidate.task, availabilityTime)) return "conflict";
    const sameDayBookings = [
      ...(acceptedGigByDate[candidate.day.date] ? [acceptedGigByDate[candidate.day.date]] : []),
      ...bookedTasks.filter((booking) => booking.day.date === candidate.day.date).map((booking) => booking.task),
    ];
    if (sameDayBookings.some((shift) => shiftsOverlap(candidate.task, shift))) return "conflict";
    return "available";
  }

  function selectSortOption(nextSortBy) {
    setSortBy(nextSortBy);
    setHasAppliedSort(true);
    setIsSortSheetOpen(false);
  }

  function isAvailableForMatching(date) {
    if (availabilityByDate[date] !== "free") return false;

    const hasManualAvailability = selectedAvailabilityDates.length > 0 || selectedAvailabilityWeekdays.length > 0;
    if (!hasManualAvailability) return true;

    const weekday = days.find((day) => day.date === date)?.weekday;
    return selectedAvailabilityDates.includes(date) || selectedAvailabilityWeekdays.includes(weekday);
  }

  function getEmployeeShifts(day) {
    const acceptedShifts = [
      ...(acceptedGigByDate[day.date] ? [{ ...acceptedGigByDate[day.date], type: "gig" }] : []),
      ...bookedTasks
        .filter((booking) => booking.day.date === day.date)
        .map((booking) => ({ ...booking.task, type: "gig" })),
    ];
    if (acceptedShifts.length) return acceptedShifts;
    if (availabilityByDate[day.date] !== "busy") return [];

    return [{
      address: "Косой переулок, 550, к. 8",
      brand: "pyaterochka",
      distance: "350 м",
      hours: "10:00 – 22:00",
      metro: { city: "spb", color: "#d6083b", label: "Метро Санкт-Петербурга", station: "Площадь Восстания" },
      title: "управление транспортом",
      type: "primary",
    }];
  }

  function getLocationTasks(day, dayIndex) {
    const effectiveSearchLocation = searchLocation.label ? searchLocation : defaultSearchLocation;
    const locationKey = `${effectiveSearchLocation.coords.join(",")}-${catalogVersion}-${dayIndex}`;
    const distanceBands = [
      [180, 720],
      [760, 980],
      [1200, 1900],
      [320, 880],
      [15000, 47000],
      [52000, 72000],
    ];
    const locationAddress = effectiveSearchLocation.label.replace(/, Россия$/, "");

    return distanceBands.map(([minDistance, maxDistance], taskIndex) => {
      const seed = `${locationKey}-${day.date}-${taskIndex}`;
      const source = taskTemplates[Math.floor(seededValue(`${seed}-template`) * taskTemplates.length)];
      const store = DEMO_STORES[(dayIndex * distanceBands.length + taskIndex) % DEMO_STORES.length];
      const rate = 210 + Math.floor(seededValue(`${seed}-rate`) * 151);
      const startHour = taskIndex === 5 ? 23 : 8 + Math.floor(seededValue(`${seed}-start`) * 4);
      const duration = 7 + Math.floor(seededValue(`${seed}-duration`) * 3);
      const endHour = (startHour + duration) % 24;
      const distanceInMeters = minDistance + Math.floor(seededValue(`${seed}-distance`) * (maxDistance - minDistance));
      const hasBreak = duration > 8;
      const payment = rate * Math.max(6, duration - (hasBreak ? 1 : 0));

      return {
        ...source,
        title: DEMO_SERVICE_TITLES[(dayIndex * distanceBands.length + taskIndex) % DEMO_SERVICE_TITLES.length],
        address: getStoreAddress(locationAddress, store),
        badge: undefined,
        breakInfo: hasBreak ? `${duration - 1} ч + 1 ч перерыв` : `${duration} ч без перерыва`,
        distance: distanceInMeters >= 1000 ? `${(distanceInMeters / 1000).toFixed(1).replace(".", ",")} км` : `${distanceInMeters} м`,
        hours: `${String(startHour).padStart(2, "0")}:00 – ${String(endHour).padStart(2, "0")}:00`,
        id: `${day.date}-${catalogVersion}-${taskIndex}-${source.id}`,
        metro: undefined,
        payment: formatPayment(payment),
        recommendation: Math.floor(seededValue(`${seed}-recommendation`) * 100),
        rate: `${rate} ₽/час`,
        mismatchHints: taskIndex === 2 ? ["Пересекается со сменой"] : [],
        variant: taskIndex === 3 && [0, 1, 4].includes(dayIndex) ? "special" : undefined,
        storeId: store.id,
      };
    });
  }

  function getTaskMismatchReasons(task, date) {
    const maximumDistance = Number.isFinite(searchRadius) ? searchRadius * 1000 : Infinity;
    const minimumPayment = Number.parseInt(appliedFilters.minimumPayment.replace(/\D/g, ""), 10) || 0;
    const selectedServices = normalizeSelectedServices(appliedFilters.service)
      .map((service) => service.toLocaleLowerCase("ru-RU"));
    const selectedStores = normalizeSelectedStores(appliedFilters.stores);
    const taskService = task.title.toLocaleLowerCase("ru-RU");
    const isSuggested = Boolean(task.badge || task.variant === "special");
    const reasons = [];
    const hasFilterMismatch = (appliedFilters.brands.length > 0 && !appliedFilters.brands.includes(task.brand))
      || (selectedStores.length > 0 && !selectedStores.includes(task.storeId))
      || (selectedServices.length > 0 && !selectedServices.some((service) => taskService.includes(service)))
      || getPaymentValue(task.payment) < minimumPayment
      || !matchesDurationPreference(task, selectedAvailabilityDuration);

    if (!isAvailableForMatching(date)) reasons.push("Вне доступности");
    if (!isTaskWithinAvailability(task, availabilityTime)) reasons.push("Пересекается со сменой");
    if (Number.isFinite(maximumDistance) && getDistanceInMeters(task.distance) > maximumDistance) reasons.push("Вне радиуса");
    if (hasFilterMismatch || (!isSuggested && reasons.length === 0)) reasons.push("Не совпадает с фильтрами");
    reasons.push(...task.mismatchHints);

    return [...new Set(reasons)];
  }

  function matchesCatalogFilters(task) {
    const minimumPayment = Number.parseInt(appliedFilters.minimumPayment.replace(/\D/g, ""), 10) || 0;
    const selectedServices = normalizeSelectedServices(appliedFilters.service)
      .map((service) => service.toLocaleLowerCase("ru-RU"));
    const selectedStores = normalizeSelectedStores(appliedFilters.stores);
    const taskService = task.title.toLocaleLowerCase("ru-RU");
    const maximumDistance = Number.isFinite(searchRadius) ? searchRadius * 1000 : Infinity;

    return !(
      (appliedFilters.brands.length > 0 && !appliedFilters.brands.includes(task.brand))
      || (selectedStores.length > 0 && !selectedStores.includes(task.storeId))
      || (selectedServices.length > 0 && !selectedServices.some((service) => taskService.includes(service)))
      || getPaymentValue(task.payment) < minimumPayment
      || getDistanceInMeters(task.distance) > maximumDistance
      || !matchesDurationPreference(task, selectedAvailabilityDuration)
    );
  }

  function overlapsBookedShift(task, date) {
    const primaryShift = availabilityByDate[date] === "busy" ? [{ hours: "10:00 – 22:00" }] : [];
    const acceptedShifts = [
      ...(acceptedGigByDate[date] ? [acceptedGigByDate[date]] : []),
      ...bookedTasks
        .filter((booking) => booking.day.date === date)
        .map((booking) => booking.task),
    ];

    return [...primaryShift, ...acceptedShifts].some((shift) => shiftsOverlap(task, shift));
  }

  function matchesDefaultAvailability(task, date) {
    const hasExplicitAvailability = Boolean(
      availabilityTime.from || availabilityTime.to || availabilityTime.preset || availabilityTime.presets?.length,
    );
    return isAvailableForMatching(date)
      && (!hasExplicitAvailability || isTaskWithinAvailability(task, availabilityTime));
  }

  function getTasksForFeed(tasks, date) {
    const availableCatalogTasks = tasks.filter((task) => (
      matchesCatalogFilters(task) && !overlapsBookedShift(task, date)
    ));
    const matchingTasks = availableCatalogTasks.filter((task) => matchesDefaultAvailability(task, date));
    const visibleTasks = (onlyMatching ? matchingTasks : availableCatalogTasks).map((task) => ({
      ...task,
      badge: onlyMatching ? "подходит вам" : undefined,
    }));
    const hiddenTasks = onlyMatching
      ? availableCatalogTasks
        .filter((task) => !matchingTasks.some((matchingTask) => matchingTask.id === task.id))
        .map((task) => ({
          ...task,
          badge: undefined,
          restrictionTags: ["Не совпадает с доступностью"],
        }))
      : [];

    return {
      hiddenTasks: getSortedTasks(hiddenTasks, sortBy),
      visibleTasks: getOrderedTasks(visibleTasks, sortBy, hasAppliedSort),
    };
  }

  if (startupPhase === "spinner") {
    return <main className="mobile-prototype" aria-label="Смена X5"><ServiceLaunchScreen /></main>;
  }

  const isTaskListLoading = isTimelineLoading || startupPhase === "skeleton";

  return (
    <main className="mobile-prototype" aria-label="Смена X5">
      <div className="status-bar" aria-label="9:41">
        <span className="time">9:41</span>
        <span className="dynamic-island" aria-hidden="true" />
        <img alt="Сеть, Wi-Fi и заряд батареи" className="status-levels" src={assetUrl("status-levels.svg")} />
      </div>
      {currentView === "tasks" ? <section
        className={`screen${hasContentScrolled ? " is-content-scrolled" : ""}${isControlsRevealed ? " is-controls-revealed" : ""}`}
        ref={screenRef}
      >
        <header className="app-header">
          <div className="navigation-row">
            <IconButton alt="" label="Назад" src={assetUrl("back.svg")} />
            <div className="navigation-actions">
              <IconButton alt="" label="Помощь" src={assetUrl("help.svg")} />
            </div>
          </div>

          <h1>смена X5</h1>
        </header>

        <nav aria-label="Разделы" className="tabs">
          {tabs.map((tab, index) => (
            <button
              aria-current={activeTab === index ? "page" : undefined}
              className={activeTab === index ? "tab tab-active" : "tab"}
              key={tab}
              onClick={() => setActiveTab(index)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="sticky-timeline">
          <div aria-label="Даты" className="date-timeline">
            {days.map(({ date, isMonthStart, monthLabel, weekday }) => (
              <button
                aria-pressed={activeDay === date}
                className={activeDay === date ? "day-card day-card-active" : "day-card"}
                data-month-start={isMonthStart || undefined}
                key={`${date}-${weekday}-${monthLabel}`}
                onClick={() => scrollToDay(date)}
                ref={(node) => { timelineDayRefs.current[date] = node; }}
                type="button"
              >
                <span>{date}</span>
                <small>{isMonthStart ? monthLabel : weekday}</small>
              </button>
            ))}
          </div>
        </div>

        {activeTab !== 1 && <section aria-label="Фильтры заданий" className="schedule-controls">
          <div className={`filter-scroll filter-scroll-${filterScrollState}`} onScroll={handleFilterScroll}>
            <div className="filter-row">
              <div className="filter-tools">
                <button
                  aria-expanded={isSortSheetOpen}
                  aria-haspopup="dialog"
                  aria-label="Сортировка"
                  className="filter-icon-button"
                  onClick={() => setIsSortSheetOpen(true)}
                  type="button"
                >
                  <img alt="" src={assetUrl("sort.svg")} />
                </button>
                <button aria-label="Открыть фильтры" className="filter-icon-button" onClick={() => setCurrentView("filters")} type="button">
                  <img alt="" src={assetUrl("funnel.svg")} />
                  {hasFilterChangesFromDefault && <span aria-hidden="true" className="filter-settings-badge" />}
                </button>
                <button
                  aria-label="Открыть настройки доступности"
                  className="filter-icon-button filter-icon-button-availability"
                  onClick={() => {
                    setIsSettingsOnboardingVisible(false);
                    setCurrentView("settings");
                  }}
                  ref={scheduleSettingsButtonRef}
                  type="button"
                >
                  <img alt="" src={assetUrl("schedule_ic.svg")} />
                  {hasAvailabilityChangesFromDefault && <span aria-hidden="true" className="filter-settings-badge" />}
                </button>
              </div>
              <label className="toggle-label">
                <span>подходит мне</span>
                <input
                  checked={onlyMatching}
                  onChange={(event) => setOnlyMatching(event.target.checked)}
                  type="checkbox"
                />
                <span aria-hidden="true" className="toggle" />
              </label>
              <button
                aria-expanded={networkFilter !== "торговая сеть"}
                className="network-filter"
                onClick={() => setNetworkFilter(networkFilter === "торговая сеть" ? "все сети" : "торговая сеть")}
                type="button"
              >
                <span>{networkFilter}</span>
                <span aria-hidden="true" className="filter-chevron" />
              </button>
              <button aria-expanded="false" className="network-filter" type="button">
                <span>оплата</span>
                <span aria-hidden="true" className="filter-chevron" />
              </button>
              <button aria-expanded="false" className="network-filter" type="button">
                <span>расстояние</span>
                <span aria-hidden="true" className="filter-chevron" />
              </button>
            </div>
          </div>
        </section>}

        <section aria-label={activeTab === 2 ? "Мои задания" : activeTab === 1 ? "Избранное" : "Список заданий"} className={isTaskListLoading ? "task-list task-list-loading" : "task-list"}>
          {activeTab === 1 ? <FavoriteCollectionsView
            collections={favoriteCollections}
            onApplyCollection={(collection) => {
              const hasLocationChanged = collection.location.label !== searchLocation.label
                || collection.location.coords[0] !== searchLocation.coords[0]
                || collection.location.coords[1] !== searchLocation.coords[1];
              setAppliedFilters(collection.filters);
              setSearchLocation(collection.location);
              setSearchRadius(collection.radius);
              if (hasLocationChanged) setCatalogVersion((current) => current + 1);
              setActiveTab(0);
            }}
            onEditCollection={(collection) => {
              setEditingCollection(collection);
              setCurrentView("filters");
            }}
            onRemoveCollection={(id) => setFavoriteCollections((collections) => collections.filter((collection) => collection.id !== id))}
          /> : activeTab === 2 ? <MyTasksView bookedTasks={bookedTasks} /> : activeTab === 3 ? <SigningTasksView /> : isTaskListLoading ? <TimelineLoadingState /> : dayGroups.map((day, dayIndex) => {
            const employeeShifts = getEmployeeShifts(day);
            const hasDemoEmptyDay = day.date === "5" || day.date === "14";
            const dayTasks = hasDemoEmptyDay ? [] : getLocationTasks(day, dayIndex);
            const taskFeed = getTasksForFeed(dayTasks, day.date);
            const isFilteredDayExpanded = expandedFilteredDays.includes(day.date);
            const visibleTasks = taskFeed.visibleTasks;
            const hasFilteredOutTasks = taskFeed.hiddenTasks.length > 0 && !isFilteredDayExpanded;
            const hasNoFeedContent = employeeShifts.length === 0
              && visibleTasks.length === 0
              && taskFeed.hiddenTasks.length === 0;

            return (
              <section
                className="task-day-section"
                data-day={day.date}
                key={day.date}
                ref={(node) => { daySectionRefs.current[day.date] = node; }}
              >
                <h2 className="day-heading">{day.label}, <span>{day.secondaryLabel}</span></h2>
                {employeeShifts.map((shift, index) => <EmployeeShiftCard day={day} key={`${day.date}-${shift.type}-${shift.hours}-${index}`} shift={shift} />)}
                {visibleTasks.map((task) => <TaskCard day={day} key={task.id} onOpen={() => openTaskDetails(task, day)} task={task} />)}
                {isFilteredDayExpanded && taskFeed.hiddenTasks.length > 0 && <button
                  className="hide-incompatible-button"
                  onClick={() => setExpandedFilteredDays((current) => current.filter((date) => date !== day.date))}
                  type="button"
                >
                  скрыть неподходящие <img alt="" src={assetUrl("chevron-down.svg")} />
                </button>}
                {isFilteredDayExpanded && taskFeed.hiddenTasks.map((task) => <TaskCard day={day} key={task.id} onOpen={() => openTaskDetails(task, day)} revealRestrictionTags task={task} />)}
                {hasFilteredOutTasks && <TaskMessageCard
                  hiddenCount={taskFeed.hiddenTasks.length}
                  variant={visibleTasks.length === 0 ? "empty-day-filtered" : "no-more"}
                  onShowAll={() => setExpandedFilteredDays((current) => [...current, day.date])}
                />}
                {hasNoFeedContent && <NoTasksForDayCard />}
              </section>
            );
          })}
        </section>

      </section> : currentView === "settings" ? <ScheduleSettings
        initialAvailabilityTime={availabilityTime}
        initialSelectedDates={selectedAvailabilityDates}
        initialSelectedWeekdays={selectedAvailabilityWeekdays}
        initialSelectedDuration={selectedAvailabilityDuration}
        onBack={() => setCurrentView("tasks")}
        onSave={({ availabilityTime: nextAvailabilityTime, selectedDates, selectedWeekdays, selectedDuration }) => {
          setSelectedAvailabilityDates(selectedDates);
          setSelectedAvailabilityWeekdays(selectedWeekdays);
          setAvailabilityTime(nextAvailabilityTime);
          setSelectedAvailabilityDuration(selectedDuration);
          setCurrentView("tasks");
        }}
      /> : currentView === "details" && selectedTask ? <TaskDetailsScreen
        bookingState={getBookingState(selectedTask)}
        day={selectedTask.day}
        onBack={() => setCurrentView("tasks")}
        onBook={bookSelectedTask}
        task={selectedTask.task}
      /> : currentView === "success" && selectedTask ? <BookingSuccessScreen
        day={selectedTask.day}
        onBackToTasks={() => setCurrentView("tasks")}
        onGoToMyTasks={() => { setActiveTab(2); setCurrentView("tasks"); }}
        task={selectedTask.task}
      /> : currentView === "map" ? <LocationPicker
        initialLocation={searchLocation}
        initialRadius={searchRadius}
        onApply={(location, radius) => {
          const hasLocationChanged = location.label !== searchLocation.label
            || location.coords[0] !== searchLocation.coords[0]
            || location.coords[1] !== searchLocation.coords[1];
          setSearchLocation(location);
          setSearchRadius(radius);
          if (hasLocationChanged) setCatalogVersion((current) => current + 1);
          setCurrentView("tasks");
        }}
        onBack={() => setCurrentView("tasks")}
      /> : <FiltersScreen
        initialFilters={editingCollection?.filters || appliedFilters}
        initialLocation={editingCollection?.location || searchLocation}
        initialRadius={editingCollection?.radius || searchRadius}
        isEditingCollection={Boolean(editingCollection)}
        onBack={() => {
          setEditingCollection(null);
          setCurrentView("tasks");
        }}
        onSave={({ filters, location, radius }) => {
          if (editingCollection) {
            setFavoriteCollections((collections) => collections.map((collection) => collection.id === editingCollection.id ? {
              ...collection,
              filters: { ...filters, brands: [...filters.brands] },
              location: { ...location, coords: [...location.coords] },
              radius,
              title: editingCollection.title,
            } : collection));
            setEditingCollection(null);
            setActiveTab(1);
            setCurrentView("tasks");
            return;
          }
          const hasLocationChanged = location.label !== searchLocation.label
            || location.coords[0] !== searchLocation.coords[0]
            || location.coords[1] !== searchLocation.coords[1];
          setSearchLocation(location);
          setSearchRadius(radius);
          setAppliedFilters(filters);
          if (hasLocationChanged) setCatalogVersion((current) => current + 1);
          setCurrentView("tasks");
        }}
        onSaveCollection={({ filters, location, notifications, radius, title }) => {
          setFavoriteCollections((collections) => [
            {
              filters: { ...filters, brands: [...filters.brands] },
              id: `collection-${Date.now()}`,
              location,
              notifications,
              radius,
              title,
            },
            ...collections,
          ]);
        }}
      />}

      {currentView === "tasks" && (
        <>
          <button
            aria-label="Открыть задания на карте"
            className="map-button"
            onClick={() => setCurrentView("map")}
            style={{ "--map-offset": isBottomChromeHidden ? "67px" : "0px" }}
            type="button"
          >
            <img alt="" className="map-icon" src={assetUrl("map.svg")} />
            <span>на карте</span>
          </button>
          {isScrollTopVisible && (
            <button aria-label="Наверх" className="scroll-top-button" onClick={scrollToTop} type="button">
              <img alt="" src={assetUrl("arrow-up.svg")} />
            </button>
          )}

          <nav
            aria-label="Основная навигация"
            className="bottom-navigation"
            style={{ "--chrome-offset": isBottomChromeHidden ? "99px" : "0px" }}
          >
            <div className="bottom-navigation-actions">
              <button aria-label="Главная" className="bottom-navigation-button" type="button"><img alt="" src={assetUrl("nav-home.svg")} /></button>
              <button aria-current="page" aria-label="Смена X5" className="bottom-navigation-button" type="button"><img alt="" src={assetUrl("nav-shift.svg")} /></button>
              <button aria-label="Все сервисы" className="bottom-navigation-button" type="button"><img alt="" src={assetUrl("nav-all.svg")} /></button>
              <button aria-label="Лента" className="bottom-navigation-button" type="button"><img alt="" className="nav-feed-icon" src={assetUrl("nav-feed.svg")} /></button>
              <button aria-label="Профиль" className="bottom-navigation-button" type="button"><img alt="Профиль" className="bottom-navigation-profile" src={assetUrl("nav-profile.png")} /></button>
            </div>
            <span aria-hidden="true" className="home-indicator" />
          </nav>
        </>
      )}

      {currentView === "tasks" && isSortSheetOpen && (
        <div className="sort-sheet-layer" onClick={() => setIsSortSheetOpen(false)}>
          <section
            aria-label="Сортировка заданий"
            aria-modal="true"
            className="sort-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <span aria-hidden="true" className="sort-sheet-handle" />
            <h2>Сортировка</h2>
            <div className="sort-options" role="radiogroup">
              {sortOptions.map((option) => {
                const isSelected = sortBy === option.id;

                return (
                  <button
                    aria-checked={isSelected}
                    className={isSelected ? "sort-option sort-option-selected" : "sort-option"}
                    key={option.id}
                    onClick={() => selectSortOption(option.id)}
                    role="radio"
                    type="button"
                  >
                    <span>{option.label}</span>
                    <span aria-hidden="true" className="sort-option-mark" />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {currentView === "tasks" && cardSheet === "filters" && <CardFiltersSheet
        filters={appliedFilters}
        onApply={(filters) => {
          setAppliedFilters(filters);
          setCardSheet(null);
        }}
        onClose={() => setCardSheet(null)}
        onOpenFullFilters={() => {
          setCardSheet(null);
          setCurrentView("filters");
        }}
      />}

      {currentView === "tasks" && cardSheet === "availability" && <CardAvailabilitySheet
        availability={availabilityTime}
        onApply={(nextAvailability) => {
          setAvailabilityTime(nextAvailability);
          setCardSheet(null);
        }}
        onClose={() => setCardSheet(null)}
        onOpenFullSettings={() => {
          setCardSheet(null);
          setIsSettingsOnboardingVisible(false);
          setCurrentView("settings");
        }}
      />}

      {currentView === "tasks" && startupPhase === "ready" && isSettingsOnboardingVisible && (
        <div
          className="settings-onboarding"
          role="presentation"
          style={settingsOnboardingAnchor ? {
            "--settings-onboarding-target-left": `${settingsOnboardingAnchor.left}px`,
            "--settings-onboarding-target-top": `${settingsOnboardingAnchor.top}px`,
          } : undefined}
        >
          <button
            aria-label="Закрыть подсказку настроек"
            className="settings-onboarding-dismiss"
            onClick={() => setIsSettingsOnboardingVisible(false)}
            type="button"
          />
          <aside aria-hidden="true" className="settings-onboarding-tooltip">
            <strong>настройте дни и часы доступности к подработкам</strong>
            <span>Покажем задания без пересечений с основным графиком работы, учитывая ваши пожелания</span>
          </aside>
          <button
            aria-label="Открыть настройки расписания"
            className="settings-onboarding-target"
            onClick={() => {
              setIsSettingsOnboardingVisible(false);
              setCurrentView("settings");
            }}
            type="button"
          >
            <img alt="" src={assetUrl("schedule_ic.svg")} />
          </button>
        </div>
      )}
    </main>
  );
}
