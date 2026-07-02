import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { StatCard } from "@/components/stat-card";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { directCostTotal, finalOrderTotal, paidTotal, periodProfit } from "@/lib/calculations/finance";
import { formatRubles } from "@/lib/formatters";
import { inPeriod, resolvePeriod, type PeriodParams, type ResolvedPeriod } from "@/lib/periods";
import { demoClients, demoGeneralExpenses, demoOrders } from "@/lib/demo/data";
import { SummaryCharts } from "@/features/summary/summary-charts";

export default async function SummaryPage({ searchParams }: { searchParams: Promise<PeriodParams> }) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  if (workspace.isDemo) {
    return <SummaryView period={period} orders={demoOrders} clients={demoClients} generalExpenses={demoGeneralExpenses} />;
  }

  const [{ data: ordersData }, { data: clientsData }, { data: generalExpensesData }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, order_date, delivered_at, discount_amount, order_items(title, quantity, unit_price, garment_types(name)), payments(amount, payment_type, payment_date, voided_at), order_expenses(amount, category, expense_date, deleted_at)")
      .eq("organization_id", workspace.organizationId)
      .is("archived_at", null),
    supabase
      .from("clients")
      .select("id, created_at")
      .eq("organization_id", workspace.organizationId)
      .is("archived_at", null),
    supabase
      .from("general_expenses")
      .select("amount, category, expense_date, deleted_at")
      .eq("organization_id", workspace.organizationId)
      .is("deleted_at", null)
  ]);

  return <SummaryView period={period} orders={ordersData ?? []} clients={clientsData ?? []} generalExpenses={generalExpensesData ?? []} />;
}

function SummaryView({
  period,
  orders,
  clients,
  generalExpenses
}: {
  period: ResolvedPeriod;
  orders: any[];
  clients: any[];
  generalExpenses: any[];
}) {
  const ordersInPeriod = orders.filter((order) => inPeriod(order.order_date, period));
  const clientsInPeriod = clients.filter((client) => inPeriod(client.created_at, period));
  const deliveredOrders = orders.filter((order) => order.status === "delivered" && inPeriod(order.delivered_at, period));
  const paymentsInPeriod = orders.flatMap((order) => order.payments ?? []).filter((payment) => inPeriod(payment.payment_date, period));
  const orderExpensesInPeriod = orders
    .flatMap((order) => order.order_expenses ?? [])
    .filter((expense) => !expense.deleted_at && inPeriod(expense.expense_date, period));
  const generalExpensesInPeriod = generalExpenses.filter((expense) => !expense.deleted_at && inPeriod(expense.expense_date, period));

  const income = paidTotal(paymentsInPeriod.map((payment) => ({ amount: Number(payment.amount), type: payment.payment_type, voided: Boolean(payment.voided_at) })));
  const direct = directCostTotal(orderExpensesInPeriod.map((expense) => ({ amount: Number(expense.amount), deleted: Boolean(expense.deleted_at) })));
  const general = directCostTotal(generalExpensesInPeriod.map((expense) => ({ amount: Number(expense.amount), deleted: Boolean(expense.deleted_at) })));
  const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const deliveredItems = deliveredOrders.flatMap((order) => order.order_items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);

  const cashflow = buildCashflow(orders, generalExpensesInPeriod, period);
  const expenseCategories = groupAmounts([...orderExpensesInPeriod, ...generalExpensesInPeriod], "category");
  const garmentTypes = groupGarments(ordersInPeriod);
  const clientDynamics = buildClientDynamics(clientsInPeriod, ordersInPeriod);

  return (
    <>
      <PageHeader
        title="Сводка"
        description={`Графики и ключевые показатели за период: ${period.label}. Доходы считаются по платежам, выручка — по выданным заказам.`}
      />
      <PeriodFilter period={period} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Заказы за период" value={ordersInPeriod.length} hint="По дате заказа." />
        <StatCard label="Новые клиенты" value={clientsInPeriod.length} hint="По дате создания клиента." />
        <StatCard label="Полученные платежи" value={formatRubles(income)} />
        <StatCard label="Выручка выданных" value={formatRubles(deliveredRevenue)} />
        <StatCard label="Прямые расходы" value={formatRubles(direct)} />
        <StatCard label="Общие расходы" value={formatRubles(general)} />
        <StatCard label="Расчётная прибыль" value={formatRubles(periodProfit(deliveredRevenue, direct, general))} />
        <StatCard label="Выдано изделий" value={deliveredItems} />
      </div>
      <SummaryCharts
        cashflow={cashflow}
        expenseCategories={expenseCategories}
        garmentTypes={garmentTypes}
        clientDynamics={clientDynamics}
      />
    </>
  );
}

function getOrderTotal(order: any) {
  return finalOrderTotal(
    (order.order_items ?? []).map((item: any) => ({ quantity: Number(item.quantity), unitPrice: Number(item.unit_price) })),
    Number(order.discount_amount ?? 0)
  );
}

function monthLabel(value: string) {
  return format(parseISO(value.slice(0, 10)), "MM.yyyy");
}

function buildCashflow(orders: any[], generalExpenses: any[], period: ResolvedPeriod) {
  const buckets = new Map<string, { label: string; income: number; expenses: number; profit: number }>();
  const ensure = (date: string) => {
    const label = monthLabel(date);
    if (!buckets.has(label)) buckets.set(label, { label, income: 0, expenses: 0, profit: 0 });
    return buckets.get(label)!;
  };

  for (const order of orders) {
    for (const payment of order.payments ?? []) {
      if (inPeriod(payment.payment_date, period) && !payment.voided_at) {
        const bucket = ensure(payment.payment_date);
        bucket.income += payment.payment_type === "refund" ? -Number(payment.amount) : Number(payment.amount);
      }
    }
    for (const expense of order.order_expenses ?? []) {
      if (inPeriod(expense.expense_date, period) && !expense.deleted_at) {
        ensure(expense.expense_date).expenses += Number(expense.amount);
      }
    }
  }

  for (const expense of generalExpenses) {
    if (inPeriod(expense.expense_date, period) && !expense.deleted_at) {
      ensure(expense.expense_date).expenses += Number(expense.amount);
    }
  }

  const rows = [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label));
  return rows.map((row) => ({ ...row, profit: row.income - row.expenses }));
}

function groupAmounts(rows: any[], key: string) {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    grouped.set(row[key] ?? "прочее", (grouped.get(row[key] ?? "прочее") ?? 0) + Number(row.amount ?? 0));
  }
  return [...grouped.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function groupGarments(orders: any[]) {
  const grouped = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      const name = item.garment_types?.name ?? item.title ?? "другое";
      grouped.set(name, (grouped.get(name) ?? 0) + Number(item.quantity ?? 0));
    }
  }
  return [...grouped.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
}

function buildClientDynamics(clients: any[], orders: any[]) {
  const grouped = new Map<string, { label: string; clients: number; orders: number }>();
  const ensure = (date: string) => {
    const label = monthLabel(date);
    if (!grouped.has(label)) grouped.set(label, { label, clients: 0, orders: 0 });
    return grouped.get(label)!;
  };
  for (const client of clients) ensure(client.created_at).clients += 1;
  for (const order of orders) ensure(order.order_date).orders += 1;
  return [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label));
}
