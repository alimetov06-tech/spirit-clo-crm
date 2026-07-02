import { createAppointmentAction } from "@/features/calendar/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { appointmentStatusLabels, appointmentTypeLabels } from "@/types/domain";
import { formatDateTime } from "@/lib/formatters";
import { demoAppointments, demoClients, demoOrders } from "@/lib/demo/data";

export default async function CalendarPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  if (workspace.isDemo) {
    return <CalendarView events={demoAppointments} clients={demoClients} orders={demoOrders} />;
  }
  const [{ data: eventsData }, { data: clientsData }, { data: ordersData }] = await Promise.all([
    supabase.from("appointments").select("*, clients(name), orders(order_number)").eq("organization_id", workspace.organizationId).order("start_at", { ascending: true }).limit(120),
    supabase.from("clients").select("id, name").eq("organization_id", workspace.organizationId).is("archived_at", null).order("name"),
    supabase.from("orders").select("id, order_number").eq("organization_id", workspace.organizationId).is("archived_at", null).order("created_at", { ascending: false })
  ]);
  const events = eventsData ?? [];
  const clients = clientsData ?? [];
  const orders = ordersData ?? [];

  return <CalendarView events={events} clients={clients} orders={orders} />;
}

function CalendarView({ events, clients, orders }: { events: any[]; clients: any[]; orders: any[] }) {
  return (
    <>
      <PageHeader title="Календарь" description="Примерки, консультации, замеры, выдачи и внутренние события." />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Новое событие</CardTitle></CardHeader>
          <CardContent>
            <form action={createAppointmentAction} className="space-y-4">
              <Field label="Название"><Input name="title" required /></Field>
              <Field label="Тип"><Select name="appointment_type">{Object.entries(appointmentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <Field label="Начало"><Input name="start_at" type="datetime-local" required /></Field>
              <Field label="Окончание"><Input name="end_at" type="datetime-local" /></Field>
              <Field label="Клиент"><Select name="client_id"><option value="">Без клиента</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></Field>
              <Field label="Заказ"><Select name="order_id"><option value="">Без заказа</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.order_number}</option>)}</Select></Field>
              <Field label="Статус"><Select name="status">{Object.entries(appointmentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <Field label="Место"><Input name="location" /></Field>
              <Field label="Описание"><Textarea name="description" /></Field>
              <Button type="submit">Создать событие</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ближайшие события</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-lg border border-graphite/10 bg-white/60 p-3">
                <p className="font-semibold">{event.title}</p>
                <p className="text-sm text-graphite/70">{appointmentTypeLabels[event.appointment_type as keyof typeof appointmentTypeLabels]} · {formatDateTime(event.start_at)}</p>
                <p className="text-sm text-graphite/55">{(event.clients as any)?.name ?? ""} {(event.orders as any)?.order_number ?? ""}</p>
              </div>
            ))}
            {!events.length ? <p className="text-sm text-graphite/65">Событий пока нет.</p> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
