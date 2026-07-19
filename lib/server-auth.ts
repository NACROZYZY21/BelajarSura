import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Verifikasi session + role GURU aktif di server (tenant owner). */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status_akun")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "guru" || profile.status_akun !== "aktif")
    return { user: null, status: 403 as const };
  return { user, status: 200 as const };
}

/** Verifikasi session + role SUPERADMIN di server. */
export async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "superadmin") return { user: null, status: 403 as const };
  return { user, status: 200 as const };
}
