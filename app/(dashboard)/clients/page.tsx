import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRubles } from "@/lib/formatters";
import { finalOrderTotal, paidTotal } from "@/lib/calculations/finance";
import { demoClients, demoOrders } from "@/lib/demo/data";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const workspace = await getCurrentWorkspace();
  const params = await searchParams;
  const supabase = await createClient();
  const query = params.q?.trim();

  if (workspace.isDemo) {
    const clients = demoClients.map((client) => ({
      ...client,
      orders: demoOrders.filter((order) => order.client_id === client.id)
    }));
    return <ClientsList clients={clients} query={query} />;
  }

  let request = supabase
    .from("clients")
    .select("id, name, phone, telegram, whatsapp, created_at, archived_at, orders(id, order_date, discount_amount, order_items(quantity, unit_price), payments(amount, payment_type, voided_at))")
    .eq("organization_id", workspace.organizationId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (query) request = request.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);

  const { data: clientsData } = await request;
  const clients = clientsData ?? [];

  return <ClientsList clients={clients} query={query} />;
}

function ClientsList({ clients, query }: { clients: any[]; query?: string }) {
  return (
    <>
      <PageHeader
        title="Клиенты"
        description="Контакты, история заказов, платежи, задолженность и версии мерок."
        action={<Link href="/clients/new"><Button><Plus className="h-4 w-4" />Добавить клиента</Button></Link>}
      />
      <form className="mb-5 flex max-w-xl items-center rounded-lg border border-graphite/10 bg-white/70 px-3">
        <Search className="h-4 w-4 text-graphite/55" />
        <input name="q" defaultValue={query} placeholder="Поиск по имени или телефону" className="h-11 w-full bg-transparent px-3 text-sm outline-none" />
      </form>
      {!clients.length ? (
        <EmptyState title="Клиентов пока нет" description="Добавьте первого клиента, чтобы сохранять контакты, мерки, заказы и платежи." actionHref="/clients/new" actionLabel="Добавить клиента" />
      ) : (
        <div className="grid gap-3">
          {clients.map((client) => {
            const orders = client.orders ?? [];
            const total = orders.reduce((sum: number, order: any) => {
              const items = (order.order_items ?? []).map((item: any) => ({ quantity: Number(item.quantity), unitPrice: Number(item.unit_price) }));
              return sum + finalOrderTotal(items, Number(order.discount_amount ?? 0));
            }, 0);
            const paid = orders.reduce((sum: number, order: any) => {
              return sum + paidTotal((order.payments ?? []).map((payment: any) => ({ amount: Number(payment.amount), type: payment.payment_type, voided: Boolean(payment.voided_at) })));
            }, 0);
            const lastOrder = orders.map((order: any) => order.order_date).filter(Boolean).sort().at(-1);

            return (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <Card className="grid gap-3 p-4 transition hover:bg-white sm:grid-cols-[1.2fr_1fr_1fr_1fr] sm:items-center">
                  <div>
                    <p className="font-semibold text-ink">{client.name}</p>
                    {client.phone ? <p className="text-sm text-graphite/70">{client.phone}</p> : <p className="text-sm text-graphite/45">Телефон не указан</p>}
                  </div>
                  <p className="text-sm text-graphite/70">{client.telegram || client.whatsapp || "Мессенджер не указан"}</p>
                  <div className="text-sm text-graphite/70">
                    <p>{orders.length} заказ(ов)</p>
                    <p>{formatRubles(total)}</p>
                  </div>
                  <div className="text-sm text-graphite/70">
                    <p>Долг: {formatRubles(Math.max(0, total - paid))}</p>
                    <p>Последний заказ: {formatDate(lastOrder)}</p>
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
