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

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) redirect("/onboarding");

  const organization = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;

  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId: data.organization_id,
    organizationName: organization?.name ?? "SPIRIT.CLO",
    role: data.role as CurrentWorkspace["role"]
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

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const organization = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;

  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId: data.organization_id,
    organizationName: organization?.name ?? "SPIRIT.CLO",
    role: data.role as CurrentWorkspace["role"]
  };
}
