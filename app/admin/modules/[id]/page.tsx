"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ImagePickButton, QuestionImageControl } from "@/components/admin/image-upload";
import { GameConfigEditor } from "@/components/admin/game-config-editor";
import { GAME_REGISTRY, GAME_TYPES } from "@/components/games/registry";
import type { GameType, Question, Subject } from "@/lib/types";

interface QDraft {
  id?: string;
  tipe: "pg" | "esai";
  pertanyaan_id: string;
  pertanyaan_en: string;
  opsi_id: string[];
  opsi_en: string[];
  jawaban_benar: string;
  poin: number;
  gambar_url: string | null;
}

interface GDraft {
  id?: string;
  tipe_game: GameType;
  config: string; // JSON text
}

/** Editor modul: dipakai untuk /admin/modules/new dan /admin/modules/[id]. */
export default function ModuleEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { t } = useI18n();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState({
    subject_id: "",
    tingkat_kelas: 1,
    judul_id: "",
    judul_en: "",
    materi_id: "",
    materi_en: "",
    urutan: 1,
    status: "draft" as "draft" | "published",
  });
  const [questions, setQuestions] = useState<QDraft[]>([]);
  const [games, setGames] = useState<GDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("subjects")
      .select()
      .order("urutan")
      .then(({ data }) => {
        const subs = (data as Subject[]) ?? [];
        setSubjects(subs);
        if (isNew && subs[0]) setForm((f) => ({ ...f, subject_id: f.subject_id || subs[0].id }));
      });

    if (!isNew) {
      supabase
        .from("modules")
        .select()
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) setForm({ ...data });
        });
      supabase
        .from("questions")
        .select()
        .eq("module_id", id)
        .order("urutan")
        .then(({ data }) =>
          setQuestions(
            ((data as Question[]) ?? []).map((q) => ({
              id: q.id,
              tipe: q.tipe,
              pertanyaan_id: q.pertanyaan_id,
              pertanyaan_en: q.pertanyaan_en,
              opsi_id: q.opsi?.id ?? ["", "", "", ""],
              opsi_en: q.opsi?.en ?? ["", "", "", ""],
              jawaban_benar: q.jawaban_benar ?? "",
              poin: q.poin,
              gambar_url: q.gambar_url ?? null,
            }))
          )
        );
      supabase
        .from("games")
        .select()
        .eq("module_id", id)
        .then(({ data }) =>
          setGames(
            (data ?? []).map((g) => ({
              id: g.id,
              tipe_game: g.tipe_game,
              config: JSON.stringify(g.config, null, 2),
            }))
          )
        );
    }
  }, [id, isNew]);

  const totalPoin = questions.reduce((s, q) => s + (Number(q.poin) || 0), 0);
  const [translating, setTranslating] = useState<string | null>(null);

  /** Panggil /api/ai/translate untuk sekumpulan teks Indonesia → Inggris. */
  const translate = async (texts: string[]): Promise<string[]> => {
    const res = await fetch("/api/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Gagal menerjemahkan");
    return json.translations as string[];
  };

  const runTranslate = async (key: string, fn: () => Promise<void>) => {
    setError("");
    setTranslating(key);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menerjemahkan");
    } finally {
      setTranslating(null);
    }
  };

  const translateJudul = () =>
    runTranslate("judul", async () => {
      const [en] = await translate([form.judul_id]);
      setForm((f) => ({ ...f, judul_en: en }));
    });

  const translateMateri = () =>
    runTranslate("materi", async () => {
      const [en] = await translate([form.materi_id]);
      setForm((f) => ({ ...f, materi_en: en }));
    });

  const translateQuestion = (qi: number) =>
    runTranslate(`q${qi}`, async () => {
      const q = questions[qi];
      const texts = [q.pertanyaan_id, ...(q.tipe === "pg" ? q.opsi_id : [])];
      const out = await translate(texts);
      setQuestions((qs) =>
        qs.map((x, i) =>
          i === qi
            ? { ...x, pertanyaan_en: out[0], opsi_en: x.tipe === "pg" ? out.slice(1) : x.opsi_en }
            : x
        )
      );
    });

  /** Satu klik: terjemahkan judul + materi + semua soal & opsinya sekaligus. */
  const translateAll = () =>
    runTranslate("all", async () => {
      const texts: string[] = [form.judul_id, form.materi_id];
      const qStart: number[] = [];
      for (const q of questions) {
        qStart.push(texts.length);
        texts.push(q.pertanyaan_id, ...(q.tipe === "pg" ? q.opsi_id : []));
      }
      const out = await translate(texts);
      setForm((f) => ({ ...f, judul_en: out[0], materi_en: out[1] }));
      setQuestions((qs) =>
        qs.map((q, i) => ({
          ...q,
          pertanyaan_en: out[qStart[i]],
          opsi_en: q.tipe === "pg" ? out.slice(qStart[i] + 1, qStart[i] + 1 + q.opsi_id.length) : q.opsi_en,
        }))
      );
    });

  /** Bagi 100 poin merata ke semua soal (sisa pembagian ke soal-soal awal). */
  const splitEvenly = () => {
    if (!questions.length) return;
    const base = Math.floor(100 / questions.length);
    const remainder = 100 - base * questions.length;
    setQuestions(questions.map((q, i) => ({ ...q, poin: base + (i < remainder ? 1 : 0) })));
  };

  const save = async () => {
    setError("");
    if (!form.judul_id.trim() || !form.subject_id) {
      setError("Judul dan mapel wajib diisi.");
      return;
    }
    for (const g of games) {
      try {
        JSON.parse(g.config);
      } catch {
        setError(`Config game ${g.tipe_game} bukan JSON valid.`);
        return;
      }
    }
    setSaving(true);
    const supabase = createClient();

    let moduleId = id;
    if (isNew) {
      const { data, error: err } = await supabase.from("modules").insert(form).select().single();
      if (err || !data) {
        setError(err?.message ?? "Gagal menyimpan");
        setSaving(false);
        return;
      }
      moduleId = data.id;
    } else {
      await supabase.from("modules").update(form).eq("id", id);
      await supabase.from("questions").delete().eq("module_id", id);
      await supabase.from("games").delete().eq("module_id", id);
    }

    if (questions.length) {
      await supabase.from("questions").insert(
        questions.map((q, i) => ({
          module_id: moduleId,
          tipe: q.tipe,
          pertanyaan_id: q.pertanyaan_id,
          pertanyaan_en: q.pertanyaan_en,
          opsi: q.tipe === "pg" ? { id: q.opsi_id, en: q.opsi_en } : null,
          jawaban_benar: q.jawaban_benar || null,
          poin: q.poin,
          urutan: i + 1,
          gambar_url: q.gambar_url,
        }))
      );
    }
    if (games.length) {
      await supabase.from("games").insert(
        games.map((g) => ({
          module_id: moduleId,
          tipe_game: g.tipe_game,
          config: JSON.parse(g.config),
        }))
      );
    }
    setSaving(false);
    router.push("/admin/modules");
  };

  const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-extrabold text-slate-800">
        {isNew ? "+ Modul Baru" : "✏️ Edit Modul"}
      </h1>

      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-700">Info Modul</h2>
            <button
              type="button"
              onClick={translateAll}
              disabled={translating !== null || !form.judul_id}
              title="Terjemahkan judul, materi, dan semua soal ke English — hasilnya tetap bisa diedit"
              className="rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-semibold text-violet-600 hover:bg-violet-200 disabled:opacity-50"
            >
              {translating === "all" ? "⏳ Menerjemahkan..." : "🌐 Terjemahkan Semua ke English"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} placeholder="Judul (Indonesia)" value={form.judul_id}
              onChange={(e) => setForm({ ...form, judul_id: e.target.value })} />
            <div className="flex gap-2">
              <input className={input} placeholder="Title (English)" value={form.judul_en}
                onChange={(e) => setForm({ ...form, judul_en: e.target.value })} />
              <button type="button" onClick={translateJudul} title="Terjemahkan judul"
                disabled={translating !== null || !form.judul_id}
                className="shrink-0 rounded-lg bg-violet-50 px-2.5 text-sm font-semibold text-violet-500 hover:bg-violet-100 disabled:opacity-50">
                {translating === "judul" ? "⏳" : "🌐"}
              </button>
            </div>
            <select className={input} value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.ikon} {s.nama_id}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <select className={input} value={form.tingkat_kelas}
                onChange={(e) => setForm({ ...form, tingkat_kelas: +e.target.value })}>
                {[1, 2, 3, 4, 5, 6].map((k) => (
                  <option key={k} value={k}>{t("grade")} {k}</option>
                ))}
              </select>
              <input type="number" className={input} title="Urutan" value={form.urutan}
                onChange={(e) => setForm({ ...form, urutan: +e.target.value })} />
              <select className={input} value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })}>
                <option value="draft">📄 {t("draft")}</option>
                <option value="published">✅ {t("published")}</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Materi (Indonesia) — # judul, - daftar, **tebal**, gambar otomatis jadi ![gambar](url)
            </span>
            <ImagePickButton
              folder="materi"
              onUploaded={(url) =>
                setForm((f) => ({ ...f, materi_id: `${f.materi_id}\n\n![gambar](${url})\n` }))
              }
            />
          </div>
          <textarea className={`${input} mt-1 min-h-36 font-mono text-sm`} value={form.materi_id}
            placeholder={"Materi (Indonesia) — markdown sederhana: # judul, - daftar, **tebal**"}
            onChange={(e) => setForm({ ...form, materi_id: e.target.value })}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              const file = e.dataTransfer.files?.[0];
              if (!file?.type.startsWith("image/")) return;
              e.preventDefault();
              const { uploadImage } = await import("@/lib/upload");
              try {
                const url = await uploadImage(file, "materi");
                setForm((f) => ({ ...f, materi_id: `${f.materi_id}\n\n![gambar](${url})\n` }));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Gagal upload gambar");
              }
            }} />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Lesson content (English)</span>
            <button type="button" onClick={translateMateri} title="Terjemahkan materi"
              disabled={translating !== null || !form.materi_id}
              className="rounded-lg bg-violet-50 px-2.5 py-1 text-sm font-semibold text-violet-500 hover:bg-violet-100 disabled:opacity-50">
              {translating === "materi" ? "⏳ Menerjemahkan..." : "🌐 Terjemahkan materi"}
            </button>
          </div>
          <textarea className={`${input} mt-1 min-h-36 font-mono text-sm`} value={form.materi_en}
            placeholder="Lesson content (English)"
            onChange={(e) => setForm({ ...form, materi_en: e.target.value })} />
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          {/* kalkulator bobot real-time: total semua soal harus 100 */}
          {questions.length > 0 && (
            <div
              className={`mb-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${
                totalPoin === 100
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <span className="font-display text-lg font-extrabold">
                {totalPoin === 100 ? "✅" : "⚠️"} {t("total_points")}: {totalPoin} / 100
              </span>
              {totalPoin !== 100 && (
                <>
                  <span className="text-sm font-semibold">
                    {totalPoin < 100
                      ? `Kurang ${100 - totalPoin} poin`
                      : `Kelebihan ${totalPoin - 100} poin`}{" "}
                    — nilai siswa tetap dinormalisasi ke 100, tapi sebaiknya dipaskan.
                  </span>
                  <button
                    onClick={splitEvenly}
                    className="ml-auto rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-bold text-white shadow hover:bg-amber-600"
                  >
                    ⚖️ {t("split_evenly")}
                  </button>
                </>
              )}
            </div>
          )}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-700">
              Soal ({questions.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setQuestions([...questions, { tipe: "pg", pertanyaan_id: "", pertanyaan_en: "", opsi_id: ["", "", "", ""], opsi_en: ["", "", "", ""], jawaban_benar: "0", poin: 10, gambar_url: null }])}
                className="rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-600"
              >
                + PG
              </button>
              <button
                onClick={() => setQuestions([...questions, { tipe: "esai", pertanyaan_id: "", pertanyaan_en: "", opsi_id: [], opsi_en: [], jawaban_benar: "", poin: 15, gambar_url: null }])}
                className="rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-semibold text-violet-600"
              >
                + Esai
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${q.tipe === "pg" ? "bg-sky-100 text-sky-600" : "bg-violet-100 text-violet-600"}`}>
                    {qi + 1}. {q.tipe.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => translateQuestion(qi)} title="Terjemahkan soal & opsi"
                      disabled={translating !== null || !q.pertanyaan_id}
                      className="rounded-lg bg-violet-50 px-2 py-1 text-sm font-semibold text-violet-500 hover:bg-violet-100 disabled:opacity-50">
                      {translating === `q${qi}` ? "⏳" : "🌐"}
                    </button>
                    <input type="number" className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm" title="Poin" value={q.poin}
                      onChange={(e) => setQuestions(questions.map((x, i) => (i === qi ? { ...x, poin: +e.target.value } : x)))} />
                    <button onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}
                      className="text-red-400 hover:text-red-600">🗑️</button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={input} placeholder="Pertanyaan (ID)" value={q.pertanyaan_id}
                    onChange={(e) => setQuestions(questions.map((x, i) => (i === qi ? { ...x, pertanyaan_id: e.target.value } : x)))} />
                  <input className={input} placeholder="Question (EN)" value={q.pertanyaan_en}
                    onChange={(e) => setQuestions(questions.map((x, i) => (i === qi ? { ...x, pertanyaan_en: e.target.value } : x)))} />
                </div>
                <QuestionImageControl
                  url={q.gambar_url}
                  folder="soal"
                  onChange={(url) => setQuestions(questions.map((x, i) => (i === qi ? { ...x, gambar_url: url } : x)))}
                />
                {q.tipe === "pg" ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {q.opsi_id.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`benar-${qi}`} checked={q.jawaban_benar === String(oi)} title="Jawaban benar"
                          onChange={() => setQuestions(questions.map((x, i) => (i === qi ? { ...x, jawaban_benar: String(oi) } : x)))} />
                        <input className={input} placeholder={`Opsi ${["A", "B", "C", "D"][oi]} (ID)`} value={opt}
                          onChange={(e) => setQuestions(questions.map((x, i) => (i === qi ? { ...x, opsi_id: x.opsi_id.map((o, j) => (j === oi ? e.target.value : o)) } : x)))} />
                        <input className={input} placeholder={`(EN)`} value={q.opsi_en[oi] ?? ""}
                          onChange={(e) => setQuestions(questions.map((x, i) => (i === qi ? { ...x, opsi_en: x.opsi_en.map((o, j) => (j === oi ? e.target.value : o)) } : x)))} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <input className={`${input} mt-2`} value={q.jawaban_benar}
                    placeholder="Jawaban benar (kosongkan bila dinilai manual oleh admin)"
                    onChange={(e) => setQuestions(questions.map((x, i) => (i === qi ? { ...x, jawaban_benar: e.target.value } : x)))} />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-700">Game ({games.length})</h2>
            <button
              onClick={() =>
                setGames([
                  ...games,
                  {
                    tipe_game: "tebak_huruf",
                    config: JSON.stringify(GAME_REGISTRY.tebak_huruf.defaultConfig, null, 2),
                  },
                ])
              }
              className="rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-600"
            >
              + Game
            </button>
          </div>
          <div className="space-y-3">
            {games.map((g, gi) => {
              let parsed: Record<string, unknown> | null = null;
              try {
                parsed = JSON.parse(g.config);
              } catch {
                parsed = null; // JSON rusak → tampilkan editor mentah saja
              }
              return (
                <div key={gi} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <select value={g.tipe_game} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-semibold"
                      onChange={(e) => {
                        const tg = e.target.value as GameType;
                        // ganti tipe → mulai dari config contoh tipe tsb
                        setGames(games.map((x, i) => (i === gi
                          ? { ...x, tipe_game: tg, config: JSON.stringify(GAME_REGISTRY[tg].defaultConfig, null, 2) }
                          : x)));
                      }}>
                      {GAME_TYPES.map((tg) => (
                        <option key={tg} value={tg}>{GAME_REGISTRY[tg].icon} {tg}</option>
                      ))}
                    </select>
                    <button onClick={() => setGames(games.filter((_, i) => i !== gi))}
                      className="text-red-400 hover:text-red-600">🗑️</button>
                  </div>

                  {parsed ? (
                    <GameConfigEditor
                      tipe={g.tipe_game}
                      config={parsed}
                      onChange={(cfg) =>
                        setGames(games.map((x, i) =>
                          i === gi ? { ...x, config: JSON.stringify(cfg, null, 2) } : x))
                      }
                    />
                  ) : (
                    <p className="mb-2 text-xs font-semibold text-red-500">
                      ⚠️ JSON tidak valid — perbaiki lewat editor mentah di bawah.
                    </p>
                  )}

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-400">
                      ⚙️ JSON mentah (lanjutan)
                    </summary>
                    <textarea className={`${input} mt-2 min-h-24 font-mono text-xs`} value={g.config}
                      onChange={(e) => setGames(games.map((x, i) => (i === gi ? { ...x, config: e.target.value } : x)))} />
                  </details>
                </div>
              );
            })}
          </div>
        </section>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2 font-semibold text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pb-8">
          <button onClick={() => router.back()} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">
            {t("cancel")}
          </button>
          <button onClick={save} disabled={saving}
            className="rounded-xl bg-sky-500 px-6 py-2 font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50">
            {saving ? "..." : `💾 ${t("save")}`}
          </button>
        </div>
      </div>
    </div>
  );
}
