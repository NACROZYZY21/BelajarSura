"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { starsFromScore } from "@/lib/gamification";
import type { EssaySubmission, Module, Profile, Question } from "@/lib/types";

interface ReviewItem extends EssaySubmission {
  siswa?: Profile;
  modul?: Module;
  soal?: Question;
}

export default function ReviewQueuePage() {
  const { t, pick } = useI18n();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [inputs, setInputs] = useState<Record<string, { poin: string; komentar: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const supabase = createClient();
    const [subs, profiles, modules, questions] = await Promise.all([
      supabase
        .from("essay_submissions")
        .select()
        .eq("status_review", "menunggu_review")
        .order("created_at"),
      supabase.from("profiles").select().eq("role", "student"),
      supabase.from("modules").select(),
      supabase.from("questions").select().eq("tipe", "esai"),
    ]);
    const ps = (profiles.data as Profile[]) ?? [];
    const ms = (modules.data as Module[]) ?? [];
    const qs = (questions.data as Question[]) ?? [];
    setItems(
      ((subs.data as EssaySubmission[]) ?? []).map((s) => ({
        ...s,
        siswa: ps.find((p) => p.id === s.student_id),
        modul: ms.find((m) => m.id === s.module_id),
        soal: qs.find((q) => q.id === s.question_id),
      }))
    );
  };

  useEffect(() => {
    load();
  }, []);

  const acc = async (item: ReviewItem) => {
    const input = inputs[item.id] ?? { poin: "", komentar: "" };
    const maxPoin = item.soal?.poin ?? 15;
    const poin = Math.max(0, Math.min(maxPoin, Number(input.poin || 0)));
    setBusy(item.id);
    const supabase = createClient();

    // 1) simpan nilai + komentar
    await supabase
      .from("essay_submissions")
      .update({
        status_review: "sudah_dinilai",
        poin_diberikan: poin,
        komentar_admin: input.komentar.trim() || null,
        direview_pada: new Date().toISOString(),
      })
      .eq("id", item.id);

    // 2) hitung ulang skor & bintang siswa untuk modul ini
    const [{ data: allQ }, { data: graded }, { data: prog }] = await Promise.all([
      supabase.from("questions").select("poin").eq("module_id", item.module_id),
      supabase
        .from("essay_submissions")
        .select("poin_diberikan")
        .eq("student_id", item.student_id)
        .eq("module_id", item.module_id)
        .eq("status_review", "sudah_dinilai"),
      supabase
        .from("student_progress")
        .select()
        .eq("student_id", item.student_id)
        .eq("module_id", item.module_id)
        .maybeSingle(),
    ]);
    const totalAll = (allQ ?? []).reduce((s, q) => s + q.poin, 0) || 1;
    const essaySum = (graded ?? []).reduce((s, g) => s + (g.poin_diberikan ?? 0), 0);
    if (prog) {
      const skor = Math.min(100, Math.round(((prog.poin_pg + essaySum) / totalAll) * 100));
      await supabase
        .from("student_progress")
        .update({ skor, bintang: starsFromScore(skor), updated_at: new Date().toISOString() })
        .eq("id", prog.id);
    }

    setBusy(null);
    setItems((prev) => prev?.filter((x) => x.id !== item.id) ?? null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold text-slate-800">
        ✏️ {t("review_queue")}
      </h1>
      <p className="mb-6 text-sm font-semibold text-slate-500">
        Beri poin & komentar, lalu ACC — nilai siswa otomatis dihitung ulang.
      </p>

      {items === null ? (
        <p className="text-slate-400">{t("loading")}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <span className="text-5xl">🎉</span>
          <p className="mt-2 font-display text-lg font-bold text-slate-600">
            Semua esai sudah direview!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {items.map((item) => {
              const maxPoin = item.soal?.poin ?? 15;
              const input = inputs[item.id] ?? { poin: "", komentar: "" };
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 60 }}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-2xl">{item.siswa?.avatar ?? "🎒"}</span>
                    <span className="font-display font-bold text-slate-800">
                      {item.siswa?.nama ?? "?"}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-500">
                      {pick(item.modul?.judul_id, item.modul?.judul_en)}
                    </span>
                    <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                      ⏳ {t("waiting_review")}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-700">
                    ❓ {pick(item.soal?.pertanyaan_id, item.soal?.pertanyaan_en)}
                  </p>
                  {item.soal?.gambar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.soal.gambar_url}
                      alt="gambar soal"
                      className="mt-2 max-h-40 w-auto rounded-xl shadow"
                    />
                  )}
                  <p className="mt-2 rounded-xl bg-sky-50 px-4 py-3 font-bold text-slate-800">
                    💬 &ldquo;{item.jawaban}&rdquo;
                  </p>
                  {item.soal?.jawaban_benar && (
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {t("answer_key_ref")}: {item.soal.jawaban_benar}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      Poin:
                      <input
                        type="number"
                        min={0}
                        max={maxPoin}
                        value={input.poin}
                        onChange={(e) =>
                          setInputs({ ...inputs, [item.id]: { ...input, poin: e.target.value } })
                        }
                        className="w-20 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400"
                      />
                      <span className="text-slate-400">/ {maxPoin}</span>
                    </label>
                    <input
                      value={input.komentar}
                      onChange={(e) =>
                        setInputs({ ...inputs, [item.id]: { ...input, komentar: e.target.value } })
                      }
                      placeholder="Komentar singkat untuk siswa (opsional)"
                      className="min-w-48 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                    />
                    <button
                      onClick={() => acc(item)}
                      disabled={busy === item.id || input.poin === ""}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {busy === item.id ? "..." : t("acc_save")}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
