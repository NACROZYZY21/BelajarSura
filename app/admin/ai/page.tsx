"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { AiMessage, ModuleDraft, Subject } from "@/lib/types";

export default function AiAgentPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"kreator" | "analis">("kreator");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [savingDraft, setSavingDraft] = useState<ModuleDraft | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient()
      .from("subjects")
      .select()
      .order("urutan")
      .then(({ data }) => {
        setSubjects((data as Subject[]) ?? []);
        if (data?.[0]) setDraftSubject(data[0].id);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const switchMode = (m: "kreator" | "analis") => {
    setMode(m);
    setMessages([]);
    setConvId(undefined);
    setError("");
  };

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    setError("");
    const next: AiMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          conversationId: convId,
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI error");
      setConvId(json.conversationId ?? convId);
      setMessages([...next, { role: "model", content: json.text, draft: json.draft }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghubungi AI");
      setMessages(next);
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!savingDraft || !draftSubject) return;
    const supabase = createClient();
    const { data: mod, error: err } = await supabase
      .from("modules")
      .insert({
        subject_id: draftSubject,
        tingkat_kelas: savingDraft.tingkat_kelas || 1,
        judul_id: savingDraft.judul_id,
        judul_en: savingDraft.judul_en ?? "",
        materi_id: savingDraft.materi_id ?? "",
        materi_en: savingDraft.materi_en ?? "",
        status: "draft",
        dibuat_oleh_ai: true,
        urutan: 99,
      })
      .select()
      .single();
    if (err || !mod) {
      setError(err?.message ?? "Gagal menyimpan draft");
      return;
    }
    const rows = [
      ...(savingDraft.soal_pg ?? []).map((q, i) => ({
        module_id: mod.id,
        tipe: "pg",
        pertanyaan_id: q.pertanyaan_id,
        pertanyaan_en: q.pertanyaan_en ?? "",
        opsi: { id: q.opsi_id, en: q.opsi_en ?? q.opsi_id },
        jawaban_benar: String(q.jawaban_benar),
        poin: 10,
        urutan: i + 1,
      })),
      ...(savingDraft.soal_esai ?? []).map((q, i) => ({
        module_id: mod.id,
        tipe: "esai",
        pertanyaan_id: q.pertanyaan_id,
        pertanyaan_en: q.pertanyaan_en ?? "",
        opsi: null,
        jawaban_benar: q.jawaban_contoh || null,
        poin: 15,
        urutan: 100 + i,
      })),
    ];
    if (rows.length) await supabase.from("questions").insert(rows);

    // konten game hasil AI (bila ada) — admin bisa edit manual di editor modul
    const knownTypes = [
      "tebak_huruf", "susun_suku_kata", "cocokkan", "hitung_benda", "memory",
      "baca_ucapkan", "tebak_kata_gambar", "urutkan_angka", "kuis_kilat",
      "lengkapi_kalimat", "tebak_bunyi",
    ];
    const gameRows = (savingDraft.konten_game ?? [])
      .filter((g) => knownTypes.includes(g.tipe_game) && g.config)
      .map((g) => ({ module_id: mod.id, tipe_game: g.tipe_game, config: g.config }));
    if (gameRows.length) await supabase.from("games").insert(gameRows);

    setSavingDraft(null);
    alert(
      `✅ Draft modul "${mod.judul_id}" tersimpan${gameRows.length ? ` + ${gameRows.length} game` : ""}! Buka menu Modul untuk review & publish.`
    );
  };

  const suggestions =
    mode === "kreator"
      ? [
          "Buatkan modul perkalian kelas 2 dengan 10 soal PG dan 3 esai",
          "Ide mapel baru untuk kelas 1 apa saja yang cocok?",
        ]
      : [
          "Topik apa yang paling banyak salah dijawab siswa?",
          "Siswa mana yang butuh perhatian khusus?",
        ];

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col lg:h-[calc(100vh-5rem)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">🤖 {t("ai_agent")}</h1>
        <div className="flex rounded-xl bg-white p-1 shadow-sm">
          {(
            [
              ["kreator", `📝 ${t("mode_kreator")}`],
              ["analis", `📊 ${t("mode_analis")}`],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                mode === m ? "bg-sky-500 text-white shadow" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="text-5xl">{mode === "kreator" ? "📝" : "📊"}</span>
            <p className="max-w-sm text-sm font-semibold text-slate-500">
              {mode === "kreator"
                ? "Diskusikan kurikulum atau minta AI membuatkan draft modul lengkap."
                : "Tanyakan apa saja tentang data belajar siswa — AI membaca data terbaru dari database."}
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-sky-100"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {m.role === "model" && m.draft
                ? m.content.replace(/```json[\s\S]*?```/, "").trim()
                : m.content}

              {m.draft && (
                <div className="mt-3 rounded-xl border-2 border-dashed border-sky-300 bg-white p-4">
                  <p className="font-display text-base font-bold text-sky-600">
                    📦 {m.draft.judul_id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("grade")} {m.draft.tingkat_kelas} · {m.draft.soal_pg?.length ?? 0} PG ·{" "}
                    {m.draft.soal_esai?.length ?? 0} esai · game:{" "}
                    {(m.draft.saran_game ?? []).join(", ") || "-"}
                  </p>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-semibold text-slate-500">
                      Preview materi & soal
                    </summary>
                    <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2">
                      {m.draft.materi_id}
                      {"\n\n"}
                      {(m.draft.soal_pg ?? [])
                        .map(
                          (q, qi) =>
                            `${qi + 1}. ${q.pertanyaan_id}\n   ${q.opsi_id
                              .map((o, oi) => `${oi === q.jawaban_benar ? "✅" : "▫️"} ${o}`)
                              .join("  ")}`
                        )
                        .join("\n")}
                    </div>
                  </details>
                  <button
                    onClick={() => setSavingDraft(m.draft!)}
                    className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-600"
                  >
                    💾 Simpan sebagai Draft
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-slate-400">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              🤖
            </motion.span>
            <span className="text-sm font-semibold">AI sedang berpikir...</span>
          </div>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">
            ⚠️ {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder={mode === "kreator" ? "Minta AI membuat modul..." : "Tanya tentang data siswa..."}
          className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-xl bg-sky-500 px-5 font-bold text-white shadow hover:bg-sky-600 disabled:opacity-40"
        >
          ➤
        </button>
      </div>

      {/* modal pilih mapel saat simpan draft */}
      <AnimatePresence>
        {savingDraft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSavingDraft(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-3 font-display text-lg font-bold text-slate-800">
                Simpan &quot;{savingDraft.judul_id}&quot;
              </h2>
              <label className="mb-1 block text-sm font-semibold text-slate-500">
                Pilih mata pelajaran:
              </label>
              <select
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ikon} {s.nama_id}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSavingDraft(null)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={saveDraft}
                  className="rounded-xl bg-emerald-500 px-5 py-2 font-semibold text-white shadow hover:bg-emerald-600"
                >
                  💾 {t("save")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
