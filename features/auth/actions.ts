"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getString } from "@/lib/validation/common";
import { isDemoModeEnabled } from "@/lib/demo/mode";

const authSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов")
});

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Email уже зарегистрирован, но ещё не подтверждён. Подтвердите пользователя в Supabase: Authentication → Users, затем войдите снова.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Неверный email или пароль. Если пароль не помните, нажмите «Восстановить пароль».";
  }

  if (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("user already")) {
    return "Пользователь уже существует. Перейдите на вход. Если войти не получается, подтвердите email в Supabase или восстановите пароль.";
  }

  if (normalized.includes("redirect") || normalized.includes("url")) {
    return "Supabase не разрешает ссылку для возврата. В Supabase откройте Authentication → URL Configuration и добавьте http://localhost:3000.";
  }

  if (normalized.includes("rate limit") || normalized.includes("security purposes")) {
    return "Слишком много попыток подряд. Подождите пару минут и попробуйте снова.";
  }

  return message || "Ошибка авторизации";
}

function getDatabaseErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate key") || normalized.includes("unique constraint")) {
    return "Такая запись уже есть в базе. Попробуйте ещё раз: сайт создаст новое рабочее пространство с другим внутренним адресом.";
  }

  if (normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return "База запретила запись правилами доступа. Нужно обновить SQL-политику или повторить создание после входа.";
  }

  return message || "Не удалось сохранить данные в базе";
}

async function createOwnedWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
  fullName: string,
  organizationName: string
): Promise<{ ok: true; organizationId: string } | { ok: false; message: string }> {
  const organizationId = randomUUID();
  const organizationSlug = `spirit-clo-${organizationId.slice(0, 8)}`;

  const { error: organizationError } = await supabase
    .from("organizations")
    .insert({
      id: organizationId,
      name: organizationName,
      slug: organizationSlug,
      currency: "RUB",
      timezone: "Europe/Moscow"
    });

  if (organizationError) return { ok: false, message: organizationError.message };

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: fullName
  });

  if (profileError) return { ok: false, message: profileError.message };

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: user.id,
    role: "owner",
    is_active: true
  });

  if (memberError) return { ok: false, message: memberError.message };

  const { error: seedError } = await supabase.rpc("seed_organization_defaults", { target_organization_id: organizationId });
  if (seedError) return { ok: false, message: seedError.message };

  return { ok: true, organizationId };
}

export async function signInAction(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: getString(formData, "email"),
    password: getString(formData, "password")
  });

  if (!parsed.success) redirect(`/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ошибка входа")}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) redirect(`/login?error=${encodeURIComponent(getAuthErrorMessage(error.message))}`);

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) redirect(`/login?error=${encodeURIComponent("Не удалось открыть сессию после входа")}`);

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email
  });

  const { data: workspace, error: workspaceError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (workspaceError) {
    redirect(`/onboarding?error=${encodeURIComponent("Вход выполнен, но рабочее пространство не загрузилось. Создайте его ещё раз.")}`);
  }

  revalidatePath("/", "layout");
  if (!workspace) {
    const createdWorkspace = await createOwnedWorkspace(
      supabase,
      user,
      user.email ?? "Собственник",
      "SPIRIT.CLO"
    );

    if (!createdWorkspace.ok) {
      redirect(`/onboarding?error=${encodeURIComponent(getDatabaseErrorMessage(createdWorkspace.message))}`);
    }
  }
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") {
    redirect("/login?error=Регистрация отключена");
  }

  const parsed = authSchema.safeParse({
    email: getString(formData, "email"),
    password: getString(formData, "password")
  });

  if (!parsed.success) redirect(`/signup?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ошибка регистрации")}`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) redirect(`/signup?error=${encodeURIComponent(getAuthErrorMessage(error.message))}`);

  if (!data.session) {
    redirect(`/login?message=${encodeURIComponent("Аккаунт создан. Если Supabase просит подтверждение, подтвердите email в Authentication → Users и затем войдите.")}`);
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function resetPasswordAction(formData: FormData) {
  const email = z.string().email().safeParse(getString(formData, "email"));
  if (!email.success) redirect("/reset-password?error=Введите корректный email");

  const supabase = await createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo });

  if (error) redirect(`/reset-password?error=${encodeURIComponent(getAuthErrorMessage(error.message))}`);

  redirect("/login?message=Письмо для восстановления отправлено");
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("spirit_demo_session");
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function demoSignInAction() {
  if (!isDemoModeEnabled()) redirect("/login");
  const cookieStore = await cookies();
  cookieStore.set("spirit_demo_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  redirect("/dashboard");
}

export async function createWorkspaceAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = getString(formData, "full_name") || user.email || "Собственник";
  const organizationName = getString(formData, "organization_name") || "SPIRIT.CLO";
  const createdWorkspace = await createOwnedWorkspace(supabase, user, fullName, organizationName);

  if (!createdWorkspace.ok) {
    redirect(`/onboarding?error=${encodeURIComponent(getDatabaseErrorMessage(createdWorkspace.message))}`);
  }

  redirect("/dashboard");
}
