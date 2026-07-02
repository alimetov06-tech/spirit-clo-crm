import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { finalOrderTotal, paidTotal } from "@/lib/calculations/finance";
import { formatDate, formatRubles } from "@/lib/formatters";
import { orderStatusLabels, type OrderStatus } from "@/types/domain";
import { demoOrders } from "@/lib/demo/data";
import { PeriodFilter } from "@/components/period-filter";
import { inPeriod, resolvePeriod, type PeriodParams } from "@/lib/periods";

type OrdersSearchParams = PeriodParams & { q?: string; status?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrdersSearchParams> }) {
  const workspace = await getCurrentWorkspace();
  const params = await searchParams;
  const period = resolvePeriod(params);
  const supabase = await createClient();

  if (workspace.isDemo) {
    const filtered = demoOrders
      .filter((order) => inPeriod(order.order_date, period))
      .filter((order) => !params.status || order.status === params.status)
      .filter((order) => !params.q || order.order_number.toLowerCase().includes(params.q.toLowerCase()));
    return <OrdersList orders={filtered} params={params} period={period} />;
  }

  let request = supabase
    .from("orders")
    .select("id, order_number, status, order_date, due_date, discount_amount, clients(name), order_items(title, quantity, unit_price, garment_types(name)), payments(amount, payment_type, voided_at), appointments(start_at, status)")
    .eq("organization_id", workspace.organizationId)
    .is("archived_at", null)
    .gte("order_date", period.start)
    .lte("order_date", period.end)
    .order("created_at", { ascending: false })
    .limit(80);

  if (params.status) request = request.eq("status", params.status);
  if (params.q) request = request.ilike("order_number", `%${params.q}%`);

  const { data: ordersData } = await request;
  const orders = ordersData ?? [];

  return <OrdersList orders={orders} params={params} period={period} />;
}

function OrdersList({ orders, params, period }: { orders: any[]; params: OrdersSearchParams; period: ReturnType<typeof resolvePeriod> }) {
  return (
    <>
      <PageHeader
        title="Заказы"
        description="Основной производственный поток: статусы, дедлайны, оплаты, изделия и примерки."
        action={<Link href="/orders/new"><Button><Plus className="h-4 w-4" />Новый заказ</Button></Link>}
      />
      <PeriodFilter period={period} />
      <form className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input type="hidden" name="period" value={period.preset} />
        <input type="hidden" name="start" value={period.start} />
        <input type="hidden" name="end" value={period.end} />
        <div className="flex items-center rounded-lg border border-graphite/10 bg-white/70 px-3">
          <Search className="h-4 w-4 text-graphite/55" />
          <input name="q" defaultValue={params.q} placeholder="Поиск по номеру заказа" className="h-11 w-full bg-transparent px-3 text-sm outline-none" />
        </div>
        <select name="status" defaultValue={params.status ?? ""} className="h-11 rounded-lg border border-graphite/10 bg-white/70 px-3 text-sm">
          <option value="">Все статусы</option>
          {Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button type="submit" variant="secondary">Найти</Button>
      </form>
      {!orders.length ? (
        <EmptyState title="Заказов пока нет" description="Создайте первый заказ: выберите клиента, изделия, мерки, предоплату и дату примерки." actionHref="/orders/new" actionLabel="Создать заказ" />
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => {
            const items = (order.order_items ?? []).map((item: any) => ({ quantity: Number(item.quantity), unitPrice: Number(item.unit_price) }));
            const total = finalOrderTotal(items, Number(order.discount_amount ?? 0));
            const paid = paidTotal((order.payments ?? []).map((payment: any) => ({ amount: Number(payment.amount), type: payment.payment_type, voided: Boolean(payment.voided_at) })));
            const nextAppointment = (order.appointments ?? []).filter((item: any) => item.status !== "cancelled").map((item: any) => item.start_at).sort()[0];
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="grid gap-3 p-4 transition hover:bg-white lg:grid-cols-[1fr_1.2fr_0.9fr_0.9fr_0.8fr] lg:items-center">
                  <div>
                    <p className="font-semibold text-ink">{order.order_number}</p>
                    <p className="text-sm text-graphite/65">{(order.clients as any)?.name ?? "Клиент"}</p>
                  </div>
                  <p className="text-sm text-graphite/70">{(order.order_items ?? []).map((item: any) => item.title || item.garment_types?.name).join(", ") || "Изделия не указаны"}</p>
                  <StatusBadge status={order.status as OrderStatus} />
                  <div className="text-sm text-graphite/70">
                    <p>Дедлайн: {formatDate(order.due_date)}</p>
                    <p>Примерка: {formatDate(nextAppointment)}</p>
                  </div>
                  <div className="text-sm text-graphite/70">
                    <p>{formatRubles(total)}</p>
                    <p>Остаток: {formatRubles(Math.max(0, total - paid))}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
