export type Role = "owner" | "manager" | "seamstress";

export type OrderStatus =
  | "new_request"
  | "measurements"
  | "awaiting_prepayment"
  | "purchasing_materials"
  | "sewing"
  | "fitting"
  | "alterations"
  | "ready"
  | "delivered"
  | "cancelled";

export type PaymentType = "prepayment" | "final_payment" | "additional_payment" | "refund";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";
export type AppointmentType = "fitting" | "consultation" | "measurements" | "delivery" | "purchase" | "internal" | "other";
export type AppointmentStatus = "planned" | "confirmed" | "completed" | "cancelled";

export const orderStatusLabels: Record<OrderStatus, string> = {
  new_request: "Новая заявка",
  measurements: "Замеры",
  awaiting_prepayment: "Ожидание предоплаты",
  purchasing_materials: "Закупка материалов",
  sewing: "В пошиве",
  fitting: "Примерка",
  alterations: "Доработка",
  ready: "Готово",
  delivered: "Выдано",
  cancelled: "Отменено"
};

export const orderStatuses = Object.keys(orderStatusLabels) as OrderStatus[];

export const paymentTypeLabels: Record<PaymentType, string> = {
  prepayment: "Предоплата",
  final_payment: "Окончательный расчёт",
  additional_payment: "Доплата",
  refund: "Возврат"
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Наличные",
  bank_transfer: "Перевод",
  card: "Банковская карта",
  other: "Другое"
};

export const appointmentTypeLabels: Record<AppointmentType, string> = {
  fitting: "Примерка",
  consultation: "Консультация",
  measurements: "Замеры",
  delivery: "Выдача заказа",
  purchase: "Закупка",
  internal: "Внутреннее событие",
  other: "Другое"
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  planned: "Запланировано",
  confirmed: "Подтверждено",
  completed: "Завершено",
  cancelled: "Отменено"
};

export type CurrentWorkspace = {
  userId: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
  role: Role;
  isDemo?: boolean;
};
