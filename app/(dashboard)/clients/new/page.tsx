import { createClientAction } from "@/features/clients/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <PageHeader title="Новый клиент" description="Контактные данные, источник и заметки владельцев." backHref="/clients" />
      {params.error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p> : null}
      <Card>
        <CardContent>
          <form action={createClientAction} className="grid gap-5 md:grid-cols-2">
            <Field label="Имя или ФИО"><Input name="name" required /></Field>
            <Field label="Телефон"><Input name="phone" placeholder="+7..." /></Field>
            <Field label="Telegram"><Input name="telegram" placeholder="@username" /></Field>
            <Field label="WhatsApp"><Input name="whatsapp" placeholder="+7..." /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="Дата рождения"><Input name="birth_date" type="date" /></Field>
            <Field label="Источник">
              <Select name="source" defaultValue="Instagram">
                {["Instagram", "Telegram", "рекомендация", "постоянный клиент", "другое"].map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Адрес"><Input name="address" /></Field>
            <div className="md:col-span-2">
              <Field label="Заметки"><Textarea name="notes" /></Field>
            </div>
            <div className="md:col-span-2"><Button type="submit">Сохранить клиента</Button></div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
