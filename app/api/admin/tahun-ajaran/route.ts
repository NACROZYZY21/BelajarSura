import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { withDb } from "@/lib/server-db";

/** Tutup tahun ajaran: arsipkan + nonaktifkan semua siswanya, siapkan tahun berikutnya. */
export async function POST(req: Request) {
  const { status } = await requireAdmin();
  if (status !== 200) return NextResponse.json({ error: "Forbidden" }, { status });

  const { tahunId } = await req.json();
  if (!tahunId) return NextResponse.json({ error: "tahunId wajib" }, { status: 400 });

  try {
    const result = await withDb(async (db) => {
      const { rows } = await db.query(
        "select nama, status from public.tahun_ajaran where id=$1::uuid",
        [tahunId]
      );
      if (!rows[0]) throw new Error("Tahun ajaran tidak ditemukan");
      if (rows[0].status !== "aktif") throw new Error("Tahun ajaran ini sudah diarsipkan");

      await db.query(
        `update public.tahun_ajaran
           set status='diarsipkan', diarsipkan_pada=now() where id=$1::uuid`,
        [tahunId]
      );
      const upd = await db.query(
        `update public.profiles set aktif=false
         where role='student' and tahun_ajaran_id=$1::uuid`,
        [tahunId]
      );

      // siapkan tahun ajaran berikutnya bila tidak ada yang aktif
      const { rowCount: adaAktif } = await db.query(
        "select 1 from public.tahun_ajaran where status='aktif' limit 1"
      );
      let tahunBaru: string | null = null;
      if (!adaAktif) {
        const m = String(rows[0].nama).match(/^(\d{4})\/(\d{4})$/);
        tahunBaru = m ? `${m[2]}/${Number(m[2]) + 1}` : null;
        if (tahunBaru)
          await db.query(
            "insert into public.tahun_ajaran (nama) values ($1) on conflict (nama) do nothing",
            [tahunBaru]
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
  const { status } = await requireAdmin();
  if (status !== 200) return NextResponse.json({ error: "Forbidden" }, { status });

  const { tahunId, namaKonfirmasi } = await req.json();
  if (!tahunId || !namaKonfirmasi)
    return NextResponse.json({ error: "tahunId & namaKonfirmasi wajib" }, { status: 400 });

  try {
    const result = await withDb(async (db) => {
      const { rows } = await db.query(
        "select nama, status from public.tahun_ajaran where id=$1::uuid",
        [tahunId]
      );
      if (!rows[0]) throw new Error("Tahun ajaran tidak ditemukan");
      if (rows[0].status !== "diarsipkan")
        throw new Error("Hanya tahun ajaran yang sudah diarsipkan yang bisa dihapus");
      if (rows[0].nama !== String(namaKonfirmasi).trim())
        throw new Error("Nama tahun ajaran tidak cocok — penghapusan dibatalkan");

      // hapus akun auth siswa tahun itu → profiles/progress/essay ikut terhapus (cascade)
      const del = await db.query(
        `delete from auth.users
         where id in (
           select id from public.profiles
           where role='student' and tahun_ajaran_id=$1::uuid
         )`,
        [tahunId]
      );
      await db.query("delete from public.tahun_ajaran where id=$1::uuid", [tahunId]);
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
