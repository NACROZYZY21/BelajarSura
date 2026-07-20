"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Reorder } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { QuestionImageControl } from "@/components/admin/image-upload";
import { buildUjianDocx, type SoalUjian } from "@/lib/export/docx-ujian";
import { downloadBlob } from "@/lib/export/docx-soal";
import { getKop, warnIfNoKop } from "@/lib/kop";
import type { Exam, ExamAttempt, ExamQuestion, Module, Profile, Question, Subject } from "@/lib/types";

type Tab = "pengaturan" | "soal" | "hasil";
const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400";
const ABJAD = ["A", "B", "C", "D", "E"];

/** ISO UTC → nilai input datetime-local dalam WAKTU LOKAL (WIB dsb). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Gabungkan tampilan soal ujian (bank modul / khusus). */
function merge(eq: ExamQuestion, qmap: Map<string, Question>): SoalUjian {
  const q = eq.question_id ? qmap.get(eq.question_id) : undefined;
  return {
    id: eq.id,
    tipe: (eq.tipe ?? q?.tipe ?? "pg") as "pg" | "esai",
    pertanyaan_id: eq.pertanyaan_id ?? q?.pertanyaan_id ?? "",
    opsi: (eq.opsi ?? q?.opsi) as { id: string[] } | null,
    jawaban_benar: eq.jawaban_benar ?? q?.jawaban_benar ?? null,
    gambar_url: eq.gambar_url ?? q?.gambar_url ?? null,
    poin: eq.poin,
  };
}

