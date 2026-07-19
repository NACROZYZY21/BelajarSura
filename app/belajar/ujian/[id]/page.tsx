"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const ABJAD = ["A", "B", "C", "D", "E"];

/** Mode ujian siswa: layar penuh, tenang & fokus — tanpa game/animasi ramai. */
export default function KerjakanUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, pick } = useI18n();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [ragu, setRagu] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [sisaMs, setSisaMs] = useState<number | null>(null);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submittedRef = useRef(false);

  const muat = useCallback(async () => {
    const r = await fetch(`/api/ujian/${id}`);
    const j = await r.json();
    if (!r.ok) { setErr(j.error); return; }
    setData(j);
    if (j.attempt) {
      setJawaban(j.attempt.jawaban ?? {});
      setRagu(j.attempt.ragu ?? []);
    }
  }, [id]);

  useEffect(() => { muat(); }, [muat]);

  // timer
  useEffect(() => {
    if (!data?.deadline) return;
    const iv = setInterval(() => {
      const sisa = data.deadline - Date.now();
      setSisaMs(sisa);
      if (sisa <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        kumpul(true);
      }
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.deadline]);

  // autosave tiap 20 detik
  useEffect(() => {
    if (!data?.questions) return;
    const iv = setInterval(() => simpan(), 20000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.questions, jawaban, ragu]);

  const aksi = async (body: any) => {
    const r = await fetch(`/api/ujian/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: r.ok, json: await r.json() };
  };

  const mulai = async () => {
    setBusy(true);
    const { ok, json } = await aksi({ action: "mulai" });
    setBusy(false);
    if (!ok) return setErr(json.error);
    await muat();
  };

  const simpan = () => aksi({ action: "simpan", jawaban, ragu });

  const kumpul = async (auto = false) => {
    setBusy(true);
    const { ok, json } = await aksi({ action: "kumpul", jawaban, ragu });
    setBusy(false);
    setKonfirmasi(false);
    if (!ok && !auto) return setErr(json.error);
    await muat();
  };

  if (err && !data)
    return (
      <Full>
        <p className="font-display text-lg font-bold text-slate-600">⚠️ {err}</p>
        <button onClick={() => router.push("/belajar/ujian")} className="mt-4 rounded-xl bg-sky-500 px-5 py-2 font-bold text-white">
          ← {pick("Kembali", "Back")}
        </button>
      </Full>
    );
  if (!data) return <Full><p className="text-slate-400">{pick("Memuat...", "Loading...")}</p></Full>;

  const { exam, window: win, attempt, questions } = data;

  // ===== layar status (belum mulai / belum buka / tutup / selesai) =====
  if (!questions) {
    return (
      <Full>
        <p className="text-5xl">{exam.jenis === "UAS" ? "🏁" : "📘"}</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-800">{exam.nama}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          ⏱️ {exam.durasi_menit} {pick("menit", "minutes")} · {exam.totalPoin} {pick("poin", "points")}
        </p>

        {attempt?.status === "selesai" ? (
          <>
            <p className="mt-6 font-display text-4xl font-extrabold text-mint-600">
              {Number(attempt.nilai ?? attempt.nilai_pg)} <span className="text-xl text-slate-400">/ {exam.totalPoin}</span>
            </p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {pick("Nilai PG otomatis — nilai esai menyusul setelah diperiksa guru ⏳", "MC auto-scored — essay scores come after teacher review ⏳")}
            </p>
          </>
        ) : win === "belum_buka" ? (
          <CountdownTo target={exam.buka} label={pick("Ujian dibuka dalam", "Exam opens in")} />
        ) : win === "tutup" ? (
          <p className="mt-6 font-display text-xl font-bold text-slate-500">🔒 {pick("Ujian sudah ditutup", "Exam is closed")}</p>
        ) : (
          <>
            <p className="mt-5 max-w-sm text-sm font-semibold text-slate-500">
              {pick(
                "Setelah menekan Mulai, waktu berjalan dan tidak bisa dijeda. Siapkan dirimu ya!",
                "Once you press Start, the timer runs and cannot be paused. Get ready!"
              )}
            </p>
            <button onClick={mulai} disabled={busy}
              className="mt-5 rounded-2xl bg-sky-500 px-8 py-3 font-display text-xl font-extrabold text-white shadow-lg hover:bg-sky-600 disabled:opacity-50">
              {busy ? "⏳" : attempt ? pick("Lanjutkan ▶", "Continue ▶") : pick("Mulai Ujian ▶", "Start Exam ▶")}
            </button>
          </>
        )}
        <button onClick={() => router.push("/belajar/ujian")} className="mt-6 text-sm font-bold text-slate-400 hover:text-slate-600">
          ← {pick("Kembali ke daftar ujian", "Back to exam list")}
        </button>
      </Full>
    );
  }

  // ===== layar pengerjaan =====
  const q = questions[idx];
  const menit = sisaMs !== null ? Math.max(0, Math.floor(sisaMs / 60000)) : null;
  const detik = sisaMs !== null ? Math.max(0, Math.floor((sisaMs % 60000) / 1000)) : null;
  const pctSisa = sisaMs !== null ? Math.max(0, (sisaMs / (exam.durasi_menit * 60000)) * 100) : 100;
  const terjawab = Object.keys(jawaban).filter((k) => jawaban[k] !== "").length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      {/* bar atas: nama + timer */}
      <div className="border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p className="min-w-0 flex-1 truncate font-display font-bold text-slate-700">{exam.nama}</p>
          <span className={`rounded-xl px-3 py-1.5 font-mono text-lg font-bold ${
            pctSisa > 25 ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-600"
          }`}>
            ⏱️ {menit !== null ? `${String(menit).padStart(2, "0")}:${String(detik).padStart(2, "0")}` : "--:--"}
          </span>
        </div>
        <div className="mx-auto mt-2 h-1.5 max-w-3xl overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full transition-[width] duration-500 ${pctSisa > 25 ? "bg-sky-500" : "bg-red-500"}`}
            style={{ width: `${pctSisa}%` }} />
        </div>
      </div>

      {/* navigasi nomor */}
      <div className="border-b border-slate-200 bg-white px-4 py-2">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-1.5">
          {questions.map((qq: any, i: number) => {
            const dijawab = jawaban[qq.id] !== undefined && jawaban[qq.id] !== "";
            const isRagu = ragu.includes(qq.id);
            return (
              <button key={qq.id} onClick={() => { simpan(); setIdx(i); }}
                className={`h-9 w-9 rounded-lg text-sm font-bold ${
                  i === idx ? "bg-sky-600 text-white ring-2 ring-sky-300"
                  : isRagu ? "bg-amber-200 text-amber-800"
                  : dijawab ? "bg-mint-100 text-mint-700"
                  : "bg-slate-100 text-slate-500"
                }`}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* soal */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display font-bold text-slate-500">
              {pick("Soal", "Question")} {idx + 1} / {questions.length}
              <span className="ml-2 text-xs font-semibold text-slate-400">({q.poin} {pick("poin", "pts")})</span>
            </p>
            <button onClick={() => setRagu(ragu.includes(q.id) ? ragu.filter((x) => x !== q.id) : [...ragu, q.id])}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold ${
                ragu.includes(q.id) ? "bg-amber-400 text-white" : "bg-amber-50 text-amber-600"
              }`}>
              🚩 {pick("Ragu-ragu", "Not sure")}
            </button>
          </div>

          <p className="mb-4 text-lg font-semibold text-slate-800">
            {lang === "id" ? q.pertanyaan_id : q.pertanyaan_en || q.pertanyaan_id}
          </p>
          {q.gambar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.gambar_url} alt="" className="mb-4 max-h-56 rounded-xl" />
          )}

          {q.tipe === "pg" ? (
            <div className="space-y-2">
              {(lang === "id" ? q.opsi?.id : q.opsi?.en ?? q.opsi?.id)?.map((opt: string, oi: number) => (
                <button key={oi}
                  onClick={() => setJawaban({ ...jawaban, [q.id]: String(oi) })}
                  className={`block w-full rounded-xl border-2 px-4 py-3 text-left font-semibold ${
                    jawaban[q.id] === String(oi)
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-200"
                  }`}>
                  <span className="mr-2 font-bold">{ABJAD[oi]}.</span>{opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={jawaban[q.id] ?? ""}
              onChange={(e) => setJawaban({ ...jawaban, [q.id]: e.target.value })}
              placeholder={pick("Tulis jawabanmu di sini...", "Write your answer here...")}
              className="min-h-32 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold outline-none focus:border-sky-400"
            />
          )}
        </div>
      </div>

      {/* bar bawah */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button onClick={() => { simpan(); setIdx(Math.max(0, idx - 1)); }} disabled={idx === 0}
            className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600 disabled:opacity-40">
            ←
          </button>
          <p className="flex-1 text-center text-sm font-semibold text-slate-500">
            {terjawab}/{questions.length} {pick("terjawab", "answered")}
          </p>
          {idx < questions.length - 1 ? (
            <button onClick={() => { simpan(); setIdx(idx + 1); }}
              className="rounded-xl bg-sky-500 px-5 py-2.5 font-bold text-white shadow hover:bg-sky-600">
              {pick("Lanjut", "Next")} →
            </button>
          ) : (
            <button onClick={() => setKonfirmasi(true)}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 font-bold text-white shadow hover:bg-emerald-600">
              📤 {pick("Kumpulkan", "Submit")}
            </button>
          )}
        </div>
      </div>

      {/* konfirmasi kumpul */}
      {konfirmasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setKonfirmasi(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-4xl">📤</p>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-800">
              {pick("Kumpulkan ujian?", "Submit the exam?")}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {terjawab}/{questions.length} {pick("soal terjawab", "questions answered")}
              {ragu.length > 0 && ` · 🚩 ${ragu.length} ${pick("ditandai ragu", "flagged")}`}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {pick("Setelah dikumpulkan tidak bisa diubah lagi.", "You can't change answers after submitting.")}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setKonfirmasi(false)} className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-600">
                {pick("Periksa Lagi", "Review Again")}
              </button>
              <button onClick={() => { submittedRef.current = true; kumpul(); }} disabled={busy}
                className="rounded-xl bg-emerald-500 px-5 py-2 font-bold text-white shadow disabled:opacity-50">
                {busy ? "⏳" : pick("Ya, Kumpulkan!", "Yes, Submit!")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Full({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      {children}
    </div>
  );
}

function CountdownTo({ target, label }: { target: string; label: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  const ms = new Date(target).getTime() - Date.now();
  const j = Math.max(0, Math.floor(ms / 3600000));
  const m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  const d = Math.max(0, Math.floor((ms % 60000) / 1000));
  return (
    <div className="mt-6">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-4xl font-bold text-tangerine-500">
        {String(j).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(d).padStart(2, "0")}
      </p>
    </div>
  );
}
