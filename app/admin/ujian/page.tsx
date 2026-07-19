"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Exam, Subject } from "@/lib/types";

/** Daftar ujian guru: buat, duplikat, terbit/draft, hapus. */
export default function UjianListPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [fNama, setFNama] = useState("");
  const [fJenis, setFJenis] = useState<"UTS" | "UAS" | "Lainnya">("UTS");
  const [fMapel, setFMapel] = useState("");
  const [fKelas, setFKelas] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    const supabase = createClient();
    supabase.from("exams").select().order("created_at", { ascending: false })
      .then(({ data }) => setExams((data as Exam[]) ?? []));
    supabase.from("subjects").select().order("urutan")
      .then(({ data }) => {
        const subs = (data as Subject[]) ?? [];
        setSubjects(subs);
        if (subs[0]) setFMapel((m) => m || subs[0].id);
      });
  };
  useEffect(load, []);

  const buat = async () => {
    if (!fNama.trim()) return;
    setBusy(true);
    const { data, error } = await createClient().from("exams").insert({
      nama: fNama.trim(), jenis: fJenis, subject_id: fMapel || null, tingkat_kelas: fKelas,
    }).select().single();
    setBusy(false);
    if (error) return setMsg(`❌ ${error.message}`);
    router.push(`/admin/ujian/${data.id}`);
  };

  const duplikat = async (e: Exam) => {
    setBusy(true);
    const supabase = createClient();
    const { data: baru, error } = await supabase.from("exams").insert({
      nama: `${e.nama} (salinan)`, jenis: e.jenis, subject_id: e.subject_id,
      tingkat_kelas: e.tingkat_kelas, mode_online: e.mode_online,
      durasi_menit: e.durasi_menit, acak_soal: e.acak_soal, acak_opsi: e.acak_opsi,
      peserta_kelas: e.peserta_kelas,
    }).select().single();
    if (!error && baru) {
      const { data: eqs } = await supabase.from("exam_questions").select().eq("exam_id", e.id);
      if (eqs?.length) {
        await supabase.from("exam_questions").insert(
          eqs.map(({ id: _id, exam_id: _e, ...rest }) => ({ ...rest, exam_id: baru.id }))
        );
      }
      setMsg(`✅ Ujian "${e.nama}" diduplikasi.`);
      load();
    } else setMsg(`❌ ${error?.message}`);
    setBusy(false);
  };

  const hapus = async (e: Exam) => {
    if (!confirm(`Hapus ujian "${e.nama}" beserta hasil pengerjaannya?`)) return;
    await createClient().from("exams").delete().eq("id", e.id);
    load();
  };

  const toggleTerbit = async (e: Exam) => {
    await createClient().from("exams")
      .update({ status: e.status === "terbit" ? "draft" : "terbit" }).eq("id", e.id);
    load();
  };

  const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">🎓 Ujian UTS / UAS</h1>
        <button onClick={() => setShowCreate(true)}
          className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white shadow hover:bg-sky-600">
          + Buat Ujian
        </button>
      </div>
      {msg && <p className="mb-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">{msg}</p>}

      <div className="space-y-3">
        {exams.map((e) => {
          const s = subjects.find((x) => x.id === e.subject_id);
          return (
            <div key={e.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl">{e.jenis === "UAS" ? "🏁" : e.jenis === "UTS" ? "📘" : "📄"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold text-slate-800">{e.nama}</p>
                  <p className="text-xs text-slate-400">
                    {e.jenis} · {s ? `${s.ikon} ${s.nama_id}` : "Tanpa mapel"} · Kelas {e.tingkat_kelas}
                    {e.mode_online && e.buka ? ` · 🕐 ${new Date(e.buka).toLocaleString("id-ID")}` : ""}
                  </p>
                </div>
                <button onClick={() => toggleTerbit(e)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    e.status === "terbit" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  }`}>
                  {e.status === "terbit" ? "✅ Terbit" : "📄 Draft"}
                </button>
                <div className="flex gap-1.5">
                  <Link href={`/admin/ujian/${e.id}`}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">
                    ✏️ Kelola
                  </Link>
                  <button onClick={() => duplikat(e)} disabled={busy} title="Duplikat ujian"
                    className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-sm font-semibold text-sky-600 hover:bg-sky-100">
                    📑
                  </button>
                  <button onClick={() => hapus(e)} title="Hapus"
                    className="rounded-lg bg-red-50 px-2.5 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-100">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {exams.length === 0 && (
          <p className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">
            Belum ada ujian — klik &quot;+ Buat Ujian&quot; untuk mulai menyusun dari bank soal.
          </p>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(ev) => ev.stopPropagation()}>
            <h2 className="mb-4 font-display text-xl font-bold text-slate-800">+ Buat Ujian</h2>
            <div className="space-y-3">
              <input className={input} placeholder='Nama ujian (mis. "UTS Matematika Ganjil")'
                value={fNama} onChange={(e) => setFNama(e.target.value)} />
              <div className="flex gap-2">
                <select className={input} value={fJenis} onChange={(e) => setFJenis(e.target.value as typeof fJenis)}>
                  <option value="UTS">UTS</option><option value="UAS">UAS</option><option value="Lainnya">Lainnya</option>
                </select>
                <select className={input} value={fKelas} onChange={(e) => setFKelas(+e.target.value)}>
                  {[1, 2, 3, 4, 5, 6].map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <select className={input} value={fMapel} onChange={(e) => setFMapel(e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.ikon} {s.nama_id}</option>)}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
              <button onClick={buat} disabled={busy || !fNama.trim()}
                className="rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50">
                {busy ? "⏳..." : "Lanjut Susun Soal →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
