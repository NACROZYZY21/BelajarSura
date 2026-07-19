import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/server-auth";
import { withDb, createAuthUser } from "@/lib/server-db";
import { provisionGuru } from "@/lib/starter-tenant";

/** POST — superadmin mendaftarkan guru baru. */
export async function POST(req: Request) {
  const { status } = await requireSuperadmin();
  if (status !== 200) return NextResponse.json({ error: "Forbidden" }, { status });

  const { nama, email, password, info_langganan, langganan_sampai } = await req.json();
  const namaT = String(nama ?? "").trim().slice(0, 80);
  const emailT = String(email ?? "").trim().toLowerCase();
  if (!namaT) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailT))
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  if (String(password ?? "").length < 6)
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });

  try {
    const result = await withDb(async (db) => {
      const { rowCount } = await db.query("select 1 from auth.users where email=$1", [emailT]);
      if (rowCount) throw new Error("Email sudah terdaftar");
      const uid = await createAuthUser(db, emailT, String(password), {
        role: "guru",
        nama: namaT,
        avatar: "🧑‍🏫",
      });
      await db.query(
        `update public.profiles
           set info_langganan=$1, langganan_sampai=$2, status_akun='aktif'
         where id=$3::uuid`,
        [String(info_langganan ?? ""), langganan_sampai || null, uid]
      );
      // bekali tenant baru: tahun ajaran aktif + 11 game + 10 badge
      await provisionGuru(db, uid);
      return { id: uid, email: emailT };
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DB error" },
      { status: 500 }
    );
  }
}

/** PATCH — superadmin me-reset password seorang GURU (berjenjang: bukan siswa). */
export async function PATCH(req: Request) {
  const { status } = await requireSuperadmin();
  if (status !== 200) return NextResponse.json({ error: "Forbidden" }, { status });

  const { guruId, newPassword } = await req.json();
  if (!guruId || String(newPassword ?? "").length < 6)
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });

  try {
    const result = await withDb(async (db) => {
      const { rowCount } = await db.query(
        "select 1 from public.profiles where id=$1::uuid and role='guru'",
        [guruId]
      );
      if (!rowCount) throw new Error("Akun guru tidak ditemukan");
      await db.query(
        `update auth.users
           set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
               updated_at = now()
         where id = $2::uuid`,
        [String(newPassword), guruId]
      );
      return { ok: true };
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("tidak ditemukan") ? 404 : 500 }
    );
  }
}

/** GET ?id=<guruId> — statistik pemakaian guru (bahan evaluasi & penagihan). */
export async function GET(req: Request) {
  const { status } = await requireSuperadmin();
  if (status !== 200) return NextResponse.json({ error: "Forbidden" }, { status });

  const guruId = new URL(req.url).searchParams.get("id");
  if (!guruId) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  try {
    const result = await withDb(async (db) => {
      const [siswa, modul, soal, login, email] = await Promise.all([
        db.query("select count(*)::int n from public.profiles where guru_id=$1::uuid and role='siswa'", [guruId]),
        db.query("select count(*)::int n from public.modules where guru_id=$1::uuid", [guruId]),
        db.query("select count(*)::int n from public.questions where guru_id=$1::uuid", [guruId]),
        db.query("select last_sign_in_at from auth.users where id=$1::uuid", [guruId]),
        db.query("select email from auth.users where id=$1::uuid", [guruId]),
      ]);
      return {
        siswa: siswa.rows[0]?.n ?? 0,
        modul: modul.rows[0]?.n ?? 0,
        soal: soal.rows[0]?.n ?? 0,
        terakhirLogin: login.rows[0]?.last_sign_in_at ?? null,
        email: email.rows[0]?.email ?? null,
      };
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DB error" },
      { status: 500 }
    );
  }
}
