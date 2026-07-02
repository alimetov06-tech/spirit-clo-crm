import { addCommentAction, addOrderExpenseAction, addPaymentAction, updateOrderStatusAction } from "@/features/orders/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { directCostTotal, finalOrderTotal, grossProfit, marginPercent, paidTotal } from "@/lib/calculations/finance";
import { formatDate, formatDateTime, formatRubles } from "@/lib/formatters";
import { orderStatusLabels, paymentMethodLabels, paymentTypeLabels, type OrderStatus } from "@/types/domain";
import { findDemoOrder } from "@/lib/demo/data";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  if (workspace.isDemo) {
    return <OrderView order={findDemoOrder(id)} query={query} />;
  }
  const { data: order } = await supabase
    .from("orders")
    .select("*, clients(id, name, phone), order_items(*, garment_types(name)), payments(*), order_expenses(*), appointments(*), order_status_history(*), comments(*)")
    .eq("id", id)
    .eq("organization_id", workspace.organizationId)
    .single();

  if (!order) return <PageHeader title="Заказ не найден" backHref="/orders" />;

  return <OrderView order={order} query={query} />;
}

function OrderView({ order, query }: { order: any; query: { error?: string; message?: string } }) {
  const items = (order.order_items ?? []).map((item: any) => ({ quantity: Number(item.quantity), unitPrice: Number(item.unit_price) }));
  const total = finalOrderTotal(items, Number(order.discount_amount ?? 0));
  const paid = paidTotal((order.payments ?? []).map((payment: any) => ({ amount: Number(payment.amount), type: payment.payment_type, voided: Boolean(payment.voided_at) })));
  const directCosts = directCostTotal((order.order_expenses ?? []).map((expense: any) => ({ amount: Number(expense.amount), deleted: Boolean(expense.deleted_at) })));
  const profit = grossProfit(total, directCosts);

  return (
    <>
      <PageHeader title={order.order_number} description={`${(order.clients as any)?.name ?? "Клиент"} · ${formatRubles(total)} · остаток ${formatRubles(Math.max(0, total - paid))}`} backHref="/orders" />
      {query.error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{query.error}</p> : null}
      {query.message ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{query.message}</p> : null}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4"><p className="text-sm text-graphite/65">Статус</p><div className="mt-3"><StatusBadge status={order.status as OrderStatus} /></div></Card>
        <Card className="p-4"><p className="text-sm text-graphite/65">Финальная стоимость</p><p className="mt-3 text-xl font-semibold">{formatRubles(total)}</p></Card>
        <Card className="p-4"><p className="text-sm text-graphite/65">Оплачено</p><p className="mt-3 text-xl font-semibold">{formatRubles(paid)}</p></Card>
        <Card className="p-4"><p className="text-sm text-graphite/65">Себестоимость</p><p className="mt-3 text-xl font-semibold">{formatRubles(directCosts)}</p></Card>
        <Card className="p-4"><p className="text-sm text-graphite/65">Прибыль</p><p className="mt-3 text-xl font-semibold">{formatRubles(profit)}</p></Card>
      </div>
      {total > paid && order.status === "ready" ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Заказ готов, но оплачен не полностью. Выдача не запрещена, но долг нужно видеть явно.</p> : null}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader><CardTitle>Изделия</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(order.order_items ?? []).map((item: any) => (
              <div key={item.id} className="rounded-lg border border-graphite/10 bg-white/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.title || item.garment_types?.name}</p>
                  <p className="text-sm text-graphite/70">{item.quantity} × {formatRubles(item.unit_price)}</p>
                </div>
                <p className="mt-2 text-sm text-graphite/70">{item.description || "Описание не указано"}</p>
                <p className="mt-2 text-xs text-graphite/55">Дедлайн изделия: {formatDate(item.due_date)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Изменить статус</CardTitle></CardHeader>
          <CardContent>
            <form action={updateOrderStatusAction} className="space-y-4">
              <input type="hidden" name="order_id" value={order.id} />
              <Field label="Новый статус">
                <Select name="status" defaultValue={order.status}>
                  {Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </Field>
              <Field label="Комментарий"><Textarea name="comment" /></Field>
              <Button type="submit">Сохранить статус</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Платежи</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(order.payments ?? []).map((payment: any) => (
              <div key={payment.id} className="flex justify-between rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">
                <span>{paymentTypeLabels[payment.payment_type as keyof typeof paymentTypeLabels]} · {formatDate(payment.payment_date)}</span>
                <strong>{formatRubles(payment.payment_type === "refund" ? -payment.amount : payment.amount)}</strong>
              </div>
            ))}
            <form action={addPaymentAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="client_id" value={order.client_id} />
              <Field label="Сумма"><Input name="amount" inputMode="decimal" required /></Field>
              <Field label="Дата"><Input name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
              <Field label="Тип"><Select name="payment_type">{Object.entries(paymentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <Field label="Метод"><Select name="payment_method">{Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <div className="md:col-span-2"><Field label="Заметка"><Input name="notes" /></Field></div>
              <Button type="submit">Добавить платёж</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Себестоимость</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-graphite/70">Валовая прибыль: {formatRubles(profit)} · рентабельность {marginPercent(total, profit)}%</p>
            {(order.order_expenses ?? []).map((expense: any) => (
              <div key={expense.id} className="flex justify-between rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">
                <span>{expense.category} · {expense.description}</span>
                <strong>{formatRubles(expense.amount)}</strong>
              </div>
            ))}
            <form action={addOrderExpenseAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="order_id" value={order.id} />
              <Field label="Категория"><Select name="category">{["ткань", "фурнитура", "работа швеи", "такси", "упаковка", "доля аренды", "прочие расходы"].map((item) => <option key={item}>{item}</option>)}</Select></Field>
              <Field label="Сумма"><Input name="amount" inputMode="decimal" required /></Field>
              <Field label="Кол-во"><Input name="quantity" inputMode="decimal" defaultValue="1" /></Field>
              <Field label="Цена за единицу"><Input name="unit_price" inputMode="decimal" /></Field>
              <div className="md:col-span-2"><Field label="Описание"><Input name="description" /></Field></div>
              <Button type="submit">Добавить расход</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>История статусов</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(order.order_status_history ?? []).map((event: any) => (
              <div key={event.id} className="rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">
                <p>{event.from_status ? orderStatusLabels[event.from_status as OrderStatus] : "Создание"} → {orderStatusLabels[event.to_status as OrderStatus]}</p>
                <p className="text-graphite/60">{formatDateTime(event.created_at)} {event.comment ? `· ${event.comment}` : ""}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Комментарии</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(order.comments ?? []).map((comment: any) => <div key={comment.id} className="rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">{comment.body}<p className="mt-1 text-xs text-graphite/55">{formatDateTime(comment.created_at)}</p></div>)}
            <form action={addCommentAction} className="space-y-3">
              <input type="hidden" name="entity_type" value="order" />
              <input type="hidden" name="entity_id" value={order.id} />
              <input type="hidden" name="order_id" value={order.id} />
              <Field label="Новый комментарий"><Textarea name="body" required /></Field>
              <Button type="submit">Добавить</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
