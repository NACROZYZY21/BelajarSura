import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withDb } from "@/lib/server-db";

/** Siswa (atau admin) mengganti password sendiri: verifikasi password lama dulu. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { oldPassword, newPassword } = await req.json();
  if (!oldPassword || !newPassword || String(newPassword).length < 6)
    return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });

  // verifikasi password lama lewat GoTrue (percobaan login)
  const verify = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user.email, password: String(oldPassword) }),
    }
  );
  if (!verify.ok)
    return NextResponse.json({ error: "Password lama salah" }, { status: 400 });

  try {
    await withDb((db) =>
      db.query(
        `update auth.users
           set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
               updated_at = now()
         where id = $2::uuid`,
        [String(newPassword), user.id]
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DB error" },
      { status: 500 }
    );
  }
}
