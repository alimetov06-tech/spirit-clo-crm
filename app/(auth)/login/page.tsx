import Link from "next/link";
import { demoSignInAction, signInAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { isDemoModeEnabled } from "@/lib/demo/mode";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";
  const allowDemo = isDemoModeEnabled();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-graphite/55">SPIRIT.CLO</p>
          <CardTitle>Вход во внутреннюю CRM</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p> : null}
          {params.message ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{params.message}</p> : null}
          <form action={signInAction} className="space-y-4">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Пароль">
              <Input name="password" type="password" autoComplete="current-password" required minLength={6} />
            </Field>
            <Button type="submit" className="w-full">Войти</Button>
          </form>
          {allowDemo ? (
            <form action={demoSignInAction} className="mt-3">
              <Button type="submit" variant="secondary" className="w-full">Войти в демо-режим</Button>
            </form>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-graphite/70">
            <Link href="/reset-password" className="hover:text-ink">Восстановить пароль</Link>
            {allowSignup ? <Link href="/signup" className="hover:text-ink">Зарегистрироваться</Link> : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
