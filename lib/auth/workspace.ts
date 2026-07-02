import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { CurrentWorkspace } from "@/types/domain";
import { isDemoModeEnabled } from "@/lib/demo/mode";

export async function getCurrentWorkspace(): Promise<CurrentWorkspace> {
  const cookieStore = await cookies();
  if (isDemoModeEnabled() && cookieStore.get("spirit_demo_session")?.value === "1") {
    return {
      userId: "demo-owner",
      email: "demo@spirit.clo",
      organizationId: "demo-org",
      organizationName: "SPIRIT.CLO",
      role: "owner",
      isDemo: true
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) {
    console.error("Workspace member lookup failed", memberError);
    redirect(`/onboarding?error=${encodeURIComponent("Не удалось загрузить рабочее пространство")}`);
  }

  if (!member) redirect("/onboarding");

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", member.organization_id)
    .maybeSingle();

  if (organizationError) {
    console.error("Workspace organization lookup failed", organizationError);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId: member.organization_id,
    organizationName: organization?.name ?? "SPIRIT.CLO",
    role: member.role as CurrentWorkspace["role"]
  };
}

export async function getMaybeWorkspace() {
  const cookieStore = await cookies();
  if (isDemoModeEnabled() && cookieStore.get("spirit_demo_session")?.value === "1") {
    return {
      userId: "demo-owner",
      email: "demo@spirit.clo",
      organizationId: "demo-org",
      organizationName: "SPIRIT.CLO",
      role: "owner" as const,
      isDemo: true
    };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (memberError || !member) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", member.organization_id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId: member.organization_id,
    organizationName: organization?.name ?? "SPIRIT.CLO",
    role: member.role as CurrentWorkspace["role"]
  };
}
