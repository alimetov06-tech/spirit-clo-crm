import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export function formatRubles(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "dd.MM.yyyy", { locale: ru });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "dd.MM.yyyy HH:mm", { locale: ru });
}

export function normalizeMoney(value: FormDataEntryValue | null) {
  if (value === null) return 0;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function phoneHref(phone: string | null | undefined) {
  if (!phone) return undefined;
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : undefined;
}
