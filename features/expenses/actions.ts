"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { getString, moneySchema } from "@/lib/validation/common";

export async function createGeneralExpenseAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  if (workspace.isDemo) redirect(`/expenses?message=${encodeURIComponent("Демо: расход был бы добавлен")}`);
  const amount = moneySchema.parse(getString(formData, "amount"));
  const supabase = await createClient();
  const { error } = await supabase.from("general_expenses").insert({
    organization_id: workspace.organizationId,
    expense_date: getString(formData, "expense_date") || new Date().toISOString().slice(0, 10),
    category: getString(formData, "category") || "прочее",
    description: getString(formData, "description"),
    amount,
    payment_method: getString(formData, "payment_method") || "bank_transfer",
    vendor: getString(formData, "vendor"),
    notes: getString(formData, "notes"),
    created_by: workspace.userId
  });

  if (error) redirect(`/expenses?error=${encodeURIComponent("Не удалось добавить расход")}`);
  revalidatePath("/expenses");
  redirect(`/expenses?message=${encodeURIComponent("Расход добавлен")}`);
}

export async function archiveGeneralExpenseAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  if (workspace.isDemo) redirect(`/expenses?message=${encodeURIComponent("Демо: расход был бы архивирован")}`);
  const id = z.string().uuid().parse(getString(formData, "id"));
  const supabase = await createClient();
  await supabase
    .from("general_expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", workspace.organizationId);
  revalidatePath("/expenses");
  redirect("/expenses");
}
