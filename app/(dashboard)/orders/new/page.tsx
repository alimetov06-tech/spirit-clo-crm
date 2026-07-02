import { createOrderAction } from "@/features/orders/actions";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { demoClients, demoGarmentTypes } from "@/lib/demo/data";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const workspace = await getCurrentWorkspace();
  const params = await searchParams;
  const supabase = await createClient();
  if (workspace.isDemo) {
    return <NewOrderView clients={demoClients} garmentTypes={demoGarmentTypes} params={params} />;
  }
  const [{ data: clientsData }, { data: garmentTypesData }] = await Promise.all([
    supabase.from("clients").select("id, name, phone").eq("organization_id", workspace.organizationId).is("archived_at", null).order("name"),
    supabase.from("garment_types").select("id, name").eq("organization_id", workspace.organizationId).eq("is_active", true).order("sort_order")
  ]);
  const clients = clientsData ?? [];
  const garmentTypes = garmentTypesData ?? [];

  return <NewOrderView clients={clients} garmentTypes={garmentTypes} params={params} />;
}

function NewOrderView({ clients, garmentTypes, params }: { clients: any[]; garmentTypes: any[]; params: { error?: string } }) {
  return (
    <>
      <PageHeader title="Новый заказ" description="Пошаговая форма в одном экране: клиент, изделия, оплата, даты и подтверждение." backHref="/orders" />
      {params.error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p> : null}
      <form action={createOrderAction} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>1. Клиент</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Выберите клиента">
              <Select name="client_id" required>
                <option value="">Клиент</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name} {client.phone ? `· ${client.phone}` : ""}</option>)}
              </Select>
            </Field>
            <div className="flex items-end">
              <Link href="/clients/new" className="text-sm font-medium text-graphite underline underline-offset-4">Быстро создать нового клиента</Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>2. Изделия</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {[0, 1, 2].map((index) => (
              <div key={index} className="grid gap-4 rounded-lg border border-graphite/10 bg-white/55 p-4 md:grid-cols-5">
                <Field label="Тип">
                  <Select name="garment_type_id" required={index === 0}>
                    <option value="">Не выбрано</option>
                    {garmentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </Select>
                </Field>
                <Field label="Название"><Input name="title" placeholder="Платье, тренч..." /></Field>
                <Field label="Кол-во"><Input name="quantity" type="number" min="1" defaultValue={index === 0 ? 1 : undefined} /></Field>
                <Field label="Цена"><Input name="unit_price" inputMode="decimal" placeholder="0" /></Field>
                <Field label="Дедлайн"><Input name="item_due_date" type="date" /></Field>
                <div className="md:col-span-5">
                  <Field label="Описание и пожелания"><Textarea name="description" /></Field>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>3. Оплата и даты</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Фиксированная скидка"><Input name="discount_amount" inputMode="decimal" defaultValue="0" /></Field>
            <Field label="Предоплата"><Input name="prepayment" inputMode="decimal" defaultValue="0" /></Field>
            <Field label="Способ оплаты">
              <Select name="payment_method" defaultValue="bank_transfer">
                <option value="cash">Наличные</option>
                <option value="bank_transfer">Перевод</option>
                <option value="card">Банковская карта</option>
                <option value="other">Другое</option>
              </Select>
            </Field>
            <Field label="Общий дедлайн"><Input name="due_date" type="date" /></Field>
            <Field label="Первая примерка"><Input name="first_fitting_at" type="datetime-local" /></Field>
            <div className="md:col-span-3"><Field label="Комментарий для заказа"><Textarea name="general_notes" /></Field></div>
            <div className="md:col-span-3"><Field label="Внутренние заметки"><Textarea name="internal_notes" /></Field></div>
          </CardContent>
        </Card>
        <Button type="submit">Создать заказ</Button>
      </form>
    </>
  );
}
