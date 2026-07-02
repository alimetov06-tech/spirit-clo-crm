import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("smoke-сценарии CRM", () => {
  it("имеет страницы ключевых пользовательских сценариев", () => {
    [
      "app/(auth)/login/page.tsx",
      "app/(dashboard)/clients/new/page.tsx",
      "app/(dashboard)/clients/[id]/page.tsx",
      "app/(dashboard)/orders/new/page.tsx",
      "app/(dashboard)/orders/[id]/page.tsx",
      "app/(dashboard)/calendar/page.tsx",
      "app/(dashboard)/dashboard/page.tsx"
    ].forEach((file) => expect(existsSync(join(root, file))).toBe(true));
  });

  it("содержит обязательные таблицы и RLS в миграции", () => {
    const sql = readFileSync(join(root, "supabase/migrations/001_initial_schema.sql"), "utf8");
    [
      "organizations",
      "profiles",
      "organization_members",
      "clients",
      "client_measurement_sets",
      "orders",
      "order_items",
      "payments",
      "order_expenses",
      "general_expenses",
      "appointments",
      "attachments",
      "comments",
      "notifications"
    ].forEach((table) => expect(sql).toContain(`public.${table}`));
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("next_order_number");
  });
});
