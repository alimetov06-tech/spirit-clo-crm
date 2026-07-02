export const demoClients = [
  {
    id: "demo-client-1",
    name: "Мария Волкова",
    phone: "+7 999 111-22-33",
    telegram: "@maria_style",
    whatsapp: null,
    email: "maria@example.com",
    birth_date: "1994-05-12",
    address: "Москва",
    source: "Instagram",
    notes: "Любит спокойные силуэты и плотные ткани.",
    created_at: "2026-07-01T10:00:00+03:00",
    archived_at: null
  },
  {
    id: "demo-client-2",
    name: "Екатерина Орлова",
    phone: "+7 999 222-33-44",
    telegram: null,
    whatsapp: "+7 999 222-33-44",
    email: "kate@example.com",
    birth_date: "1990-11-20",
    address: "Москва",
    source: "рекомендация",
    notes: "Часто заказывает капсульные вещи.",
    created_at: "2026-07-01T11:00:00+03:00",
    archived_at: null
  }
];

export const demoGarmentTypes = [
  { id: "demo-garment-dress", name: "платье", sort_order: 10, is_active: true },
  { id: "demo-garment-trench", name: "тренч", sort_order: 20, is_active: true },
  { id: "demo-garment-shirt", name: "рубашка", sort_order: 30, is_active: true },
  { id: "demo-garment-blouse", name: "блуза", sort_order: 40, is_active: true },
  { id: "demo-garment-skirt", name: "юбка", sort_order: 50, is_active: true },
  { id: "demo-garment-pants", name: "брюки", sort_order: 60, is_active: true },
  { id: "demo-garment-jacket", name: "жакет", sort_order: 70, is_active: true },
  { id: "demo-garment-vest", name: "жилет", sort_order: 80, is_active: true },
  { id: "demo-garment-suit", name: "костюм", sort_order: 90, is_active: true },
  { id: "demo-garment-coat", name: "пальто", sort_order: 100, is_active: true },
  { id: "demo-garment-corset", name: "корсет", sort_order: 110, is_active: true },
  { id: "demo-garment-top", name: "топ", sort_order: 120, is_active: true },
  { id: "demo-garment-overalls", name: "комбинезон", sort_order: 130, is_active: true },
  { id: "demo-garment-alteration", name: "ремонт/подгонка", sort_order: 140, is_active: true },
  { id: "demo-garment-other", name: "другое", sort_order: 150, is_active: true }
];

export const demoMeasurementDefinitions = [
  { id: "demo-measure-height", name: "рост", unit: "см", sort_order: 10 },
  { id: "demo-measure-chest", name: "обхват груди", unit: "см", sort_order: 20 },
  { id: "demo-measure-waist", name: "обхват талии", unit: "см", sort_order: 30 },
  { id: "demo-measure-hips", name: "обхват бёдер", unit: "см", sort_order: 40 },
  { id: "demo-measure-shoulders", name: "ширина плеч", unit: "см", sort_order: 50 },
  { id: "demo-measure-sleeve", name: "длина рукава", unit: "см", sort_order: 60 }
];

