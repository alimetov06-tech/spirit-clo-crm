import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const term = q.trim();
  const [clients, orders, events] = term
    ? await Promise.all([
        supabase.from("clients").select("id, name, phone").eq("organization_id", workspace.organizationId).or(`name.ilike.%${term}%,phone.ilike.%${term}%`).limit(10),
        supabase.from("orders").select("id, order_number, status").eq("organization_id", workspace.organizationId).or(`order_number.ilike.%${term}%,status.ilike.%${term}%`).limit(10),
        supabase.from("appointments").select("id, title, start_at").eq("organization_id", workspace.organizationId).ilike("title", `%${term}%`).limit(10)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  return (
    <>
      <PageHeader title="Поиск" description={term ? `Результаты по запросу «${term}»` : "Введите запрос в верхней панели."} />
      <div className="grid gap-5 xl:grid-cols-3">
        <Card><CardHeader><CardTitle>Клиенты</CardTitle></CardHeader><CardContent className="space-y-2">{clients.data?.map((item) => <Link key={item.id} href={`/clients/${item.id}`} className="block rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">{item.name}<br /><span className="text-graphite/60">{item.phone}</span></Link>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Заказы</CardTitle></CardHeader><CardContent className="space-y-2">{orders.data?.map((item) => <Link key={item.id} href={`/orders/${item.id}`} className="block rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">{item.order_number}<br /><span className="text-graphite/60">{item.status}</span></Link>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>События</CardTitle></CardHeader><CardContent className="space-y-2">{events.data?.map((item) => <div key={item.id} className="rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">{item.title}</div>)}</CardContent></Card>
      </div>
    </>
  );
}
