import Link from "next/link";
import { archiveClientAction, updateClientAction } from "@/features/clients/actions";
import { createMeasurementSetAction } from "@/features/measurements/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { finalOrderTotal, paidTotal } from "@/lib/calculations/finance";
import { formatDate, formatRubles } from "@/lib/formatters";
import type { OrderStatus } from "@/types/domain";
import { demoMeasurementDefinitions, demoOrders, findDemoClient } from "@/lib/demo/data";

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  if (workspace.isDemo) {
    const demoClient = { ...findDemoClient(id), orders: demoOrders.filter((order) => order.client_id === findDemoClient(id).id) };
    return <ClientView client={demoClient} definitions={demoMeasurementDefinitions} measurementSets={[]} query={query} />;
  }
  const [{ data: client }, { data: definitionsData }, { data: measurementSetsData }] = await Promise.all([
    supabase
      .from("clients")
      .select("*, orders(id, order_number, status, due_date, discount_amount, order_items(quantity, unit_price), payments(amount, payment_type, voided_at))")
      .eq("id", id)
      .eq("organization_id", workspace.organizationId)
      .single(),
    supabase.from("measurement_definitions").select("id, name, unit, sort_order").eq("organization_id", workspace.organizationId).eq("is_active", true).order("sort_order"),
    supabase
      .from("client_measurement_sets")
      .select("id, version, measured_at, notes, is_current, client_measurement_values(value, measurement_definitions(name, unit))")
      .eq("organization_id", workspace.organizationId)
      .eq("client_id", id)
      .order("version", { ascending: false })
  ]);
  const definitions = definitionsData ?? [];
  const measurementSets = measurementSetsData ?? [];

  if (!client) return <PageHeader title="Клиент не найден" backHref="/clients" />;

  return <ClientView client={client} definitions={definitions} measurementSets={measurementSets} query={query} />;
}

function ClientView({ client, definitions, measurementSets, query }: { client: any; definitions: any[]; measurementSets: any[]; query: { error?: string; message?: string } }) {
  const orders = client.orders ?? [];
  const total = orders.reduce((sum: number, order: any) => {
    const items = (order.order_items ?? []).map((item: any) => ({ quantity: Number(item.quantity), unitPrice: Number(item.unit_price) }));
    return sum + finalOrderTotal(items, Number(order.discount_amount ?? 0));
  }, 0);
  const paid = orders.reduce((sum: number, order: any) => {
    return sum + paidTotal((order.payments ?? []).map((payment: any) => ({ amount: Number(payment.amount), type: payment.payment_type, voided: Boolean(payment.voided_at) })));
  }, 0);

  return (
    <>
      <PageHeader title={client.name} description={`Покупки: ${formatRubles(total)} · Оплачено: ${formatRubles(paid)} · Долг: ${formatRubles(Math.max(0, total - paid))}`} backHref="/clients" />
      {query.error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{query.error}</p> : null}
      {query.message ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{query.message}</p> : null}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Общая информация</CardTitle></CardHeader>
          <CardContent>
            <form action={updateClientAction} className="grid gap-5 md:grid-cols-2">
              <input type="hidden" name="id" value={client.id} />
              <Field label="Имя или ФИО"><Input name="name" defaultValue={client.name} required /></Field>
              <Field label="Телефон"><Input name="phone" defaultValue={client.phone ?? ""} /></Field>
              <Field label="Telegram"><Input name="telegram" defaultValue={client.telegram ?? ""} /></Field>
              <Field label="WhatsApp"><Input name="whatsapp" defaultValue={client.whatsapp ?? ""} /></Field>
              <Field label="Email"><Input name="email" type="email" defaultValue={client.email ?? ""} /></Field>
              <Field label="Дата рождения"><Input name="birth_date" type="date" defaultValue={client.birth_date ?? ""} /></Field>
              <Field label="Источник">
                <Select name="source" defaultValue={client.source ?? "Instagram"}>
                  {["Instagram", "Telegram", "рекомендация", "постоянный клиент", "другое"].map((item) => <option key={item}>{item}</option>)}
                </Select>
              </Field>
              <Field label="Адрес"><Input name="address" defaultValue={client.address ?? ""} /></Field>
              <div className="md:col-span-2"><Field label="Заметки"><Textarea name="notes" defaultValue={client.notes ?? ""} /></Field></div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit">Сохранить</Button>
                <form action={archiveClientAction}>
                  <input type="hidden" name="id" value={client.id} />
                  <Button type="submit" variant="danger">Архивировать</Button>
                </form>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Новая версия мерок</CardTitle></CardHeader>
          <CardContent>
            <form action={createMeasurementSetAction} className="space-y-4">
              <input type="hidden" name="client_id" value={client.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                {definitions.slice(0, 12).map((definition) => (
                  <div key={definition.id}>
                    <input type="hidden" name="measurement_definition_id" value={definition.id} />
                    <Field label={`${definition.name}, ${definition.unit}`}>
                      <Input name="measurement_value" inputMode="decimal" />
                    </Field>
                  </div>
                ))}
              </div>
              <Field label="Комментарий к замеру"><Textarea name="measurement_notes" /></Field>
              <Button type="submit">Сохранить мерки</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Заказы клиента</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {orders.map((order: any) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between rounded-lg border border-graphite/10 bg-white/60 p-3">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-graphite/65">Дедлайн: {formatDate(order.due_date)}</p>
                </div>
                <StatusBadge status={order.status as OrderStatus} />
              </Link>
            ))}
            {!orders.length ? <p className="text-sm text-graphite/65">Заказов пока нет.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>История мерок</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {measurementSets.map((set: any) => (
              <div key={set.id} className="rounded-lg border border-graphite/10 bg-white/60 p-3">
                <p className="font-medium">Версия {set.version} {set.is_current ? "· текущая" : ""}</p>
                <p className="text-sm text-graphite/65">{formatDate(set.measured_at)}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {(set.client_measurement_values ?? []).slice(0, 8).map((value: any, index: number) => (
                    <p key={index}>{value.measurement_definitions?.name}: {value.value} {value.measurement_definitions?.unit}</p>
                  ))}
                </div>
              </div>
            ))}
            {!measurementSets.length ? <p className="text-sm text-graphite/65">Сохранённых мерок пока нет.</p> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