export const demoOrders = [
  {
    id: "demo-order-1",
    order_number: "SP-2026-0001",
    client_id: "demo-client-1",
    clients: demoClients[0],
    status: "sewing",
    order_date: "2026-07-01",
    due_date: "2026-07-14",
    delivered_at: null,
    discount_amount: 0,
    general_notes: "Платье к мероприятию.",
    internal_notes: "Проверить посадку по талии.",
    archived_at: null,
    order_items: [
      {
        id: "demo-item-1",
        title: "Платье миди из вискозы",
        quantity: 1,
        unit_price: 42000,
        description: "Спокойный силуэт, длина ниже колена.",
        due_date: "2026-07-14",
        garment_types: demoGarmentTypes[0]
      }
    ],
    payments: [{ id: "demo-payment-1", amount: 20000, payment_type: "prepayment", payment_method: "bank_transfer", payment_date: "2026-07-02", voided_at: null }],
    order_expenses: [{ id: "demo-expense-1", category: "ткань", description: "Вискоза", amount: 9000, expense_date: "2026-07-02", deleted_at: null }],
    appointments: [{ id: "demo-event-1", title: "Примерка SP-2026-0001", start_at: "2026-07-06T12:00:00+03:00", status: "planned" }],
    order_status_history: [{ id: "demo-history-1", from_status: null, to_status: "new_request", comment: "Заказ создан", created_at: "2026-07-01T10:30:00+03:00" }],
    comments: [{ id: "demo-comment-1", body: "Клиентка просила мягкую линию плеча.", created_at: "2026-07-01T12:00:00+03:00" }]
  },
  {
    id: "demo-order-2",
    order_number: "SP-2026-0002",
    client_id: "demo-client-2",
    clients: demoClients[1],
    status: "ready",
    order_date: "2026-07-01",
    due_date: "2026-07-08",
    delivered_at: null,
    discount_amount: 3000,
    general_notes: "Тренч на подкладке.",
    internal_notes: "",
    archived_at: null,
    order_items: [
      {
        id: "demo-item-2",
        title: "Тренч с мягким плечом",
        quantity: 1,
        unit_price: 78000,
        description: "Тёплый беж, длина миди.",
        due_date: "2026-07-08",
        garment_types: demoGarmentTypes[1]
      }
    ],
    payments: [{ id: "demo-payment-2", amount: 40000, payment_type: "prepayment", payment_method: "card", payment_date: "2026-07-02", voided_at: null }],
    order_expenses: [{ id: "demo-expense-2", category: "ткань", description: "Плащёвка и подклад", amount: 18000, expense_date: "2026-07-02", deleted_at: null }],
    appointments: [{ id: "demo-event-2", title: "Финальная примерка SP-2026-0002", start_at: "2026-07-05T15:00:00+03:00", status: "confirmed" }],
    order_status_history: [{ id: "demo-history-2", from_status: "fitting", to_status: "ready", comment: "Готов к выдаче", created_at: "2026-07-02T14:30:00+03:00" }],
    comments: []
  },
  {
    id: "demo-order-3",
    order_number: "SP-2026-0003",
    client_id: "demo-client-1",
    clients: demoClients[0],
    status: "delivered",
    order_date: "2026-06-18",
    due_date: "2026-06-28",
    delivered_at: "2026-07-01T17:00:00+03:00",
    discount_amount: 0,
    general_notes: "Комплект рубашек.",
    internal_notes: "",
    archived_at: null,
    order_items: [
      {
        id: "demo-item-3",
        title: "Две рубашки из хлопка",
        quantity: 2,
        unit_price: 18500,
        description: "Белая и молочная рубашка.",
        due_date: "2026-06-28",
        garment_types: demoGarmentTypes[2]
      }
    ],
    payments: [
      { id: "demo-payment-3", amount: 20000, payment_type: "prepayment", payment_method: "bank_transfer", payment_date: "2026-06-18", voided_at: null },
      { id: "demo-payment-4", amount: 17000, payment_type: "final_payment", payment_method: "cash", payment_date: "2026-07-01", voided_at: null }
    ],
    order_expenses: [{ id: "demo-expense-3", category: "работа швеи", description: "Пошив рубашек", amount: 11000, expense_date: "2026-06-25", deleted_at: null }],
    appointments: [],
    order_status_history: [{ id: "demo-history-3", from_status: "ready", to_status: "delivered", comment: "Выдано клиентке", created_at: "2026-07-01T17:00:00+03:00" }],
    comments: []
  }
];

export const demoGeneralExpenses = [
  { id: "demo-general-expense-1", expense_date: "2026-07-01", category: "аренда", description: "Аренда студии", amount: 65000, payment_method: "bank_transfer", vendor: "БЦ", notes: "" },
  { id: "demo-general-expense-2", expense_date: "2026-07-02", category: "реклама", description: "Продвижение Telegram", amount: 12000, payment_method: "card", vendor: "Telegram Ads", notes: "" }
];

export const demoAppointments = demoOrders.flatMap((order) =>
  order.appointments.map((event) => ({
    ...event,
    appointment_type: "fitting",
    description: "",
    location: "Студия SPIRIT.CLO",
    client_id: order.client_id,
    order_id: order.id,
    clients: order.clients,
    orders: { order_number: order.order_number }
  }))
);

export const demoMembers = [
  { role: "owner", is_active: true, profiles: { full_name: "Демо собственник", email: "demo@spirit.clo" } }
];

export function findDemoClient(id: string) {
  return demoClients.find((client) => client.id === id) ?? demoClients[0];
}

export function findDemoOrder(id: string) {
  return demoOrders.find((order) => order.id === id) ?? demoOrders[0];
}
