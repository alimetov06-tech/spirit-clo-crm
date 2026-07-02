import Link from "next/link";
import { addDays, isBefore, parseISO } from "date-fns";
import { CalendarPlus, CircleDollarSign, Plus, ReceiptText, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { finalOrderTotal, paidTotal, directCostTotal, periodProfit } from "@/lib/calculations/finance";
import { formatDate, formatRubles } from "@/lib/formatters";
import type { OrderStatus } from "@/types/domain";
import { demoAppointments, demoGeneralExpenses, demoOrders } from "@/lib/demo/data";
import { PeriodFilter } from "@/components/period-filter";
import { inPeriod, resolvePeriod, type PeriodParams } from "@/lib/periods";

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toMoney(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<PeriodParams> }) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const [{ data: ordersData }, { data: appointmentsData }, { data: paymentsData }, { data: orderExpensesData }, { data: generalExpensesData }] =
    workspace.isDemo ? [{ data: demoOrders }, { data: demoAppointments }, { data: demoOrders.flatMap((order) => order.payments) }, { data: demoOrders.flatMap((order) => order.order_expenses) }, { data: demoGeneralExpenses }] : await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, status, order_date, due_date, delivered_at, discount_amount, clients(name), order_items(quantity, unit_price), payments(amount, payment_type, voided_at)")
        .eq("organization_id", workspace.organizationId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("appointments")
        .select("id, title, start_at, status, clients(name), orders(order_number)")
        .eq("organization_id", workspace.organizationId)
        .gte("start_at", new Date().toISOString())
        .lte("start_at", addDays(new Date(), 7).toISOString())
        .order("start_at", { ascending: true })
        .limit(8),
      supabase
        .from("payments")
        .select("id, amount, payment_type, payment_date, voided_at, orders(order_number), clients(name)")
        .eq("organization_id", workspace.organizationId)
        .gte("payment_date", period.start)
        .lte("payment_date", period.end)
        .is("voided_at", null)
        .order("payment_date", { ascending: false })
        .limit(8),
      supabase.from("order_expenses").select("amount, expense_date, deleted_at").eq("organization_id", workspace.organizationId).gte("expense_date", period.start).lte("expense_date", period.end).is("deleted_at", null),
      supabase.from("general_expenses").select("amount, expense_date, deleted_at").eq("organization_id", workspace.organizationId).gte("expense_date", period.start).lte("expense_date", period.end).is("deleted_at", null)
    ]);
  const orders = ordersData ?? [];
  const appointments = appointmentsData ?? [];
  const payments = paymentsData ?? [];
  const orderExpenses = orderExpensesData ?? [];
  const generalExpenses = generalExpensesData ?? [];

  const normalizedOrders = orders.map((order) => {
    const items = asArray(order.order_items).map((item: { quantity?: number | string | null; unit_price?: number | string | null }) => ({
      quantity: toMoney(item.quantity),
      unitPrice: toMoney(item.unit_price)
    }));
    const total = finalOrderTotal(items, toMoney(order.discount_amount));
    const paid = paidTotal(
      asArray(order.payments).map((payment: { amount?: number | string | null; payment_type?: string | null; voided_at?: string | null }) => ({
        amount: toMoney(payment.amount),
        type: payment.payment_type as "prepayment",
        voided: Boolean(payment.voided_at)
      }))
    );
    return { ...order, total, paid };
  });

  const activeOrders = normalizedOrders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const ordersInPeriod = normalizedOrders.filter((order) => inPeriod(order.order_date, period));
  const overdueOrders = activeOrders.filter((order) => order.due_date && isBefore(parseISO(order.due_date), new Date()));
  const paidThisPeriod = paidTotal(
    payments.filter((payment) => inPeriod(payment.payment_date, period)).map((payment) => ({
      amount: toMoney(payment.amount),
      type: payment.payment_type as "prepayment",
      voided: Boolean(payment.voided_at)
    }))
  );
  const deliveredRevenue = normalizedOrders
    .filter((order) => order.status === "delivered" && inPeriod(order.delivered_at, period))
    .reduce((sum, order) => sum + order.total, 0);
  const directCosts = directCostTotal(orderExpenses.filter((expense: any) => inPeriod(expense.expense_date, period)).map((expense) => ({ amount: toMoney(expense.amount), deleted: Boolean(expense.deleted_at) })));
  const generalCost = directCostTotal(generalExpenses.filter((expense: any) => inPeriod(expense.expense_date, period)).map((expense: any) => ({ amount: toMoney(expense.amount), deleted: Boolean(expense.deleted_at) })));
  const debt = normalizedOrders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Math.max(0, order.total - order.paid), 0);

  return (
    <>
      <PageHeader
        title="Главная"
        description={`Операционная картина ателье за период: ${period.label}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/orders/new"><Button><Plus className="h-4 w-4" />Создать заказ</Button></Link>
            <Link href="/clients/new"><Button variant="secondary"><UserPlus className="h-4 w-4" />Клиент</Button></Link>
          </div>
        }
      />
      <PeriodFilter period={period} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Заказы за период" value={ordersInPeriod.length} hint="По дате заказа." />
        <StatCard label="Активные заказы" value={activeOrders.length} hint="Все статусы кроме выданных и отменённых." />
        <StatCard label="Просроченные заказы" value={overdueOrders.length} hint="Активные заказы с дедлайном раньше сегодня." />
        <StatCard label="Оплаты за период" value={formatRubles(paidThisPeriod)} hint="Фактически внесённые платежи выбранного периода." />
        <StatCard label="Задолженность клиентов" value={formatRubles(debt)} hint="Стоимость заказов минус внесённые платежи." />
        <StatCard label="Выручка выданных" value={formatRubles(deliveredRevenue)} />
        <StatCard label="Прямые расходы" value={formatRubles(directCosts)} />
        <StatCard label="Общие расходы" value={formatRubles(generalCost)} />
        <StatCard label="Расчётная прибыль" value={formatRubles(periodProfit(deliveredRevenue, directCosts, generalCost))} hint="Выручка минус прямые и общие расходы." />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Ближайшие дедлайны</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activeOrders.slice(0, 8).map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between rounded-lg border border-graphite/10 bg-white/55 p-3">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-graphite/65">{formatDate(order.due_date)}</p>
                </div>
                <StatusBadge status={order.status as OrderStatus} />
              </Link>
            ))}
            {!activeOrders.length ? <p className="text-sm text-graphite/65">Активных заказов пока нет.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Быстрые действия</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/orders/new"><Button className="w-full justify-start"><Plus className="h-4 w-4" />Создать заказ</Button></Link>
            <Link href="/clients/new"><Button variant="secondary" className="w-full justify-start"><UserPlus className="h-4 w-4" />Добавить клиента</Button></Link>
            <Link href="/expenses"><Button variant="secondary" className="w-full justify-start"><ReceiptText className="h-4 w-4" />Добавить расход</Button></Link>
            <Link href="/calendar"><Button variant="secondary" className="w-full justify-start"><CalendarPlus className="h-4 w-4" />Назначить примерку</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ближайшие примерки</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {appointments.map((event) => (
              <div key={event.id} className="rounded-lg border border-graphite/10 bg-white/55 p-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-graphite/65">{formatDate(event.start_at)}</p>
              </div>
            ))}
            {!appointments.length ? <p className="text-sm text-graphite/65">В ближайшие 7 дней событий нет.</p> : null}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Последние платежи</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border border-graphite/10 bg-white/55 p-3">
                <div>
                  <p className="font-medium">{formatRubles(payment.payment_type === "refund" ? -payment.amount : payment.amount)}</p>
                  <p className="text-sm text-graphite/65">{formatDate(payment.payment_date)}</p>
                </div>
                <CircleDollarSign className="h-5 w-5 text-sage" />
              </div>
            ))}
            {!payments.length ? <p className="text-sm text-graphite/65">Платежей за период пока нет.</p> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
