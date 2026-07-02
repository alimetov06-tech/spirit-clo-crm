import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Заполните NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY перед запуском seed.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .upsert(
      {
        name: "SPIRIT.CLO",
        slug: "spirit-clo-demo",
        currency: "RUB",
        timezone: "Europe/Moscow"
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (orgError || !organization) throw orgError ?? new Error("Не удалось создать организацию");
  await supabase.rpc("seed_organization_defaults", { target_organization_id: organization.id });

  const { data: garmentTypes } = await supabase.from("garment_types").select("id, name").eq("organization_id", organization.id);
  const typeByName = new Map((garmentTypes ?? []).map((type) => [type.name, type.id]));

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .upsert(
      [
        { organization_id: organization.id, name: "Мария Волкова", phone: "+7 999 111-22-33", telegram: "@maria_style", source: "Instagram", notes: "Любит спокойные силуэты и плотные ткани." },
        { organization_id: organization.id, name: "Екатерина Орлова", phone: "+7 999 222-33-44", whatsapp: "+7 999 222-33-44", source: "рекомендация", notes: "Часто заказывает капсульные вещи." },
        { organization_id: organization.id, name: "Алина Миронова", phone: "+7 999 333-44-55", telegram: "@alina_m", source: "Telegram", notes: "Нужны напоминания за день до примерки." }
      ],
      { onConflict: "organization_id,phone" }
    )
    .select("id, name");

  if (clientsError || !clients?.length) throw clientsError ?? new Error("Не удалось создать клиентов");

  const ordersPayload = [
    { client_id: clients[0].id, status: "sewing", due_date: "2026-07-14", discount_amount: 0, item: ["платье", "Платье миди из вискозы", 1, 42000] },
    { client_id: clients[1].id, status: "fitting", due_date: "2026-07-09", discount_amount: 3000, item: ["тренч", "Тренч с мягким плечом", 1, 78000] },
    { client_id: clients[2].id, status: "ready", due_date: "2026-07-04", discount_amount: 0, item: ["рубашка", "Белая рубашка", 2, 18500] }
  ];

  for (const payload of ordersPayload) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        organization_id: organization.id,
        client_id: payload.client_id,
        status: payload.status,
        due_date: payload.due_date,
        discount_amount: payload.discount_amount,
        general_notes: "Демо-заказ"
      })
      .select("id")
      .single();
    if (orderError || !order) throw orderError ?? new Error("Не удалось создать заказ");

    await supabase.from("order_items").insert({
      organization_id: organization.id,
      order_id: order.id,
      garment_type_id: typeByName.get(payload.item[0] as string),
      title: payload.item[1],
      quantity: payload.item[2],
      unit_price: payload.item[3],
      measurement_snapshot: {}
    });

    await supabase.from("payments").insert({
      organization_id: organization.id,
      order_id: order.id,
      client_id: payload.client_id,
      amount: Number(payload.item[3]) * 0.5,
      payment_type: "prepayment",
      payment_method: "bank_transfer",
      payment_date: "2026-07-02"
    });

    await supabase.from("appointments").insert({
      organization_id: organization.id,
      order_id: order.id,
      client_id: payload.client_id,
      appointment_type: "fitting",
      title: "Примерка демо-заказа",
      start_at: "2026-07-06T12:00:00+03:00",
      end_at: "2026-07-06T13:00:00+03:00",
      status: "planned"
    });

    await supabase.from("order_expenses").insert({
      organization_id: organization.id,
      order_id: order.id,
      category: "ткань",
      description: "Основная ткань",
      quantity: 1,
      unit_price: 9000,
      amount: 9000,
      expense_date: "2026-07-02"
    });
  }

  await supabase.from("general_expenses").insert([
    { organization_id: organization.id, expense_date: "2026-07-01", category: "аренда", description: "Аренда студии", amount: 65000, payment_method: "bank_transfer" },
    { organization_id: organization.id, expense_date: "2026-07-02", category: "реклама", description: "Продвижение Telegram", amount: 12000, payment_method: "card" }
  ]);

  console.log("Демо-данные SPIRIT.CLO созданы. Пользователей и пароли seed не создаёт.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
