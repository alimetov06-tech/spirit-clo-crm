"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { getString } from "@/lib/validation/common";
import type { AppointmentStatus, AppointmentType } from "@/types/domain";

export async function createAppointmentAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  if (workspace.isDemo) redirect(`/calendar?message=${encodeURIComponent("Демо: событие было бы создано")}`);
  const title = z.string().min(2).parse(getString(formData, "title"));
  const startAt = z.string().min(1).parse(getString(formData, "start_at"));
  const supabase = await createClient();

  await supabase.from("appointments").insert({
    organization_id: workspace.organizationId,
    order_id: getString(formData, "order_id") || null,
    client_id: getString(formData, "client_id") || null,
    appointment_type: (getString(formData, "appointment_type") || "fitting") as AppointmentType,
    title,
    description: getString(formData, "description"),
    start_at: startAt,
    end_at: getString(formData, "end_at") || startAt,
    location: getString(formData, "location"),
    status: (getString(formData, "status") || "planned") as AppointmentStatus,
    created_by: workspace.userId
  });

  revalidatePath("/calendar");
  redirect("/calendar");
}
