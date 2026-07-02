import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { directCostTotal, finalOrderTotal, grossProfit, marginPercent, paidTotal, periodProfit } from "@/lib/calculations/finance";
import { formatRubles } from "@/lib/formatters";
import { demoGeneralExpenses, demoOrders } from "@/lib/demo/data";
import { PeriodFilter } from "@/components/period-filter";
import { inPeriod, resolvePeriod, type PeriodParams, type ResolvedPeriod } from "@/lib/periods";

export default async function FinancePage({ searchParams }: { searchParams: Promise<PeriodParams> }) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  if (workspace.isDemo) {
    return <FinanceView period={period} orders={demoOrders} directExpenses={demoOrders.flatMap((order) => order.order_expenses)} generalExpenses={demoGeneralExpenses} payments={demoOrders.flatMap((order) => order.payments)} />;
  }
  const [{ data: ordersData }, { data: directExpensesData }, { data: generalExpensesData }, { data: paymentsData }] = await Promise.all([
    supabase.from("orders").select("id, order_number, status, delivered_at, discount_amount, order_items(quantity, unit_price), payments(amount, payment_type, voided_at)").eq("organization_id", workspace.organizationId),
    supabase.from("order_expenses").select("amount, expense_date, deleted_at").eq("organization_id", workspace.organizationId).gte("expense_date", period.start).lte("expense_date", period.end).is("deleted_at", null),
    supabase.from("general_expenses").select("amount, expense_date, deleted_at").eq("organization_id", workspace.organizationId).gte("expense_date", period.start).lte("expense_date", period.end).is("deleted_at", null),
    supabase.from("payments").select("amount, payment_type, payment_date, voided_at").eq("organization_id", workspace.organizationId).gte("payment_date", period.start).lte("payment_date", period.end).is("voided_at", null)
  ]);
  const orders = ordersData ?? [];
  const directExpenses = directExpensesData ?? [];
  const generalExpenses = generalExpensesData ?? [];
  const payments = paymentsData ?? [];

  return <FinanceView period={period} orders={orders} directExpenses={directExpenses} generalExpenses={generalExpenses} payments={payments} />;
}

function FinanceView({ period, orders, directExpenses, generalExpenses, payments }: { period: ResolvedPeriod; orders: any[]; directExpenses: any[]; generalExpenses: any[]; payments: any[] }) {
  const orderRows = orders.map((order) => {
    const total = finalOrderTotal((order.order_items ?? []).map((item: any) => ({ quantity: Number(item.quantity), unitPrice: Number(item.unit_price) })), Number(order.discount_amount ?? 0));
    const paid = paidTotal((order.payments ?? []).map((payment: any) => ({ amount: Number(payment.amount), type: payment.payment_type, voided: Boolean(payment.voided_at) })));
    return { ...order, total, paid };
  });
  const revenue = orderRows.filter((order) => order.status === "delivered" && inPeriod(order.delivered_at, period)).reduce((sum, order) => sum + order.total, 0);
  const received = paidTotal(payments.filter((payment) => inPeriod(payment.payment_date, period)).map((payment) => ({ amount: Number(payment.amount), type: payment.payment_type as any, voided: Boolean(payment.voided_at) })));
  const direct = directCostTotal(directExpenses.filter((expense) => inPeriod(expense.expense_date, period)).map((expense) => ({ amount: Number(expense.amount), deleted: Boolean(expense.deleted_at) })));
  const general = directCostTotal(generalExpenses.filter((expense) => inPeriod(expense.expense_date, period)).map((expense) => ({ amount: Number(expense.amount), deleted: Boolean(expense.deleted_at) })));
  const profit = periodProfit(revenue, direct, general);
  const debt = orderRows.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Math.max(0, order.total - order.paid), 0);

  return (
    <>
      <PageHeader title="Финансы" description={`Управленческие показатели за период: ${period.label}. Прямые расходы заказов и общие расходы бизнеса разделены.`} />
      <PeriodFilter period={period} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Полученные платежи" value={formatRubles(received)} />
        <StatCard label="Выручка по выданным" value={formatRubles(revenue)} />
        <StatCard label="Прямые расходы" value={formatRubles(direct)} />
        <StatCard label="Общие расходы" value={formatRubles(general)} />
        <StatCard label="Валовая прибыль" value={formatRubles(grossProfit(revenue, direct))} />
        <StatCard label="Расчётная прибыль" value={formatRubles(profit)} />
        <StatCard label="Задолженность" value={formatRubles(debt)} />
        <StatCard label="Рентабельность" value={`${marginPercent(revenue, grossProfit(revenue, direct))}%`} />
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Заказы с показателями</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {orderRows.map((order) => (
            <div key={order.id} className="grid gap-2 rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm md:grid-cols-5">
              <strong>{order.order_number}</strong>
              <span>Стоимость: {formatRubles(order.total)}</span>
              <span>Оплачено: {formatRubles(order.paid)}</span>
              <span>Остаток: {formatRubles(Math.max(0, order.total - order.paid))}</span>
              <span>Статус: {order.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
