import { createWorkspaceAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-graphite/55">Первичная настройка</p>
          <CardTitle>Рабочее пространство SPIRIT.CLO</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p> : null}
          <form action={createWorkspaceAction} className="space-y-4">
            <Field label="Ваше имя">
              <Input name="full_name" placeholder="Например, Анна" required />
            </Field>
            <Field label="Название организации" hint="По умолчанию будет создано рабочее пространство с рублями и часовым поясом Europe/Moscow.">
              <Input name="organization_name" defaultValue="SPIRIT.CLO" required />
            </Field>
            <Button type="submit" className="w-full">Создать организацию</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
