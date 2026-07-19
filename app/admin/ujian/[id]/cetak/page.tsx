"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { kopTerisi, type KopSurat } from "@/lib/kop";
import type { Exam, ExamQuestion, Question, Subject } from "@/lib/types";

const ABJAD = ["A", "B", "C", "D", "E"];

/** Cetak lembar ujian (Simpan sebagai PDF). ?kunci=1 = versi guru. */
export default function CetakUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const withKey = useSearchParams().get("kunci") === "1";
  const [exam, setExam] = useState<Exam | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [soal, setSoal] = useState<any[]>([]);
  const [kop, setKop] = useState<KopSurat | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("kop_surat").select().maybeSingle().then(({ data }) => setKop(data as KopSurat));
    supabase.from("exams").select().eq("id", id).single().then(async ({ data }) => {
      if (!data) return;
      setExam(data as Exam);
      if (data.subject_id) {
        const { data: s } = await supabase.from("subjects").select().eq("id", data.subject_id).single();
        setSubject(s as Subject);
      }
      const { data: eqs } = await supabase.from("exam_questions").select().eq("exam_id", id).order("urutan");
      const rows = (eqs as ExamQuestion[]) ?? [];
      const ids = rows.map((r) => r.question_id).filter(Boolean) as string[];
      let qmap = new Map<string, Question>();
      if (ids.length) {
        const { data: qs } = await supabase.from("questions").select().in("id", ids);
        qmap = new Map(((qs as Question[]) ?? []).map((q) => [q.id, q]));
      }
      setSoal(rows.map((eq) => {
        const q = eq.question_id ? qmap.get(eq.question_id) : undefined;
        return {
          id: eq.id,
          tipe: eq.tipe ?? q?.tipe ?? "pg",
          pertanyaan_id: eq.pertanyaan_id ?? q?.pertanyaan_id ?? "",
          opsi: eq.opsi ?? q?.opsi ?? null,
          jawaban_benar: eq.jawaban_benar ?? q?.jawaban_benar ?? null,
          gambar_url: eq.gambar_url ?? q?.gambar_url ?? null,
          poin: eq.poin,
        };
      }));
    });
  }, [id]);

  if (!exam) return <p className="p-8 text-slate-400">Memuat...</p>;
  const pg = soal.filter((q) => q.tipe === "pg");
  const esai = soal.filter((q) => q.tipe === "esai");
  const totalPoin = soal.reduce((s, q) => s + q.poin, 0);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-0">
      <style>{`
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between rounded-xl bg-sky-50 p-4">
        <p className="text-sm font-semibold text-slate-600">
          🖨️ Klik tombol lalu pilih <b>&quot;Simpan sebagai PDF&quot;</b>.
        </p>
        <button onClick={() => window.print()}
          className="rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white shadow hover:bg-sky-600">
          🖨️ Cetak / Simpan PDF
        </button>
      </div>

      {!kopTerisi(kop) && (
        <p className="no-print mb-4 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-600">
          💡 Kop masih polos — atur di menu <b>Kop Surat</b>.
        </p>
      )}

      {kopTerisi(kop) && kop && (
        <div className="mb-1">
          <div className="flex items-center gap-4">
            {kop.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={kop.logo_url} alt="logo" className="h-16 w-auto shrink-0" />
            )}
            <div className="flex-1 text-center">
              <p className="text-lg font-bold uppercase leading-tight">{kop.nama_instansi}</p>
              {kop.alamat && <p className="text-xs">{kop.alamat}</p>}
              {(kop.telepon || kop.email) && (
                <p className="text-xs">
                  {[kop.telepon && `Telp. ${kop.telepon}`, kop.email].filter(Boolean).join(" · ")}
                </p>
              )}
              {kop.baris_tambahan && <p className="text-xs italic">{kop.baris_tambahan}</p>}
            </div>
            {kop.logo_url && <div className="w-16 shrink-0" />}
          </div>
          <div className="mt-2 border-b-4 border-double border-slate-900" />
        </div>
      )}

      <div className="mt-3 border-b-2 border-slate-800 pb-3 text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">
          LEMBAR {exam.jenis} — {exam.nama}
        </h1>
        <p className="text-sm">
          {subject?.nama_id} · Kelas {exam.tingkat_kelas} · Total {totalPoin} poin · Waktu {exam.durasi_menit} menit
        </p>
        {withKey && <p className="mt-1 text-sm font-bold text-red-600">— VERSI GURU (DENGAN KUNCI) —</p>}
      </div>
      <p className="my-4 text-sm">
        Nama: ______________________ &nbsp; Kelas: ______ &nbsp; Tanggal: ______________
      </p>

      {pg.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-bold">A. Pilihan Ganda</h2>
          <ol className="space-y-4">
            {pg.map((q, i) => (
              <li key={q.id} className="break-inside-avoid text-sm">
                <p><b>{i + 1}.</b> {q.pertanyaan_id}{" "}
                  <span className="text-xs italic text-slate-400">({q.poin} poin)</span></p>
                {q.gambar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={q.gambar_url} alt="" className="my-2 ml-5 max-h-40 rounded" />
                )}
                <div className="ml-5 mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5">
                  {(q.opsi?.id ?? []).map((opt: string, oi: number) => {
                    const isKey = withKey && String(oi) === q.jawaban_benar;
                    return (
                      <p key={oi} className={isKey ? "font-bold text-green-700" : ""}>
                        {ABJAD[oi]}. {opt} {isKey && "✔"}
                      </p>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {esai.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-bold">B. Isian / Esai</h2>
          <ol className="space-y-5">
            {esai.map((q, i) => (
              <li key={q.id} className="break-inside-avoid text-sm">
                <p><b>{i + 1}.</b> {q.pertanyaan_id}{" "}
                  <span className="text-xs italic text-slate-400">({q.poin} poin)</span></p>
                {q.gambar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={q.gambar_url} alt="" className="my-2 ml-5 max-h-40 rounded" />
                )}
                <p className="ml-5 mt-2">
                  {withKey && q.jawaban_benar ? (
                    <span className="font-bold text-green-700">Kunci: {q.jawaban_benar}</span>
                  ) : (
                    <>Jawaban: ______________________________________________</>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {withKey && pg.length > 0 && (
        <section className="mt-8 border-t-2 border-slate-300 pt-3">
          <h2 className="mb-1 font-bold">Kunci Jawaban Pilihan Ganda</h2>
          <p className="text-sm">
            {pg.map((q, i) => `${i + 1}. ${ABJAD[Number(q.jawaban_benar ?? 0)] ?? "-"}`).join("    ")}
          </p>
        </section>
      )}
    </div>
  );
}
