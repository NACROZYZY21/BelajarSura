import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Verifikasi session + role admin di server. Balikan user atau null. */
export async function requireAdmin() {
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
  if (profile?.role !== "admin") return { user: null, status: 403 as const };
  return { user, status: 200 as const };
}
