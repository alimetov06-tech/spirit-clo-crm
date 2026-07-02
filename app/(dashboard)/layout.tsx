import { AppShell } from "@/components/app-shell";
import { getMaybeWorkspace } from "@/lib/auth/workspace";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const workspace = (await getMaybeWorkspace()) ?? {
    userId: "guest",
    email: null,
    organizationId: "guest",
    organizationName: "SPIRIT.CLO",
    role: "owner" as const
  };

  return <AppShell workspace={workspace}>{children}</AppShell>;
}
