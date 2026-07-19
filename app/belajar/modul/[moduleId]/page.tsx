"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useStudent } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Mascot, MascotLoading } from "@/components/mascot";
import { RichText } from "@/components/rich-text";
import { TtsButton } from "@/components/tts-button";
import { GamePlayer } from "@/components/games/game-player";
import { sfx } from "@/lib/sfx";
import { burstConfetti, bigCelebration, starPop } from "@/lib/confetti";
import { starsFromScore } from "@/lib/gamification";
import type { EssaySubmission, Game, Module, Question, StudentProgress } from "@/lib/types";

type Step = "ringkasan" | "materi" | "kuis" | "esai" | "game" | "hasil";
type Answer = { question_id: string; jawaban: string; benar: boolean | null };

export default function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = use(params);
  const { profile, addXp, awardBadge, refresh } = useStudent();
  const { t, lang, pick } = useI18n();

  const [mod, setMod] = useState<Module | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [step, setStep] = useState<Step>("materi");
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"benar" | "salah" | null>(null);
  const [essayInput, setEssayInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ skor: number; bintang: number; xp: number } | null>(null);
  const [shownStars, setShownStars] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [prevProgress, setPrevProgress] = useState<StudentProgress | null>(null);
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);

  const pgQuestions = useMemo(() => questions.filter((q) => q.tipe === "pg"), [questions]);
  const esaiQuestions = useMemo(() => questions.filter((q) => q.tipe === "esai"), [questions]);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("modules").select().eq("id", moduleId).single(),
      supabase.from("questions").select().eq("module_id", moduleId).order("urutan"),
      supabase.from("games").select().eq("module_id", moduleId),
      supabase
        .from("student_progress")
        .select()
        .eq("student_id", profile.id)
        .eq("module_id", moduleId)
        .maybeSingle(),
      supabase
        .from("essay_submissions")
        .select()
        .eq("student_id", profile.id)
        .eq("module_id", moduleId),
    ]).then(([m, q, g, p, es]) => {
      setMod(m.data as Module);
      setQuestions((q.data as Question[]) ?? []);
      setGames((g.data as Game[]) ?? []);
      const prog = p.data as StudentProgress | null;
      setPrevProgress(prog);
      setSubmissions((es.data as EssaySubmission[]) ?? []);
      // modul yang sudah selesai dibuka lagi → tampilkan ringkasan nilai dulu
      if (prog?.status === "selesai") setStep("ringkasan");
    });
  }, [moduleId, profile]);

  // simpan hasil begitu masuk step "hasil"
  useEffect(() => {
    if (step === "hasil" && !result && !saving && mod && profile) {
      finishModule(answers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mod, profile]);

  if (!mod || !profile) return <MascotLoading label={t("loading")} />;

  const currentPg = pgQuestions[qIdx];
  const currentEsai = esaiQuestions[qIdx];

  const answerPg = (optIdx: number) => {
    if (feedback) return;
    setPicked(optIdx);
    const benar = String(optIdx) === currentPg.jawaban_benar;
    setFeedback(benar ? "benar" : "salah");
    if (benar) {
      sfx.correct();
      burstConfetti();
    } else {
      sfx.wrong();
    }
    setAnswers((a) => [
      ...a,
      { question_id: currentPg.id, jawaban: String(optIdx), benar },
    ]);
    setTimeout(() => {
      setFeedback(null);
      setPicked(null);
      if (qIdx + 1 < pgQuestions.length) setQIdx(qIdx + 1);
      else {
        setQIdx(0);
        setStep(esaiQuestions.length ? "esai" : games.length ? "game" : "hasil");
      }
    }, 1600);
  };

  const answerEsai = () => {
    // Fase 2: esai TIDAK dinilai otomatis — masuk antrian review guru
    sfx.click();
    setAnswers((a) => [...a, { question_id: currentEsai.id, jawaban: essayInput.trim(), benar: null }]);
    setEssayInput("");
    if (qIdx + 1 < esaiQuestions.length) setQIdx(qIdx + 1);
    else setStep(games.length ? "game" : "hasil");
  };

  const finishModule = async (allAnswers: Answer[]) => {
    if (saving || result) return;
    setSaving(true);
    // total bobot modul (idealnya 100 — dinormalisasi bila belum)
    const totalAll = questions.reduce((s, q) => s + q.poin, 0) || 1;
    const totalPg = pgQuestions.reduce((s, q) => s + q.poin, 0);
    const poinPg = allAnswers.reduce((s, a) => {
      const q = pgQuestions.find((x) => x.id === a.question_id);
      return s + (a.benar && q ? q.poin : 0);
    }, 0);
    // skor tersimpan = porsi PG saja; poin esai ditambahkan saat guru ACC
    const pct = Math.round((poinPg / totalAll) * 100);
    // bintang sementara dinilai dari porsi PG agar adil selama esai menunggu review
    const bintang = starsFromScore(totalPg ? Math.round((poinPg / totalPg) * 100) : 100);
    const xpGain = poinPg + bintang * 5;

    const supabase = createClient();
    await supabase.from("student_progress").upsert(
      {
        student_id: profile.id,
        module_id: moduleId,
        status: "selesai",
        skor: pct,
        bintang,
        poin_pg: poinPg,
        jawaban: allAnswers,
        selesai_pada: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,module_id" }
    );

    // jawaban esai → antrian review guru
    const essayAnswers = allAnswers.filter((a) =>
      esaiQuestions.some((q) => q.id === a.question_id)
    );
    if (essayAnswers.length) {
      await supabase.from("essay_submissions").upsert(
        essayAnswers.map((a) => ({
          student_id: profile.id,
          module_id: moduleId,
          question_id: a.question_id,
          jawaban: a.jawaban,
          status_review: "menunggu_review",
          poin_diberikan: null,
          komentar_admin: null,
          direview_pada: null,
        })),
        { onConflict: "student_id,question_id" }
      );
    }

    setResult({ skor: pct, bintang, xp: xpGain });
    setSaving(false);

    // bintang muncul satu per satu
    for (let i = 1; i <= bintang; i++) {
      setTimeout(() => {
        setShownStars(i);
        sfx.star();
        starPop(0.35 + i * 0.15, 0.35);
      }, 500 * i);
    }

    const { leveledUp, newLevel } = await addXp(xpGain);
    awardBadge("first_module");
    if (bintang === 3) awardBadge("star_collector");
    if (leveledUp) {
      setTimeout(() => {
        setLevelUp(newLevel);
        sfx.levelUp();
        bigCelebration();
      }, 1800);
    }
    refresh();
  };

  const goResult = () => setStep("hasil");

  const restart = () => {
    setAnswers([]);
    setQIdx(0);
    setResult(null);
    setShownStars(0);
    setStep("materi");
  };

  const stepTitles: Record<Step, string> = {
    ringkasan: `🏆 ${t("result")}`,
    materi: `📖 ${t("material")}`,
    kuis: `❓ ${t("quiz")}`,
    esai: `✏️ ${t("essay")}`,
    game: `🎮 Game`,
    hasil: `🏆 ${t("result")}`,
  };

  return (
    <div className="relative">
      {/* overlay naik level */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sky-500/80 backdrop-blur"
            onClick={() => setLevelUp(null)}
          >
            <motion.span
              initial={{ scale: 0, rotate: -540 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5, duration: 1 }}
              className="text-8xl"
            >
              🏆
            </motion.span>
            <motion.h2
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 font-display text-5xl font-extrabold text-white drop-shadow-lg"
            >
              {t("level_up")}
            </motion.h2>
            <p className="mt-2 font-display text-2xl font-bold text-sunny-300">
              {t("level")} {levelUp} 🎉
            </p>
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="mt-6 text-6xl"
            >
              🐥
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/belajar/mapel/${mod.subject_id}`}
          className="btn-squish text-2xl"
          aria-label={t("back")}
        >
          ⬅️
        </Link>
        <h1 className="font-display text-lg font-extrabold text-slate-700">
          {pick(mod.judul_id, mod.judul_en)}
        </h1>
        <span className="rounded-full bg-white/80 px-3 py-1 font-display text-sm font-bold text-sky-600 shadow">
          {stepTitles[step]}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* ---------- RINGKASAN (modul sudah pernah selesai) ---------- */}
        {step === "ringkasan" && prevProgress && (
          <motion.section
            key="ringkasan"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -40 }}
            className="rounded-3xl bg-white/90 p-6 shadow-lg"
          >
            <div className="text-center">
              <p className="text-4xl">
                {"⭐".repeat(prevProgress.bintang)}
                {"☆".repeat(3 - prevProgress.bintang)}
              </p>
              <p className="mt-2 font-display text-xl font-bold text-slate-600">
                {t("your_score")}:{" "}
                <span className="text-3xl text-sky-600">{prevProgress.skor}</span>
                <span className="text-slate-400"> / 100</span>
              </p>
            </div>

            {esaiQuestions.length > 0 && (
              <div className="mt-5 space-y-3">
                {esaiQuestions.map((q) => {
                  const sub = submissions.find((s) => s.question_id === q.id);
                  if (!sub) return null;
                  const graded = sub.status_review === "sudah_dinilai";
                  return (
                    <div
                      key={q.id}
                      className={`rounded-2xl p-4 ${graded ? "bg-mint-50" : "bg-sunny-50"}`}
                    >
                      <p className="font-display font-bold text-slate-700">
                        ✏️ {pick(q.pertanyaan_id, q.pertanyaan_en)}
                      </p>
                      <p className="mt-1 rounded-xl bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-600">
                        &ldquo;{sub.jawaban}&rdquo;
                      </p>
                      {graded ? (
                        <div className="mt-2">
                          <span className="rounded-full bg-mint-400 px-3 py-1 font-display text-sm font-extrabold text-white">
                            +{sub.poin_diberikan ?? 0} {t("points")} ✅
                          </span>
                          {sub.komentar_admin && (
                            <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-600">
                              💬 {t("teacher_comment")}: {sub.komentar_admin}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 font-bold text-tangerine-500">{t("essay_pending")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={restart}
                className="btn-squish rounded-2xl bg-sky-100 px-6 py-3 font-display text-lg font-extrabold text-sky-600"
              >
                🔁 {t("redo")}
              </button>
              <Link
                href={`/belajar/mapel/${mod.subject_id}`}
                className="btn-squish rounded-2xl bg-gradient-to-r from-mint-400 to-sky-400 px-6 py-3 text-center font-display text-lg font-extrabold text-white shadow-lg"
              >
                🗺️ {t("adventure_map")}
              </Link>
            </div>
          </motion.section>
        )}

        {/* ---------- MATERI ---------- */}
        {step === "materi" && (
          <motion.section
            key="materi"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="rounded-3xl bg-white/90 p-6 shadow-lg"
          >
            <div className="mb-3 flex justify-end">
              <TtsButton text={pick(mod.materi_id, mod.materi_en)} />
            </div>
            <RichText text={pick(mod.materi_id, mod.materi_en)} />
            <button
              onClick={() => {
                sfx.click();
                setStep(pgQuestions.length ? "kuis" : esaiQuestions.length ? "esai" : "hasil");
              }}
              className="btn-squish mt-6 w-full rounded-2xl bg-gradient-to-r from-mint-400 to-mint-500 py-4 font-display text-xl font-extrabold text-white shadow-lg"
            >
              {t("quiz")} 🚀
            </button>
          </motion.section>
        )}

        {/* ---------- KUIS PG ---------- */}
        {step === "kuis" && currentPg && (
          <motion.section
            key={`kuis-${qIdx}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className={`rounded-3xl bg-white/90 p-6 shadow-lg ${feedback === "salah" ? "animate-shake" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full bg-sky-100 px-3 py-1 font-display text-sm font-bold text-sky-600">
                {qIdx + 1} / {pgQuestions.length}
              </span>
              <TtsButton text={pick(currentPg.pertanyaan_id, currentPg.pertanyaan_en)} />
            </div>
            <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full bg-gradient-to-r from-sky-400 to-mint-400"
                animate={{ width: `${((qIdx + 1) / pgQuestions.length) * 100}%` }}
              />
            </div>
            <h2 className="mb-3 font-display text-2xl font-extrabold text-slate-700">
              {pick(currentPg.pertanyaan_id, currentPg.pertanyaan_en)}
            </h2>
            {currentPg.gambar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentPg.gambar_url}
                alt="gambar soal"
                className="mx-auto mb-4 max-h-56 w-auto max-w-full rounded-2xl shadow-md"
              />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(currentPg.opsi?.[lang] ?? currentPg.opsi?.id ?? []).map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = String(i) === currentPg.jawaban_benar;
                let cls = "bg-sky-50 hover:bg-sky-100 text-slate-700";
                if (feedback && isPicked && isCorrect) cls = "bg-mint-400 text-white animate-pop";
                else if (feedback && isPicked) cls = "bg-berry-400 text-white";
                else if (feedback === "salah" && isCorrect) cls = "bg-mint-100 ring-2 ring-mint-400";
                return (
                  <button
                    key={i}
                    onClick={() => answerPg(i)}
                    disabled={!!feedback}
                    className={`btn-squish rounded-2xl border-2 border-transparent px-4 py-4 text-left font-display text-xl font-bold shadow ${cls}`}
                  >
                    <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-base">
                      {["A", "B", "C", "D"][i]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 flex justify-center"
                >
                  <Mascot
                    mood={feedback === "benar" ? "cheer" : "sad"}
                    size="text-5xl"
                    message={feedback === "benar" ? t("correct") : t("wrong")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {/* ---------- ESAI / ISIAN ---------- */}
        {step === "esai" && currentEsai && (
          <motion.section
            key={`esai-${qIdx}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="rounded-3xl bg-white/90 p-6 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full bg-grape-100 px-3 py-1 font-display text-sm font-bold text-grape-500">
                ✏️ {qIdx + 1} / {esaiQuestions.length}
              </span>
              <TtsButton text={pick(currentEsai.pertanyaan_id, currentEsai.pertanyaan_en)} />
            </div>
            <h2 className="mb-3 font-display text-2xl font-extrabold text-slate-700">
              {pick(currentEsai.pertanyaan_id, currentEsai.pertanyaan_en)}
            </h2>
            {currentEsai.gambar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentEsai.gambar_url}
                alt="gambar soal"
                className="mx-auto mb-4 max-h-56 w-auto max-w-full rounded-2xl shadow-md"
              />
            )}
            <input
              value={essayInput}
              onChange={(e) => setEssayInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && essayInput.trim() && answerEsai()}
              placeholder="Tulis jawabanmu di sini... ✍️"
              className="w-full rounded-2xl border-2 border-grape-100 bg-grape-100/30 px-4 py-4 text-xl font-bold outline-none focus:border-grape-400"
            />
            <button
              onClick={answerEsai}
              disabled={!essayInput.trim()}
              className="btn-squish mt-4 w-full rounded-2xl bg-gradient-to-r from-grape-400 to-berry-400 py-4 font-display text-xl font-extrabold text-white shadow-lg disabled:opacity-50"
            >
              {qIdx + 1 < esaiQuestions.length ? t("next") : t("finish")} ✨
            </button>
          </motion.section>
        )}

        {/* ---------- GAME MODUL ---------- */}
        {step === "game" && games[0] && (
          <motion.section
            key="game"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
          >
            <GamePlayer game={games[0]} onDone={goResult} />
          </motion.section>
        )}

        {/* ---------- HASIL ---------- */}
        {step === "hasil" && (
          <motion.section
            key="hasil"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-white/90 p-8 text-center shadow-lg"
          >
            {!result ? (
              <MascotLoading label={t("loading")} />
            ) : (
              <>
                <h2 className="font-display text-3xl font-extrabold text-slate-700">
                  {t("well_done")} 🎉
                </h2>
                <div className="my-5 flex justify-center gap-2 text-6xl">
                  {[1, 2, 3].map((s) => (
                    <motion.span
                      key={s}
                      initial={{ scale: 0, rotate: -30 }}
                      animate={
                        shownStars >= s ? { scale: 1, rotate: 0 } : { scale: 0.9, rotate: 0 }
                      }
                      transition={{ type: "spring", bounce: 0.6 }}
                      className={shownStars >= s ? "" : "opacity-30 grayscale"}
                    >
                      ⭐
                    </motion.span>
                  ))}
                </div>
                <p className="font-display text-xl font-bold text-slate-600">
                  {t("your_score")}: <span className="text-sky-600">{result.skor}</span>
                  <span className="text-slate-400"> / 100</span>
                </p>
                <p className="mt-1 inline-block rounded-full bg-sunny-100 px-4 py-1.5 font-display text-lg font-extrabold text-tangerine-500">
                  +{result.xp} XP ✨
                </p>
                {esaiQuestions.length > 0 && (
                  <p className="mt-4 rounded-2xl bg-sky-50 p-3 font-bold text-sky-600">
                    {t("essay_pending")}
                  </p>
                )}
                {result.bintang <= 1 && (
                  <p className="mt-4 rounded-2xl bg-tangerine-100 p-3 font-bold text-tangerine-500">
                    💪 {t("remedial_hint")}
                  </p>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={restart}
                    className="btn-squish rounded-2xl bg-sky-100 px-6 py-3 font-display text-lg font-extrabold text-sky-600"
                  >
                    🔁 {t("practice_again")}
                  </button>
                  <Link
                    href={`/belajar/mapel/${mod.subject_id}`}
                    className="btn-squish rounded-2xl bg-gradient-to-r from-mint-400 to-sky-400 px-6 py-3 font-display text-lg font-extrabold text-white shadow-lg"
                  >
                    🗺️ {t("adventure_map")}
                  </Link>
                </div>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
