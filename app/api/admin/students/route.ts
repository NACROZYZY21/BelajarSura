import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { withDb, createAuthUser } from "@/lib/server-db";

const DOMAIN = "@siswa.belajarceria.id";

interface NewStudent {
  nama: string;
  kelas: number;
  username: string;
  password: string;
}

function slugify(nama: string): string {
  return nama.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "siswa";
}

/** Admin membuat akun siswa (tunggal atau massal). */
export async function POST(req: Request) {
  const { status } = await requireAdmin();
  if (status !== 200) return NextResponse.json({ error: "Forbidden" }, { status });

  const body = (await req.json()) as { students: Partial<NewStudent>[] };
  if (!Array.isArray(body.students) || body.students.length === 0 || body.students.length > 60)
    return NextResponse.json({ error: "students harus array 1-60 item" }, { status: 400 });

  // validasi + normalisasi
  const items: NewStudent[] = [];
  for (const s of body.students) {
    const nama = String(s.nama ?? "").trim().slice(0, 60);
    const kelas = Number(s.kelas);
    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    if (!(kelas >= 1 && kelas <= 6))
      return NextResponse.json({ error: `Kelas tidak valid untuk "${nama}"` }, { status: 400 });
    const username = (s.username ? String(s.username) : slugify(nama))
      .toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 30);
    if (username.length < 3)
      return NextResponse.json({ error: `Username terlalu pendek untuk "${nama}"` }, { status: 400 });
    const password = String(s.password ?? "").trim();
    if (password.length < 6)
      return NextResponse.json({ error: `Password minimal 6 karakter untuk "${nama}"` }, { status: 400 });
    items.push({ nama, kelas, username, password });
  }

  try {
    const results = await withDb(async (db) => {
      const { rows: tahunRows } = await db.query(
        "select id from public.tahun_ajaran where status='aktif' limit 1"
      );
      const tahunId = tahunRows[0]?.id ?? null;
      const out: { nama: string; username: string; password: string; ok: boolean; pesan?: string }[] = [];

      for (const s of items) {
        // username unik — bila bentrok, tambahkan angka
        let username = s.username;
        for (let n = 0; n < 50; n++) {
          const candidate = n === 0 ? username : `${s.username}${n + 1}`;
          const { rowCount } = await db.query("select 1 from auth.users where email=$1", [
            candidate + DOMAIN,
          ]);
          if (rowCount === 0) {
            username = candidate;
            break;
          }
          if (n === 49) {
            out.push({ ...s, ok: false, pesan: "Username penuh, coba nama lain" });
            continue;
          }
        }
        try {
          const uid = await createAuthUser(db, username + DOMAIN, s.password, {
            role: "student",
            nama: s.nama,
            kelas: String(s.kelas),
            avatar: "🐣",
          });
          if (tahunId)
            await db.query(
              "update public.profiles set tahun_ajaran_id=$1, aktif=true where id=$2::uuid",
              [tahunId, uid]
            );
          out.push({ nama: s.nama, username, password: s.password, ok: true });
        } catch (e) {
          out.push({ ...s, ok: false, pesan: e instanceof Error ? e.message : "gagal" });
        }
      }
      return out;
    });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DB error" },
      { status: 500 }
    );
  }
}
