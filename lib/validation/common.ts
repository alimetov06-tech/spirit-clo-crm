import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const moneySchema = z.coerce
  .number({ invalid_type_error: "Введите сумму" })
  .min(0, "Сумма не может быть отрицательной")
  .max(999999999, "Слишком большая сумма");

export const optionalDateSchema = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null ? "" : String(value).trim();
}
