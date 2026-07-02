import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") redirect("/login");
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-graphite/55">SPIRIT.CLO</p>
          <CardTitle>Создать доступ собственника</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p> : null}
          <form action={signUpAction} className="space-y-4">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Пароль">
              <Input name="password" type="password" autoComplete="new-password" required minLength={6} />
            </Field>
            <Button type="submit" className="w-full">Зарегистрироваться</Button>
          </form>
          <Link href="/login" className="mt-5 block text-sm text-graphite/70 hover:text-ink">Уже есть аккаунт</Link>
        </CardContent>
      </Card>
    </main>
  );
}