export default function UjianEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("pengaturan");
  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [eqs, setEqs] = useState<ExamQuestion[]>([]);
  const [qmap, setQmap] = useState<Map<string, Question>>(new Map());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [showBaru, setShowBaru] = useState(false);

  const load = async () => {
    const supabase = createClient();
    const [{ data: ex }, { data: subs }, { data: eqrows }] = await Promise.all([
      supabase.from("exams").select().eq("id", id).single(),
      supabase.from("subjects").select().order("urutan"),
      supabase.from("exam_questions").select().eq("exam_id", id).order("urutan"),
    ]);
    setExam(ex as Exam);
    setSubjects((subs as Subject[]) ?? []);
    const rows = (eqrows as ExamQuestion[]) ?? [];
    setEqs(rows);
    const ids = rows.map((r) => r.question_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: qs } = await supabase.from("questions").select().in("id", ids);
      setQmap(new Map(((qs as Question[]) ?? []).map((q) => [q.id, q])));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const totalPoin = eqs.reduce((s, e) => s + (Number(e.poin) || 0), 0);

  if (!exam) return <p className="text-slate-400">Memuat...</p>;
  const subject = subjects.find((s) => s.id === exam.subject_id);

  const simpanPengaturan = async () => {
    setBusy(true);
    const { error } = await createClient().from("exams").update({
      nama: exam.nama, jenis: exam.jenis, subject_id: exam.subject_id,
      tingkat_kelas: exam.tingkat_kelas, status: exam.status, mode_online: exam.mode_online,
      buka: exam.buka, tutup: exam.tutup, durasi_menit: exam.durasi_menit,
      acak_soal: exam.acak_soal, acak_opsi: exam.acak_opsi, peserta_kelas: exam.peserta_kelas,
    }).eq("id", id);
    setMsg(error ? `❌ ${error.message}` : "✅ Pengaturan tersimpan.");
    setBusy(false);
  };

  const simpanSoal = async () => {
    setBusy(true);
    const supabase = createClient();
    for (const [i, e] of eqs.entries()) {
      await supabase.from("exam_questions").update({ poin: e.poin, urutan: i + 1 }).eq("id", e.id);
    }
    setMsg("✅ Urutan & bobot tersimpan.");
    setBusy(false);
  };

  const bagiRata = () => {
    if (!eqs.length) return;
    const base = Math.floor(100 / eqs.length);
    const sisa = 100 - base * eqs.length;
    setEqs(eqs.map((e, i) => ({ ...e, poin: base + (i < sisa ? 1 : 0) })));
  };

  const hapusSoal = async (eqId: string) => {
    await createClient().from("exam_questions").delete().eq("id", eqId);
    setEqs(eqs.filter((e) => e.id !== eqId));
  };

  const eksporWord = async (withKey: boolean) => {
    setBusy(true);
    try {
      const kop = await getKop();
      warnIfNoKop(kop);
      const blob = await buildUjianDocx(exam, subject, eqs.map((e) => merge(e, qmap)), withKey, kop);
      const slug = exam.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      downloadBlob(blob, `${slug}${withKey ? "-kunci" : ""}.docx`);
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/admin/ujian" className="font-semibold text-sky-600">← Ujian</Link>
        <h1 className="font-display text-xl font-extrabold text-slate-800">{exam.nama}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          exam.status === "terbit" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
        }`}>{exam.status}</span>
      </div>
      {msg && <p className="mb-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">{msg}</p>}

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm">
        {([["pengaturan", "⚙️ Pengaturan"], ["soal", `📝 Soal (${eqs.length})`], ["hasil", "📊 Hasil"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === k ? "bg-sky-500 text-white shadow" : "text-slate-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ================= PENGATURAN ================= */}
      {tab === "pengaturan" && (
        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-display text-lg font-bold text-slate-700">Identitas Ujian</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={input} value={exam.nama} onChange={(e) => setExam({ ...exam, nama: e.target.value })} />
              <div className="flex gap-2">
                <select className={input} value={exam.jenis} onChange={(e) => setExam({ ...exam, jenis: e.target.value as Exam["jenis"] })}>
                  <option value="UTS">UTS</option><option value="UAS">UAS</option><option value="Lainnya">Lainnya</option>
                </select>
                <select className={input} value={exam.tingkat_kelas} onChange={(e) => setExam({ ...exam, tingkat_kelas: +e.target.value })}>
                  {[1, 2, 3, 4, 5, 6].map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <select className={input} value={exam.subject_id ?? ""} onChange={(e) => setExam({ ...exam, subject_id: e.target.value || null })}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.ikon} {s.nama_id}</option>)}
              </select>
              <select className={input} value={exam.status} onChange={(e) => setExam({ ...exam, status: e.target.value as Exam["status"] })}>
                <option value="draft">📄 Draft (tersembunyi dari siswa)</option>
                <option value="terbit">✅ Terbit</option>
              </select>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-700">
              <input type="checkbox" checked={exam.mode_online}
                onChange={(e) => setExam({ ...exam, mode_online: e.target.checked })} />
              💻 Mode ONLINE (dikerjakan siswa di sistem)
            </label>
            {exam.mode_online && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-500">Jadwal BUKA (waktu setempat)
                  <input type="datetime-local" className={`${input} mt-1`}
                    value={toLocalInput(exam.buka)}
                    onChange={(e) => setExam({ ...exam, buka: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </label>
                <label className="text-xs font-semibold text-slate-500">Jadwal TUTUP (waktu setempat)
                  <input type="datetime-local" className={`${input} mt-1`}
                    value={toLocalInput(exam.tutup)}
                    onChange={(e) => setExam({ ...exam, tutup: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </label>
                <label className="text-xs font-semibold text-slate-500">Durasi (menit)
                  <input type="number" className={`${input} mt-1`} value={exam.durasi_menit}
                    onChange={(e) => setExam({ ...exam, durasi_menit: +e.target.value })} />
                </label>
                <div className="flex flex-col justify-end gap-1.5 text-sm font-semibold text-slate-600">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={exam.acak_soal} onChange={(e) => setExam({ ...exam, acak_soal: e.target.checked })} />
                    🔀 Acak urutan soal per siswa
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={exam.acak_opsi} onChange={(e) => setExam({ ...exam, acak_opsi: e.target.checked })} />
                    🔀 Acak urutan opsi PG
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs font-semibold text-slate-500">Kelas peserta (kosongkan semua = seluruh siswa):</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                      <label key={k} className={`cursor-pointer rounded-xl px-3 py-1.5 text-sm font-bold ${
                        exam.peserta_kelas.includes(k) ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        <input type="checkbox" className="hidden" checked={exam.peserta_kelas.includes(k)}
                          onChange={() => setExam({
                            ...exam,
                            peserta_kelas: exam.peserta_kelas.includes(k)
                              ? exam.peserta_kelas.filter((x) => x !== k)
                              : [...exam.peserta_kelas, k],
                          })} />
                        Kelas {k}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-display text-lg font-bold text-slate-700">🖨️ Mode CETAK (offline)</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => eksporWord(false)} disabled={busy || !eqs.length}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-600 disabled:opacity-50">
                📄 Word — Lembar Siswa
              </button>
              <button onClick={() => eksporWord(true)} disabled={busy || !eqs.length}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-50">
                🔑 Word — Kunci Jawaban
              </button>
              <Link href={`/admin/ujian/${id}/cetak`} target="_blank"
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600">
                🖨️ Cetak / PDF
              </Link>
              <Link href={`/admin/ujian/${id}/cetak?kunci=1`} target="_blank"
                className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-200">
                🖨️ PDF + Kunci
              </Link>
            </div>
            <p className="mt-2 text-xs text-slate-400">Semua ekspor otomatis memakai kop suratmu (menu 📜 Kop Surat).</p>
          </section>

          <div className="flex justify-end">
            <button onClick={simpanPengaturan} disabled={busy}
              className="rounded-xl bg-sky-500 px-6 py-2.5 font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50">
              {busy ? "⏳..." : "💾 Simpan Pengaturan"}
            </button>
          </div>
        </div>
      )}

      {/* ================= SOAL ================= */}
      {tab === "soal" && (
        <div className="space-y-4">
          <div className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${
            totalPoin === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}>
            <span className="font-display text-lg font-extrabold">
              {totalPoin === 100 ? "✅" : "Σ"} Total bobot: {totalPoin} poin
            </span>
            <span className="text-xs font-semibold">(total bebas — 100 hanya patokan umum)</span>
            <button onClick={bagiRata} className="ml-auto rounded-lg bg-white px-3 py-1.5 text-sm font-bold shadow-sm">
              ⚖️ Bagi rata ke 100
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowBank(true)}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-600">
              🏦 Ambil dari Bank Soal
            </button>
            <button onClick={() => setShowBaru(true)}
              className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-violet-600">
              ➕ Soal Baru Khusus Ujian
            </button>
            <button onClick={simpanSoal} disabled={busy}
              className="ml-auto rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-50">
              {busy ? "⏳..." : "💾 Simpan Urutan & Bobot"}
            </button>
          </div>

          <Reorder.Group axis="y" values={eqs} onReorder={setEqs} className="space-y-2">
            {eqs.map((e, i) => {
              const d = merge(e, qmap);
              return (
                <Reorder.Item key={e.id} value={e}
                  className="cursor-grab rounded-xl bg-white p-4 shadow-sm active:cursor-grabbing">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 text-slate-300">⠿</span>
                    <span className="mt-0.5 font-display font-bold text-slate-400">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">
                        <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                          d.tipe === "pg" ? "bg-sky-100 text-sky-600" : "bg-violet-100 text-violet-600"
                        }`}>{d.tipe.toUpperCase()}</span>
                        {e.question_id === null && (
                          <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-600">khusus</span>
                        )}
                        {d.pertanyaan_id}
                      </p>
                      {d.gambar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.gambar_url} alt="" className="mt-1 max-h-20 rounded" />
                      )}
                      {d.tipe === "pg" && d.opsi && (
                        <p className="mt-1 text-xs text-slate-400">
                          {d.opsi.id.map((o, oi) => `${ABJAD[oi]}. ${o}`).join("   ")}
                        </p>
                      )}
                    </div>
                    <input type="number" title="Bobot poin ujian" value={e.poin}
                      onChange={(ev) => setEqs(eqs.map((x) => (x.id === e.id ? { ...x, poin: +ev.target.value } : x)))}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
                    <button onClick={() => hapusSoal(e.id)} className="text-red-400 hover:text-red-600">🗑️</button>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
          {eqs.length === 0 && (
            <p className="rounded-2xl bg-white p-8 text-center text-slate-400 shadow-sm">
              Belum ada soal — ambil dari Bank Soal atau buat soal khusus.
            </p>
          )}
        </div>
      )}

      {/* ================= HASIL ================= */}
      {tab === "hasil" && <HasilTab examId={id} eqs={eqs} qmap={qmap} totalPoin={totalPoin} />}

      {showBank && exam.subject_id && (
        <BankSoalModal exam={exam} existing={eqs} onClose={() => setShowBank(false)}
          onAdded={() => { setShowBank(false); load(); }} />
      )}
      {showBaru && (
        <SoalBaruModal examId={id} nextUrutan={eqs.length + 1} onClose={() => setShowBaru(false)}
          onAdded={() => { setShowBaru(false); load(); }} />
      )}
    </div>
  );
}

/* ---------------- BANK SOAL ---------------- */
function BankSoalModal({ exam, existing, onClose, onAdded }: {
  exam: Exam; existing: ExamQuestion[]; onClose: () => void; onAdded: () => void;
}) {
  const [modules, setModules] = useState<Module[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [cari, setCari] = useState("");
  const [tipe, setTipe] = useState<"" | "pg" | "esai">("");
  const [busy, setBusy] = useState(false);
  const sudahAda = useMemo(() => new Set(existing.map((e) => e.question_id).filter(Boolean)), [existing]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("modules").select().eq("subject_id", exam.subject_id!).eq("tingkat_kelas", exam.tingkat_kelas)
      .order("urutan")
      .then(async ({ data }) => {
        const mods = (data as Module[]) ?? [];
        setModules(mods);
        if (mods.length) {
          const { data: qs } = await supabase.from("questions").select()
            .in("module_id", mods.map((m) => m.id)).order("urutan");
          setQuestions((qs as Question[]) ?? []);
        }
      });
  }, [exam]);

  const tambah = async () => {
    setBusy(true);
    const rows = [...checked].map((qid, i) => {
      const q = questions.find((x) => x.id === qid)!;
      return { exam_id: exam.id, question_id: qid, poin: q.poin, urutan: existing.length + i + 1 };
    });
    await createClient().from("exam_questions").insert(rows);
    setBusy(false);
    onAdded();
  };

  const cocok = (q: Question) =>
    (!tipe || q.tipe === tipe) &&
    (!cari || q.pertanyaan_id.toLowerCase().includes(cari.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-bold text-slate-800">🏦 Bank Soal — Kelas {exam.tingkat_kelas}</h2>
          <div className="mt-3 flex gap-2">
            <input className={input} placeholder="Cari soal..." value={cari} onChange={(e) => setCari(e.target.value)} />
            <select className="rounded-xl border border-slate-200 px-3 text-sm font-semibold" value={tipe}
              onChange={(e) => setTipe(e.target.value as typeof tipe)}>
              <option value="">Semua tipe</option><option value="pg">PG</option><option value="esai">Esai</option>
            </select>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {modules.map((m) => {
            const qs = questions.filter((q) => q.module_id === m.id && cocok(q));
            if (!qs.length) return null;
            return (
              <div key={m.id}>
                <p className="mb-2 font-display font-bold text-slate-600">📘 {m.judul_id}</p>
                <div className="space-y-1.5">
                  {qs.map((q) => {
                    const dipakai = sudahAda.has(q.id);
                    return (
                      <label key={q.id} className={`flex items-start gap-2 rounded-xl p-2.5 text-sm ${
                        dipakai ? "bg-slate-50 opacity-50" : checked.has(q.id) ? "bg-sky-50 ring-1 ring-sky-300" : "bg-slate-50 hover:bg-sky-50"
                      }`}>
                        <input type="checkbox" className="mt-1" disabled={dipakai}
                          checked={dipakai || checked.has(q.id)}
                          onChange={() => {
                            const n = new Set(checked);
                            if (n.has(q.id)) n.delete(q.id); else n.add(q.id);
                            setChecked(n);
                          }} />
                        <span className="flex-1">
                          <span className={`mr-1.5 rounded-full px-1.5 text-xs font-bold ${
                            q.tipe === "pg" ? "bg-sky-100 text-sky-600" : "bg-violet-100 text-violet-600"
                          }`}>{q.tipe.toUpperCase()}</span>
                          {q.pertanyaan_id}
                          {q.gambar_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={q.gambar_url} alt="" className="mt-1 max-h-16 rounded" />
                          )}
                          {q.tipe === "pg" && q.opsi && (
                            <span className="mt-0.5 block text-xs text-slate-400">
                              {q.opsi.id.map((o, oi) => `${ABJAD[oi]}. ${o}`).join("  ")}
                            </span>
                          )}
                        </span>
                        {dipakai && <span className="text-xs font-bold text-slate-400">sudah dipakai</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {modules.length === 0 && <p className="text-center text-slate-400">Tidak ada modul untuk mapel+kelas ini.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
          <button onClick={tambah} disabled={busy || checked.size === 0}
            className="rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50">
            {busy ? "⏳..." : `➕ Tambahkan ${checked.size} soal`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SOAL BARU KHUSUS UJIAN ---------------- */
function SoalBaruModal({ examId, nextUrutan, onClose, onAdded }: {
  examId: string; nextUrutan: number; onClose: () => void; onAdded: () => void;
}) {
  const [tipe, setTipe] = useState<"pg" | "esai">("pg");
  const [pId, setPId] = useState(""); const [pEn, setPEn] = useState("");
  const [opsiId, setOpsiId] = useState(["", "", "", ""]);
  const [opsiEn, setOpsiEn] = useState(["", "", "", ""]);
  const [benar, setBenar] = useState(0);
  const [kunciEsai, setKunciEsai] = useState("");
  const [gambar, setGambar] = useState<string | null>(null);
  const [poin, setPoin] = useState(10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const translate = async () => {
    setBusy(true); setErr("");
    try {
      const texts = [pId, ...(tipe === "pg" ? opsiId : [])];
      const res = await fetch("/api/ai/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPEn(json.translations[0]);
      if (tipe === "pg") setOpsiEn(json.translations.slice(1));
    } catch (e) { setErr(e instanceof Error ? e.message : "Gagal menerjemahkan"); }
    finally { setBusy(false); }
  };

  const simpan = async () => {
    if (!pId.trim()) return setErr("Pertanyaan wajib diisi");
    setBusy(true);
    const { error } = await createClient().from("exam_questions").insert({
      exam_id: examId, question_id: null, tipe,
      pertanyaan_id: pId, pertanyaan_en: pEn,
      opsi: tipe === "pg" ? { id: opsiId, en: opsiEn.some(Boolean) ? opsiEn : opsiId } : null,
      jawaban_benar: tipe === "pg" ? String(benar) : kunciEsai || null,
      gambar_url: gambar, poin, urutan: nextUrutan,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 font-display text-xl font-bold text-slate-800">➕ Soal Baru Khusus Ujian</h2>
        <p className="mb-4 text-xs text-slate-400">Soal ini hanya untuk ujian — tidak memengaruhi modul.</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <select className={input} value={tipe} onChange={(e) => setTipe(e.target.value as "pg" | "esai")}>
              <option value="pg">Pilihan Ganda</option><option value="esai">Esai / Isian</option>
            </select>
            <input type="number" className="w-24 rounded-xl border border-slate-200 px-3" title="Poin"
              value={poin} onChange={(e) => setPoin(+e.target.value)} />
            <button onClick={translate} disabled={busy || !pId}
              className="shrink-0 rounded-xl bg-violet-100 px-3 text-sm font-semibold text-violet-600 hover:bg-violet-200 disabled:opacity-50">
              {busy ? "⏳" : "🌐 Terjemahkan"}
            </button>
          </div>
          <input className={input} placeholder="Pertanyaan (ID)" value={pId} onChange={(e) => setPId(e.target.value)} />
          <input className={input} placeholder="Question (EN)" value={pEn} onChange={(e) => setPEn(e.target.value)} />
          <QuestionImageControl url={gambar} folder="ujian" onChange={setGambar} />
          {tipe === "pg" ? (
            <div className="space-y-2">
              {opsiId.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="benar" checked={benar === i} onChange={() => setBenar(i)} title="Jawaban benar" />
                  <input className={input} placeholder={`Opsi ${ABJAD[i]} (ID)`} value={o}
                    onChange={(e) => setOpsiId(opsiId.map((x, j) => (j === i ? e.target.value : x)))} />
                  <input className={input} placeholder="(EN)" value={opsiEn[i]}
                    onChange={(e) => setOpsiEn(opsiEn.map((x, j) => (j === i ? e.target.value : x)))} />
                </div>
              ))}
            </div>
          ) : (
            <input className={input} placeholder="Kunci/contoh jawaban (opsional — esai dinilai manual)"
              value={kunciEsai} onChange={(e) => setKunciEsai(e.target.value)} />
          )}
          {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-500">{err}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
          <button onClick={simpan} disabled={busy}
            className="rounded-xl bg-violet-500 px-5 py-2 font-semibold text-white shadow hover:bg-violet-600 disabled:opacity-50">
            💾 Tambahkan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- HASIL & RANKING + REVIEW ESAI ---------------- */
function HasilTab({ examId, eqs, qmap, totalPoin }: {
  examId: string; eqs: ExamQuestion[]; qmap: Map<string, Question>; totalPoin: number;
}) {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [expand, setExpand] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, { poin: string; komentar: string }>>({});
  const [msg, setMsg] = useState("");

  const load = () => {
    const supabase = createClient();
    supabase.from("exam_attempts").select().eq("exam_id", examId)
      .then(({ data }) => setAttempts((data as ExamAttempt[]) ?? []));
    supabase.from("profiles").select().eq("role", "siswa")
      .then(({ data }) => setStudents((data as Profile[]) ?? []));
  };
  useEffect(load, [examId]);

  const esaiQs = eqs.map((e) => ({ eq: e, d: merge(e, qmap) })).filter((x) => x.d.tipe === "esai");
  const ranked = [...attempts].sort((a, b) => (b.nilai ?? b.nilai_pg) - (a.nilai ?? a.nilai_pg));

  const simpanNilaiEsai = async (att: ExamAttempt) => {
    const poinEsai: ExamAttempt["poin_esai"] = { ...att.poin_esai };
    for (const { eq } of esaiQs) {
      const key = `${att.id}:${eq.id}`;
      const inp = inputs[key];
      if (inp && inp.poin !== "") {
        poinEsai[eq.id] = {
          poin: Math.max(0, Math.min(eq.poin, Number(inp.poin))),
          komentar: inp.komentar ?? "",
        };
      }
    }
    const totalEsai = Object.values(poinEsai).reduce((s, x) => s + x.poin, 0);
    const nilai = Number(att.nilai_pg) + totalEsai;
    await createClient().from("exam_attempts")
      .update({ poin_esai: poinEsai, nilai }).eq("id", att.id);
    setMsg("✅ Nilai esai tersimpan & total diperbarui.");
    load();
  };

  return (
    <div className="space-y-3">
      {msg && <p className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">{msg}</p>}
      {ranked.map((att, i) => {
        const s = students.find((x) => x.id === att.student_id);
        const nilai = att.nilai ?? att.nilai_pg;
        const adaEsaiBelum = esaiQs.some(({ eq }) => att.jawaban[eq.id] && !att.poin_esai[eq.id]);
        return (
          <div key={att.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-lg font-extrabold text-slate-400">
                {att.status === "selesai" ? (["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`) : "⏳"}
              </span>
              <span className="text-2xl">{s?.avatar ?? "🎒"}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{s?.nama ?? "?"}</p>
                <p className="text-xs text-slate-400">
                  {att.status === "selesai"
                    ? `Selesai ${att.selesai ? new Date(att.selesai).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}`
                    : "Sedang mengerjakan..."}
                  {adaEsaiBelum && " · ✏️ esai belum dinilai"}
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 font-display font-extrabold text-sky-700">
                {Number(nilai)} / {totalPoin}
              </span>
              {esaiQs.length > 0 && att.status === "selesai" && (
                <button onClick={() => setExpand(expand === att.id ? null : att.id)}
                  className="rounded-lg bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-600 hover:bg-violet-100">
                  {expand === att.id ? "Tutup" : "✏️ Nilai Esai"}
                </button>
              )}
            </div>

            {expand === att.id && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                {esaiQs.map(({ eq, d }) => {
                  const key = `${att.id}:${eq.id}`;
                  const sudah = att.poin_esai[eq.id];
                  const inp = inputs[key] ?? { poin: sudah ? String(sudah.poin) : "", komentar: sudah?.komentar ?? "" };
                  return (
                    <div key={eq.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-700">❓ {d.pertanyaan_id}</p>
                      <p className="mt-1 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-800">
                        💬 {att.jawaban[eq.id] || <span className="text-slate-300">(tidak dijawab)</span>}
                      </p>
                      {d.jawaban_benar && (
                        <p className="mt-0.5 text-xs text-slate-400">Contoh jawaban: {d.jawaban_benar}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="number" min={0} max={eq.poin} placeholder="Poin" value={inp.poin}
                          onChange={(e) => setInputs({ ...inputs, [key]: { ...inp, poin: e.target.value } })}
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                        <span className="text-xs text-slate-400">/ {eq.poin}</span>
                        <input placeholder="Komentar (opsional)" value={inp.komentar}
                          onChange={(e) => setInputs({ ...inputs, [key]: { ...inp, komentar: e.target.value } })}
                          className="min-w-40 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end">
                  <button onClick={() => simpanNilaiEsai(att)}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600">
                    ✅ ACC & Perbarui Total
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {attempts.length === 0 && (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">
          Belum ada siswa yang mengerjakan.
        </p>
      )}
    </div>
  );
}
