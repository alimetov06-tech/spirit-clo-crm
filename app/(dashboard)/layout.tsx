import { AppShell } from "@/components/app-shell";
import { getCurrentWorkspace } from "@/lib/auth/workspace";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const workspace = await getCurrentWorkspace();
  return <AppShell workspace={workspace}>{children}</AppShell>;
}
