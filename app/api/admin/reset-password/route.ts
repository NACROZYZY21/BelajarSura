import { NextResponse } from "next/server";
import { Client } from "pg";
import { createClient } from "@/lib/supabase/server";

/** Reset password siswa — hanya admin. Memakai koneksi Postgres langsung
 *  (DATABASE_URL) karena service role key tidak tersedia. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "guru")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, newPassword } = await req.json();
  if (!studentId || !newPassword || String(newPassword).length < 6)
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });

  // tenant: guru hanya boleh reset password siswanya sendiri
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", studentId)
    .eq("guru_id", user.id)
    .eq("role", "siswa")
    .maybeSingle();
  if (!target)
    return NextResponse.json({ error: "Siswa bukan milik akun Anda" }, { status: 403 });

  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await db.connect();
    const r = await db.query(
      `update auth.users
         set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
             updated_at = now()
       where id = $2`,
      [String(newPassword), String(studentId)]
    );
    if (r.rowCount === 0)
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await db.end().catch(() => {});
  }
}
