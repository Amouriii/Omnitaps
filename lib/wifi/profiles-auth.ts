/**
 * Admin authorization via public.profiles (nav domain source of truth).
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileRole = "super_admin" | "enterprise_admin" | "standard_user";

export interface ProfileMembership {
  enterpriseId: string;
  role: ProfileRole;
}

export async function loadProfileMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ membership: ProfileMembership | null; error?: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("enterprise_id, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { membership: null, error: error.message };
  if (!data) return { membership: null };

  return {
    membership: {
      enterpriseId: String((data as { enterprise_id: string }).enterprise_id),
      role: String((data as { role: string }).role) as ProfileRole,
    },
  };
}

export function canAccessEnterprise(
  membership: ProfileMembership,
  enterpriseId: string,
): boolean {
  if (membership.role === "super_admin") return true;
  return membership.enterpriseId === enterpriseId;
}

export function canWriteWifiSettings(membership: ProfileMembership): boolean {
  return membership.role === "super_admin" || membership.role === "enterprise_admin";
}

export async function requireProfileForEnterprise(
  supabase: SupabaseClient,
  user: User,
  enterpriseId: string,
  requireAdmin: boolean,
): Promise<
  | { ok: true; membership: ProfileMembership }
  | { ok: false; status: number; error: string; code: string; details?: string }
> {
  const loaded = await loadProfileMembership(supabase, user.id);
  if (loaded.error) {
    return {
      ok: false,
      status: 500,
      error: "Failed to load profile.",
      code: "db_error",
      details: loaded.error,
    };
  }
  if (!loaded.membership) {
    return {
      ok: false,
      status: 403,
      error: "No enterprise profile for this user.",
      code: "forbidden",
    };
  }
  if (!canAccessEnterprise(loaded.membership, enterpriseId)) {
    return {
      ok: false,
      status: 403,
      error: "Not a member of this enterprise.",
      code: "forbidden",
    };
  }
  if (requireAdmin && !canWriteWifiSettings(loaded.membership)) {
    return {
      ok: false,
      status: 403,
      error: "enterprise_admin or super_admin role required.",
      code: "forbidden",
    };
  }
  return { ok: true, membership: loaded.membership };
}
