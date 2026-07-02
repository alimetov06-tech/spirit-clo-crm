"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { getString } from "@/lib/validation/common";

export async function createMeasurementSetAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const rawClientId = getString(formData, "client_id");
  if (workspace.isDemo) redirect(`/clients/${rawClientId}?message=${encodeURIComponent("Демо: новая версия мерок была бы сохранена")}`);
  const clientId = z.string().uuid().parse(rawClientId);
  const notes = getString(formData, "measurement_notes");
  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("client_measurement_sets")
    .select("version")
    .eq("organization_id", workspace.organizationId)
    .eq("client_id", clientId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("client_measurement_sets")
    .update({ is_current: false })
    .eq("organization_id", workspace.organizationId)
    .eq("client_id", clientId);

  const { data: set, error } = await supabase
    .from("client_measurement_sets")
    .insert({
      organization_id: workspace.organizationId,
      client_id: clientId,
      version: (latest?.version ?? 0) + 1,
      measured_at: new Date().toISOString(),
      measured_by: workspace.userId,
      notes,
      is_current: true
    })
    .select("id")
    .single();

  if (error || !set) redirect(`/clients/${clientId}?error=${encodeURIComponent("Не удалось сохранить мерки")}`);

  const definitions = formData.getAll("measurement_definition_id").map(String);
  const values = formData.getAll("measurement_value").map(String);
  const rows = definitions
    .map((definitionId, index) => ({
      measurement_set_id: set.id,
      measurement_definition_id: definitionId,
      value: Number(values[index]?.replace(",", ".")),
      notes: ""
    }))
    .filter((row) => row.measurement_definition_id && Number.isFinite(row.value) && row.value > 0);

  if (rows.length) await supabase.from("client_measurement_values").insert(rows);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?message=${encodeURIComponent("Новая версия мерок сохранена")}`);
}
