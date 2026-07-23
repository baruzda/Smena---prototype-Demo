# Матрица контента

| ID | Элемент | Слот | Источник | Обязательный | Fallback | Шаблоны |
| --- | --- | --- | --- | --- | --- | --- |
| service.title | Название услуги | title | service.title | Да | - | service_offer_card, my_service_card, signing_card |
| service.brand | Бренд | header | service.brand | Да | neutral_brand_mark | service_offer_card, my_service_card |
| service.address | Адрес | location | service.address | Да | Адрес уточняется | service_offer_card, my_service_card, employee_shift_card |
| service.metro | Метро | location | service.metro | Нет | - | service_offer_card, my_service_card, employee_shift_card |
| service.distance | Расстояние | location | service.distance | Нет | - | service_offer_card, my_service_card, employee_shift_card |
| service.payment_total | Вознаграждение за услугу | commercial | service.payment | Да | Вознаграждение уточняется | service_offer_card, my_service_card |
| service.payment_rate | Ставка в час | commercial | service.rate | Нет | - | service_offer_card, my_service_card |
| service.time_range | Время оказания услуги | schedule | service.hours | Да | Время уточняется | service_offer_card, my_service_card, employee_shift_card |
| service.duration_break | Продолжительность и перерыв | schedule | service.breakInfo | Нет | - | service_offer_card, my_service_card, employee_shift_card |
| service.date | Дата | date | service.date | Да | - | my_service_card, employee_shift_card |
| service.status | Статус услуги | status | computed | Нет | - | my_service_card, signing_card |
| marker.suitable_for_you | Подходит вам | markers | computed | Нет | - | service_offer_card |
| marker.specially_for_you | Специально для вас | markers | computed | Нет | - | service_offer_card |
| special.countdown | Таймер предложения | markers | service.specialOfferExpiresAt | Нет | - | service_offer_card |
| restrictions.summary | Короткий статус ограничений | restrictions | computed | Нет | - | service_offer_card |
| restrictions.tags | Причины ограничений | restrictions | service.restrictionTags | Нет | - | service_offer_card |
| service.primary_action | Основное действие | actions | computed | Нет | - | service_offer_card, my_service_card |
| signing.document_status | Статус документов | document | signing.status | Да | Статус уточняется | signing_card |
| signing.deadline | Срок подписания | deadline | signing.deadline | Нет | - | signing_card |
| signing.primary_action | Действие с документами | actions | computed | Да | - | signing_card |
| collection.filters_summary | Состав подборки | filters_summary | collection.filters | Да | Без дополнительных фильтров | saved_collection_card |
| collection.location | Территория подборки | location | collection.location | Нет | Любая территория | saved_collection_card |
