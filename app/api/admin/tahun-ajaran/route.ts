import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { withDb } from "@/lib/server-db";

/** Tutup tahun ajaran: arsipkan + nonaktifkan semua siswanya, siapkan tahun berikutnya. */
export async function POST(req: Request) {
  const { user, status } = await requireAdmin();
  if (status !== 200 || !user)
    return NextResponse.json({ error: "Forbidden" }, { status });
  const guruId = user.id;

  const { tahunId } = await req.json();
  if (!tahunId) return NextResponse.json({ error: "tahunId wajib" }, { status: 400 });

  try {
    const result = await withDb(async (db) => {
      const { rows } = await db.query(
        "select nama, status from public.tahun_ajaran where id=$1::uuid and guru_id=$2::uuid",
        [tahunId, guruId]
      );
      if (!rows[0]) throw new Error("Tahun ajaran tidak ditemukan di akun Anda");
      if (rows[0].status !== "aktif") throw new Error("Tahun ajaran ini sudah diarsipkan");

      await db.query(
        `update public.tahun_ajaran
           set status='diarsipkan', diarsipkan_pada=now()
         where id=$1::uuid and guru_id=$2::uuid`,
        [tahunId, guruId]
      );
      const upd = await db.query(
        `update public.profiles set aktif=false
         where role='siswa' and tahun_ajaran_id=$1::uuid and guru_id=$2::uuid`,
        [tahunId, guruId]
      );

      // siapkan tahun ajaran berikutnya bila guru ini tak punya tahun aktif
      const { rowCount: adaAktif } = await db.query(
        "select 1 from public.tahun_ajaran where status='aktif' and guru_id=$1::uuid limit 1",
        [guruId]
      );
      let tahunBaru: string | null = null;
      if (!adaAktif) {
        const m = String(rows[0].nama).match(/^(\d{4})\/(\d{4})$/);
        tahunBaru = m ? `${m[2]}/${Number(m[2]) + 1}` : null;
        if (tahunBaru)
          await db.query(
            `insert into public.tahun_ajaran (nama, guru_id) values ($1, $2::uuid)
             on conflict (guru_id, nama) do nothing`,
            [tahunBaru, guruId]
          );
      }
      return { siswaDinonaktifkan: upd.rowCount, tahunBaru };
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DB error" },
      { status: 500 }
    );
  }
}

/** Hapus permanen tahun ajaran arsip + seluruh akun & data siswanya. */
export async function DELETE(req: Request) {
  const { user, status } = await requireAdmin();
  if (status !== 200 || !user)
    return NextResponse.json({ error: "Forbidden" }, { status });
  const guruId = user.id;

  const { tahunId, namaKonfirmasi } = await req.json();
  if (!tahunId || !namaKonfirmasi)
    return NextResponse.json({ error: "tahunId & namaKonfirmasi wajib" }, { status: 400 });

  try {
    const result = await withDb(async (db) => {
      const { rows } = await db.query(
        "select nama, status from public.tahun_ajaran where id=$1::uuid and guru_id=$2::uuid",
        [tahunId, guruId]
      );
      if (!rows[0]) throw new Error("Tahun ajaran tidak ditemukan di akun Anda");
      if (rows[0].status !== "diarsipkan")
        throw new Error("Hanya tahun ajaran yang sudah diarsipkan yang bisa dihapus");
      if (rows[0].nama !== String(namaKonfirmasi).trim())
        throw new Error("Nama tahun ajaran tidak cocok — penghapusan dibatalkan");

      // hapus akun auth siswa tahun itu → profiles/progress/essay ikut terhapus (cascade)
      const del = await db.query(
        `delete from auth.users
         where id in (
           select id from public.profiles
           where role='siswa' and tahun_ajaran_id=$1::uuid and guru_id=$2::uuid
         )`,
        [tahunId, guruId]
      );
      await db.query(
        "delete from public.tahun_ajaran where id=$1::uuid and guru_id=$2::uuid",
        [tahunId, guruId]
      );
      return { akunDihapus: del.rowCount };
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DB error" },
      { status: 500 }
    );
  }
}
