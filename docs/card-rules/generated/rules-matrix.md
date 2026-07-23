# Матрица правил

| Rule ID | Правило | Статус | Сущность | Табы | Цель | Эффект | Priority | Исключения |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RULE-PLACEMENT-001 | Доступная услуга показывается в каталоге | active | service_offer | tasks | placement:available_offers | place | 700 | EXC-PLACEMENT-001, EXC-PLACEMENT-002 |
| RULE-MARKER-001 | Маркер Подходит вам | active | service_offer | tasks, favorites | content_element:marker.suitable_for_you | show | 600 | EXC-MARKER-001 |
| RULE-VARIANT-001 | Observed-условие маркера Подходит вам | provisional | service_offer | tasks, favorites | content_element:marker.suitable_for_you | show | 600 | - |
| RULE-SPECIAL-001 | Вариант Специально для вас | provisional | service_offer | tasks | card_variant:special | set_variant | 500 | EXC-SPECIAL-001 |
| RULE-SPECIAL-002 | Специальные предложения идут первыми до явной сортировки | provisional | service_offer | tasks | order:special_offers | set_order | 500 | - |
| RULE-RESTRICTION-001 | Одно ограничение показывает статус Не подходит | provisional | service_offer | tasks, favorites | card_variant:restriction_status | set_variant | 600 | - |
| RULE-RESTRICTION-002 | Два ограничения показывают общий статус | provisional | service_offer | tasks, favorites | card_variant:restriction_status_plus | set_variant | 600 | - |
| RULE-RESTRICTION-003 | Три и более ограничения показываются тегами | provisional | service_offer | tasks, favorites | card_variant:restriction_tags | set_variant | 600 | - |
| RULE-SHIFT-001 | Основная смена показывается перед услугами дня | active | employee_shift | tasks | placement:employee_schedule | place | 800 | - |
| RULE-MYTASKS-001 | Принятая услуга появляется в Моих заданиях | active | service_offer | my_tasks | placement:upcoming | place | 800 | - |
| RULE-MYTASKS-002 | Статус определяет секцию в Моих заданиях | provisional | service_offer | my_tasks | placement:map | place | 800 | - |
| RULE-FAVORITES-001 | Сохранённая услуга показывается в Избранном | active | service_offer | favorites | placement:services_available | place | 700 | EXC-FAVORITES-001 |
| RULE-FAVORITES-002 | Сохранённая подборка показывается в Избранном | active | saved_collection | favorites | placement:collections | place | 700 | - |
| RULE-FAVORITES-003 | Карточка избранного магазина показывается в Избранном | active | favorite_store | favorites | placement:stores | place | 700 | - |
| RULE-SIGNING-001 | Документы пользователя показываются в табе На подписание | active | service_offer | signing | placement:waiting_user | place | 800 | EXC-SIGNING-001 |
| RULE-SIGNING-002 | Документы на проверке остаются в табе Signing | active | service_offer | signing | placement:processing | place | 800 | - |
| RULE-SIGNING-003 | Подписанные документы остаются в табе Signing | active | service_offer | signing | placement:signed | place | 800 | - |
| RULE-SIGNING-004 | Отклонённые документы остаются в табе Signing | active | service_offer | signing | placement:rejected | place | 800 | - |
| RULE-SIGNING-005 | Подписать можно только документ в ожидании пользователя | active | service_offer | signing | action:signing.primary_action | enable | 900 | - |
| RULE-CONTENT-001 | Метро показывается только при наличии данных | provisional | service_offer | tasks, favorites | content_element:service.metro | show | 100 | - |
| RULE-HIDDEN-001 | Список скрытых услуг исключает фильтры и основную смену | active | service_offer | tasks | placement:other_offers | place | 700 | - |
| RULE-ACTION-001 | Недоступную услугу нельзя принять | active | service_offer | tasks, favorites | action:service.primary_action | disable | 900 | - |
