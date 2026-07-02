import { AppShell } from "@/components/app-shell";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let workspace;

  try {
    workspace = await getCurrentWorkspace();
  } catch (error) {
    const nextError = error as { digest?: string; message?: string };
    if (nextError.digest === "DYNAMIC_SERVER_USAGE" || nextError.message?.includes("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("Dashboard layout failed", error);
    redirect(`/login?error=${encodeURIComponent("Не удалось загрузить CRM. Войдите ещё раз.")}`);
  }

  return <AppShell workspace={workspace}>{children}</AppShell>;
}
