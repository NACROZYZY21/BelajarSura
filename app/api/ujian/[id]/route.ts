import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withDb } from "@/lib/server-db";

/* eslint-disable @typescript-eslint/no-explicit-any */

// PRNG deterministik: urutan soal/opsi acak konsisten per siswa, dan bisa
// direkonstruksi server saat menilai (kunci tak pernah dikirim ke browser).
function seededRandom(seedStr: string) {
  let h = 5381;
  for (const c of seedStr) h = (h * 33) ^ c.charCodeAt(0);
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededOrder(n: number, seed: string): number[] {
  const rnd = seededRandom(seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

async function loadContext(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  // RLS siswa: hanya ujian terbit+online milik gurunya yang ia pesertanya
  const { data: exam } = await supabase.from("exams").select().eq("id", id).maybeSingle();
  if (!exam)
    return { error: NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 }) };
  return { user, exam };
}

const windowOf = (exam: any) => {
  const now = Date.now();
  if (exam.buka && now < new Date(exam.buka).getTime()) return "belum_buka";
  if (exam.tutup && now > new Date(exam.tutup).getTime()) return "tutup";
  return "buka";
};
const deadlineOf = (exam: any, attempt: any) => {
  const byDurasi = new Date(attempt.mulai).getTime() + exam.durasi_menit * 60000;
  const byTutup = exam.tutup ? new Date(exam.tutup).getTime() : Infinity;
  return Math.min(byDurasi, byTutup);
};

async function fetchQuestions(examId: string) {
  return withDb(async (db) => {
    const { rows } = await db.query(
      `select eq.id, coalesce(eq.tipe, q.tipe) as tipe,
              coalesce(eq.pertanyaan_id, q.pertanyaan_id) as pertanyaan_id,
              coalesce(eq.pertanyaan_en, q.pertanyaan_en) as pertanyaan_en,
              coalesce(eq.opsi, q.opsi) as opsi,
              coalesce(eq.gambar_url, q.gambar_url) as gambar_url,
              coalesce(eq.jawaban_benar, q.jawaban_benar) as kunci,
              eq.poin, eq.urutan
       from public.exam_questions eq
       left join public.questions q on q.id = eq.question_id
       where eq.exam_id = $1
       order by eq.urutan`,
      [examId]
    );
    return rows;
  });
}

/** Susun tampilan soal utk siswa: acak sesuai seed attempt, TANPA kunci. */
function viewQuestions(rows: any[], exam: any, attemptId: string) {
  let ordered = rows;
  if (exam.acak_soal) {
    const order = seededOrder(rows.length, attemptId + ":soal");
    ordered = order.map((i) => rows[i]);
  }
  return ordered.map((r) => {
    let opsi = r.opsi;
    if (r.tipe === "pg" && exam.acak_opsi && opsi?.id) {
      const perm = seededOrder(opsi.id.length, attemptId + ":opsi:" + r.id);
      opsi = {
        id: perm.map((i: number) => opsi.id[i]),
        en: perm.map((i: number) => (opsi.en ?? opsi.id)[i]),
      };
    }
    return {
      id: r.id, tipe: r.tipe, pertanyaan_id: r.pertanyaan_id, pertanyaan_en: r.pertanyaan_en,
      opsi, gambar_url: r.gambar_url, poin: r.poin,
    };
  });
}

/** Nilai PG di server (memetakan balik indeks acak → kunci asli). */
function grade(rows: any[], exam: any, attemptId: string, jawaban: Record<string, string>) {
  const hasil: Record<string, { benar: boolean | null; poin: number }> = {};
  let nilaiPg = 0;
  for (const r of rows) {
    const jwb = jawaban[r.id];
    if (r.tipe === "pg") {
      let pickedOriginal: number | null = null;
      if (jwb !== undefined && jwb !== null && jwb !== "") {
        const picked = Number(jwb);
        if (exam.acak_opsi && r.opsi?.id) {
          const perm = seededOrder(r.opsi.id.length, attemptId + ":opsi:" + r.id);
          pickedOriginal = perm[picked] ?? null;
        } else pickedOriginal = picked;
      }
      const benar = pickedOriginal !== null && String(pickedOriginal) === String(r.kunci);
      hasil[r.id] = { benar, poin: benar ? r.poin : 0 };
      if (benar) nilaiPg += r.poin;
    } else {
      hasil[r.id] = { benar: null, poin: 0 }; // esai → menunggu review guru
    }
  }
  return { hasil, nilaiPg };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadContext(id);
  if ("error" in ctx) return ctx.error;
  const { user, exam } = ctx;
  const win = windowOf(exam);

  const attempt = await withDb(async (db) => {
    const { rows } = await db.query(
      "select * from public.exam_attempts where exam_id=$1 and student_id=$2::uuid",
      [id, user.id]
    );
    return rows[0] ?? null;
  });

  let questions = null;
  let deadline = null;
  if (attempt && attempt.status === "berjalan" && win === "buka") {
    deadline = deadlineOf(exam, attempt);
    if (Date.now() <= deadline) {
      const rows = await fetchQuestions(id);
      questions = viewQuestions(rows, exam, attempt.id);
    }
  }

  const totalPoin = await withDb(async (db) => {
    const { rows } = await db.query(
      "select coalesce(sum(poin),0)::int s from public.exam_questions where exam_id=$1", [id]);
    return rows[0].s;
  });

  return NextResponse.json({
    exam: {
      id: exam.id, nama: exam.nama, jenis: exam.jenis, tingkat_kelas: exam.tingkat_kelas,
      buka: exam.buka, tutup: exam.tutup, durasi_menit: exam.durasi_menit, totalPoin,
    },
    window: win,
    attempt,
    deadline,
    questions,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadContext(id);
  if ("error" in ctx) return ctx.error;
  const { user, exam } = ctx;
  const body = await req.json();
  const win = windowOf(exam);

  try {
    if (body.action === "mulai") {
      if (win !== "buka")
        return NextResponse.json({ error: win === "belum_buka" ? "Ujian belum dibuka" : "Ujian sudah ditutup" }, { status: 403 });
      const attempt = await withDb(async (db) => {
        const { rows } = await db.query(
          `insert into public.exam_attempts (exam_id, student_id, guru_id)
           values ($1, $2::uuid, $3::uuid)
           on conflict (exam_id, student_id) do update set exam_id = excluded.exam_id
           returning *`,
          [id, user.id, exam.guru_id]
        );
        return rows[0];
      });
      if (attempt.status === "selesai")
        return NextResponse.json({ error: "Kamu sudah mengumpulkan ujian ini" }, { status: 403 });
      return NextResponse.json({ ok: true, attempt });
    }

    if (body.action === "simpan" || body.action === "kumpul") {
      const rows = await fetchQuestions(id);
      const result = await withDb(async (db) => {
        const { rows: arows } = await db.query(
          "select * from public.exam_attempts where exam_id=$1 and student_id=$2::uuid",
          [id, user.id]
        );
        const attempt = arows[0];
        if (!attempt) throw new Error("Ujian belum dimulai");
        if (attempt.status === "selesai") throw new Error("Sudah dikumpulkan");

        const deadline = deadlineOf(exam, attempt);
        const telat = Date.now() > deadline + 30000; // toleransi 30 detik
        const jawaban = body.jawaban ?? attempt.jawaban ?? {};
        const ragu = body.ragu ?? attempt.ragu ?? [];

        if (body.action === "simpan" && !telat) {
          await db.query(
            "update public.exam_attempts set jawaban=$1, ragu=$2 where id=$3",
            [JSON.stringify(jawaban), JSON.stringify(ragu), attempt.id]
          );
          return { saved: true };
        }
        // kumpul (atau auto-submit karena waktu habis)
        const { hasil, nilaiPg } = grade(rows, exam, attempt.id, jawaban);
        await db.query(
          `update public.exam_attempts
             set jawaban=$1, ragu=$2, hasil=$3, nilai_pg=$4, nilai=$4,
                 status='selesai', selesai=now()
           where id=$5`,
          [JSON.stringify(jawaban), JSON.stringify(ragu), JSON.stringify(hasil), nilaiPg, attempt.id]
        );
        return { submitted: true, nilai_pg: nilaiPg };
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 }
    );
  }
}
