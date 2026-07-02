import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { demoGarmentTypes, demoMeasurementDefinitions, demoMembers } from "@/lib/demo/data";

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  if (workspace.isDemo) {
    return <SettingsView organization={{ name: "SPIRIT.CLO", currency: "RUB", timezone: "Europe/Moscow" }} garmentTypes={demoGarmentTypes} measurements={demoMeasurementDefinitions} members={demoMembers} />;
  }
  const [{ data: organization }, { data: garmentTypesData }, { data: measurementsData }, { data: membersData }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", workspace.organizationId).single(),
    supabase.from("garment_types").select("*").eq("organization_id", workspace.organizationId).order("sort_order"),
    supabase.from("measurement_definitions").select("*").eq("organization_id", workspace.organizationId).order("sort_order"),
    supabase.from("organization_members").select("role, is_active, profiles(full_name, email)").eq("organization_id", workspace.organizationId)
  ]);
  const garmentTypes = garmentTypesData ?? [];
  const measurements = measurementsData ?? [];
  const members = membersData ?? [];

  return <SettingsView organization={organization} garmentTypes={garmentTypes} measurements={measurements} members={members} />;
}

function SettingsView({ organization, garmentTypes, measurements, members }: { organization: any; garmentTypes: any[]; measurements: any[]; members: any[] }) {
  return (
    <>
      <PageHeader title="Настройки" description="Организация, виды изделий, мерки, участники и будущие каналы уведомлений." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Организация</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-graphite/75">
            <p><strong>Название:</strong> {organization?.name}</p>
            <p><strong>Валюта:</strong> {organization?.currency}</p>
            <p><strong>Часовой пояс:</strong> {organization?.timezone}</p>
            <p><strong>Логотип:</strong> текстовый SPIRIT.CLO</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Пользователи и роли</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {members.map((member: any, index) => (
              <div key={index} className="rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">
                <p className="font-medium">{member.profiles?.full_name ?? member.profiles?.email ?? "Пользователь"}</p>
                <p className="text-graphite/65">{member.role} · {member.is_active ? "активен" : "отключён"}</p>
              </div>
            ))}
            <p className="text-sm text-graphite/60">Интерфейс приглашений подготовлен архитектурно: роли owner, manager, seamstress уже есть в базе и политиках.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Виды изделий</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {garmentTypes.map((type) => <p key={type.id} className="rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">{type.name}</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Определения мерок</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {measurements.map((item) => <p key={item.id} className="rounded-lg border border-graphite/10 bg-white/60 p-3 text-sm">{item.name} · {item.unit}</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Уведомления и интеграции</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-graphite/70">
            <p>Внутренние уведомления поддерживаются таблицей notifications.</p>
            <p>Telegram включается переменными TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.</p>
            <p>WhatsApp оставлен как будущая интеграция через официальный API или провайдера.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
