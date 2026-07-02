"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { getString } from "@/lib/validation/common";

const clientSchema = z.object({
  name: z.string().min(2, "Введите имя клиента"),
  phone: z.string().optional(),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  address: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional()
});

export async function createClientAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  if (workspace.isDemo) redirect(`/clients/demo-client-1?message=${encodeURIComponent("Демо: клиент был бы создан в реальной базе")}`);
  const parsed = clientSchema.safeParse({
    name: getString(formData, "name"),
    phone: getString(formData, "phone"),
    telegram: getString(formData, "telegram"),
    whatsapp: getString(formData, "whatsapp"),
    email: getString(formData, "email"),
    birth_date: getString(formData, "birth_date"),
    address: getString(formData, "address"),
    source: getString(formData, "source"),
    notes: getString(formData, "notes")
  });

  if (!parsed.success) redirect(`/clients/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ошибка")}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
      birth_date: parsed.data.birth_date || null,
      organization_id: workspace.organizationId,
      created_by: workspace.userId
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/clients/new?error=${encodeURIComponent("Не удалось создать клиента")}`);
  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateClientAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const rawId = getString(formData, "id");
  if (workspace.isDemo) redirect(`/clients/${rawId}?message=${encodeURIComponent("Демо: изменения не сохраняются")}`);
  const id = z.string().uuid().parse(rawId);
  const parsed = clientSchema.safeParse({
    name: getString(formData, "name"),
    phone: getString(formData, "phone"),
    telegram: getString(formData, "telegram"),
    whatsapp: getString(formData, "whatsapp"),
    email: getString(formData, "email"),
    birth_date: getString(formData, "birth_date"),
    address: getString(formData, "address"),
    source: getString(formData, "source"),
    notes: getString(formData, "notes")
  });

  if (!parsed.success) redirect(`/clients/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ошибка")}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      ...parsed.data,
      email: parsed.data.email || null,
      birth_date: parsed.data.birth_date || null
    })
    .eq("id", id)
    .eq("organization_id", workspace.organizationId);

  if (error) redirect(`/clients/${id}?error=${encodeURIComponent("Не удалось сохранить клиента")}`);
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?message=${encodeURIComponent("Клиент сохранён")}`);
}

export async function archiveClientAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const rawId = getString(formData, "id");
  if (workspace.isDemo) redirect(`/clients?message=${encodeURIComponent("Демо: клиент был бы архивирован")}`);
  const id = z.string().uuid().parse(rawId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", workspace.organizationId);

  if (error) redirect(`/clients/${id}?error=${encodeURIComponent("Не удалось архивировать клиента")}`);
  revalidatePath("/clients");
  redirect("/clients");
}
