"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Module, Question, Subject } from "@/lib/types";

const ABJAD = ["A", "B", "C", "D", "E"];

/** Halaman cetak lembar soal — pakai Cetak browser → "Simpan sebagai PDF".
 *  ?kunci=1 menampilkan versi guru dengan kunci jawaban. */
export default function CetakSoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const withKey = searchParams.get("kunci") === "1";

  const [mod, setMod] = useState<Module | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("modules").select().eq("id", id).single().then(async ({ data }) => {
      if (!data) return;
      setMod(data as Module);
      const [s, q] = await Promise.all([
        supabase.from("subjects").select().eq("id", data.subject_id).single(),
        supabase.from("questions").select().eq("module_id", id).order("urutan"),
      ]);
      setSubject(s.data as Subject);
      setQuestions((q.data as Question[]) ?? []);
    });
  }, [id]);

  if (!mod) return <p className="p-8 text-slate-400">Memuat...</p>;

  const pg = questions.filter((q) => q.tipe === "pg");
  const esai = questions.filter((q) => q.tipe === "esai");

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-0">
      {/* sembunyikan kerangka admin saat dicetak */}
      <style>{`
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between rounded-xl bg-sky-50 p-4">
        <p className="text-sm font-semibold text-slate-600">
          🖨️ Klik tombol lalu pilih <b>&quot;Simpan sebagai PDF&quot;</b> di dialog cetak.
        </p>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white shadow hover:bg-sky-600"
        >
          🖨️ Cetak / Simpan PDF
        </button>
      </div>

      {/* KOP */}
      <div className="border-b-4 border-double border-slate-800 pb-3 text-center">
        <h1 className="text-xl font-bold tracking-wide">LEMBAR SOAL — BELAJAR CERIA</h1>
        <p className="text-sm">
          {subject?.nama_id} · {mod.judul_id} · Kelas {mod.tingkat_kelas}
        </p>
        {withKey && (
          <p className="mt-1 text-sm font-bold text-red-600">
            — VERSI GURU (DENGAN KUNCI JAWABAN) —
          </p>
        )}
      </div>
      <p className="my-4 text-sm">
        Nama: ______________________________&nbsp;&nbsp;&nbsp; Tanggal: ______________
      </p>

      {pg.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-bold">A. Pilihan Ganda</h2>
          <ol className="space-y-4">
            {pg.map((q, i) => (
              <li key={q.id} className="break-inside-avoid text-sm">
                <p>
                  <b>{i + 1}.</b> {q.pertanyaan_id}{" "}
                  <span className="text-xs italic text-slate-400">({q.poin} poin)</span>
                </p>
                {q.gambar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={q.gambar_url} alt="" className="my-2 ml-5 max-h-40 rounded" />
                )}
                <div className="ml-5 mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5">
                  {(q.opsi?.id ?? []).map((opt, oi) => {
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
                <p>
                  <b>{i + 1}.</b> {q.pertanyaan_id}{" "}
                  <span className="text-xs italic text-slate-400">({q.poin} poin)</span>
                </p>
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
