"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { getString, moneySchema } from "@/lib/validation/common";
import type { OrderStatus, PaymentMethod, PaymentType } from "@/types/domain";

const orderSchema = z.object({
  client_id: z.string().uuid("Выберите клиента"),
  due_date: z.string().optional(),
  discount_amount: moneySchema.default(0),
  general_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  first_fitting_at: z.string().optional()
});

export async function createOrderAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  if (workspace.isDemo) redirect(`/orders/demo-order-1?message=${encodeURIComponent("Демо: заказ был бы создан в реальной базе")}`);
  const parsed = orderSchema.safeParse({
    client_id: getString(formData, "client_id"),
    due_date: getString(formData, "due_date") || null,
    discount_amount: getString(formData, "discount_amount") || 0,
    general_notes: getString(formData, "general_notes"),
    internal_notes: getString(formData, "internal_notes"),
    first_fitting_at: getString(formData, "first_fitting_at")
  });
  if (!parsed.success) redirect(`/orders/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ошибка заказа")}`);

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      organization_id: workspace.organizationId,
      client_id: parsed.data.client_id,
      status: "new_request",
      created_by: workspace.userId,
      responsible_user_id: workspace.userId,
      order_date: new Date().toISOString().slice(0, 10),
      due_date: parsed.data.due_date || null,
      discount_amount: parsed.data.discount_amount,
      general_notes: parsed.data.general_notes,
      internal_notes: parsed.data.internal_notes
    })
    .select("id, order_number")
    .single();

  if (error || !order) redirect(`/orders/new?error=${encodeURIComponent("Не удалось создать заказ")}`);

  const garmentTypeIds = formData.getAll("garment_type_id").map(String);
  const titles = formData.getAll("title").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const prices = formData.getAll("unit_price").map(String);
  const descriptions = formData.getAll("description").map(String);
  const itemDueDates = formData.getAll("item_due_date").map(String);

  const items = garmentTypeIds
    .map((garmentTypeId, index) => ({
      organization_id: workspace.organizationId,
      order_id: order.id,
      garment_type_id: garmentTypeId,
      title: titles[index] || "Изделие",
      quantity: Number(quantities[index] || 1),
      unit_price: Number((prices[index] || "0").replace(",", ".")),
      description: descriptions[index] || "",
      due_date: itemDueDates[index] || parsed.data.due_date || null,
      measurement_snapshot: {}
    }))
    .filter((item) => item.garment_type_id && item.quantity > 0);

  if (items.length) await supabase.from("order_items").insert(items);

  const prepayment = Number((getString(formData, "prepayment") || "0").replace(",", "."));
  if (Number.isFinite(prepayment) && prepayment > 0) {
    await supabase.from("payments").insert({
      organization_id: workspace.organizationId,
      order_id: order.id,
      client_id: parsed.data.client_id,
      amount: prepayment,
      payment_type: "prepayment",
      payment_method: (getString(formData, "payment_method") || "bank_transfer") as PaymentMethod,
      payment_date: new Date().toISOString().slice(0, 10),
      created_by: workspace.userId
    });
  }

  if (parsed.data.first_fitting_at) {
    await supabase.from("appointments").insert({
      organization_id: workspace.organizationId,
      order_id: order.id,
      client_id: parsed.data.client_id,
      appointment_type: "fitting",
      title: `Примерка ${order.order_number}`,
      start_at: parsed.data.first_fitting_at,
      end_at: parsed.data.first_fitting_at,
      status: "planned",
      created_by: workspace.userId
    });
  }

  await supabase.from("order_status_history").insert({
    organization_id: workspace.organizationId,
    order_id: order.id,
    from_status: null,
    to_status: "new_request",
    changed_by: workspace.userId,
    comment: "Заказ создан"
  });

  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
}

export async function updateOrderStatusAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const orderIdRaw = getString(formData, "order_id");
  if (workspace.isDemo) redirect(`/orders/${orderIdRaw}?message=${encodeURIComponent("Демо: статус был бы изменён")}`);
  const orderId = z.string().uuid().parse(orderIdRaw);
  const nextStatus = getString(formData, "status") as OrderStatus;
  const comment = getString(formData, "comment");
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("organization_id", workspace.organizationId)
    .single();

  if (!order) redirect(`/orders/${orderId}?error=${encodeURIComponent("Заказ не найден")}`);

  const deliveredAt = nextStatus === "delivered" ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("orders")
    .update({ status: nextStatus, delivered_at: deliveredAt })
    .eq("id", orderId)
    .eq("organization_id", workspace.organizationId);

  if (!error) {
    await supabase.from("order_status_history").insert({
      organization_id: workspace.organizationId,
      order_id: orderId,
      from_status: order.status,
      to_status: nextStatus,
      changed_by: workspace.userId,
      comment
    });
  }

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function addPaymentAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const orderIdRaw = getString(formData, "order_id");
  if (workspace.isDemo) redirect(`/orders/${orderIdRaw}?message=${encodeURIComponent("Демо: платёж был бы добавлен")}`);
  const orderId = z.string().uuid().parse(orderIdRaw);
  const clientId = z.string().uuid().parse(getString(formData, "client_id"));
  const amount = moneySchema.parse(getString(formData, "amount"));
  const supabase = await createClient();

  await supabase.from("payments").insert({
    organization_id: workspace.organizationId,
    order_id: orderId,
    client_id: clientId,
    amount,
    payment_type: getString(formData, "payment_type") as PaymentType,
    payment_method: getString(formData, "payment_method") as PaymentMethod,
    payment_date: getString(formData, "payment_date") || new Date().toISOString().slice(0, 10),
    notes: getString(formData, "notes"),
    created_by: workspace.userId
  });

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?message=${encodeURIComponent("Платёж добавлен")}`);
}

export async function addOrderExpenseAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const orderIdRaw = getString(formData, "order_id");
  if (workspace.isDemo) redirect(`/orders/${orderIdRaw}?message=${encodeURIComponent("Демо: расход был бы добавлен")}`);
  const orderId = z.string().uuid().parse(orderIdRaw);
  const amount = moneySchema.parse(getString(formData, "amount"));
  const supabase = await createClient();

  await supabase.from("order_expenses").insert({
    organization_id: workspace.organizationId,
    order_id: orderId,
    category: getString(formData, "category") || "прочие расходы",
    description: getString(formData, "description"),
    quantity: Number(getString(formData, "quantity") || 1),
    unit_price: Number(getString(formData, "unit_price") || amount),
    amount,
    expense_date: getString(formData, "expense_date") || new Date().toISOString().slice(0, 10),
    notes: getString(formData, "notes"),
    created_by: workspace.userId
  });

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?message=${encodeURIComponent("Расход добавлен")}`);
}

export async function addCommentAction(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  if (workspace.isDemo) redirect(`/orders/${getString(formData, "order_id") || getString(formData, "entity_id")}?message=${encodeURIComponent("Демо: комментарий был бы добавлен")}`);
  const entityType = getString(formData, "entity_type");
  const entityId = z.string().uuid().parse(getString(formData, "entity_id"));
  const orderId = getString(formData, "order_id") || entityId;
  const body = z.string().min(1).max(4000).parse(getString(formData, "body"));
  const supabase = await createClient();

  await supabase.from("comments").insert({
    organization_id: workspace.organizationId,
    entity_type: entityType,
    entity_id: entityId,
    body,
    author_id: workspace.userId
  });

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}
