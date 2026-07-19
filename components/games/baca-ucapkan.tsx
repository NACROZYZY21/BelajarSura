"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";
import { useI18n } from "@/lib/i18n";

interface Item {
  teks_id: string;
  teks_en: string;
}

type SR = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

function makeRecognition(): SR | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);

/** Game 6: Baca & Ucapkan — baca kalimat dengan suara, dinilai longgar (≥70% kata). */
export function BacaUcapkan({
  config,
  onFinish,
}: {
  config: { items?: Item[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const { t, lang, pick } = useI18n();
  const items = config.items?.length ? config.items : [{ teks_id: "Aku suka belajar", teks_en: "I love learning" }];
  const [idx, setIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [wordResults, setWordResults] = useState<{ word: string; hit: boolean }[] | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const recRef = useRef<SR | null>(null);

  const target = pick(items[idx].teks_id, items[idx].teks_en);

  useEffect(() => () => recRef.current?.stop(), []);

  if (!speechSupported()) {
    return (
      <div className="rounded-3xl bg-sunny-50 p-8 text-center">
        <span className="text-5xl">🎤</span>
        <p className="mt-3 font-display text-lg font-bold text-slate-600">{t("mic_needed")}</p>
      </div>
    );
  }

  const listen = () => {
    setErrMsg("");
    setWordResults(null);
    setPassed(null);
    const rec = makeRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.lang = lang === "id" ? "id-ID" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    setListening(true);
    rec.onresult = (e) => {
      const heard = normalize(e.results[0][0].transcript);
      const targetWords = normalize(target);
      const pool = [...heard];
      const results = targetWords.map((w) => {
        const i = pool.indexOf(w);
        if (i >= 0) {
          pool.splice(i, 1);
          return { word: w, hit: true };
        }
        return { word: w, hit: false };
      });
      const ratio = results.filter((r) => r.hit).length / targetWords.length;
      const ok = ratio >= 0.7;
      setWordResults(results);
      setPassed(ok);
      if (ok) {
        sfx.correct();
        burstConfetti();
        setScore((s) => s + 1);
      } else {
        sfx.wrong();
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      setErrMsg(
        e.error === "not-allowed"
          ? "Izinkan mikrofon dulu ya! 🎤"
          : "Suara tidak terdengar, coba lagi ya!"
      );
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const next = () => {
    if (idx + 1 >= items.length) onFinish(score, items.length);
    else {
      setIdx(idx + 1);
      setWordResults(null);
      setPassed(null);
    }
  };

  return (
    <div className="text-center">
      <p className="mb-2 font-display font-bold text-slate-500">
        {idx + 1} / {items.length}
      </p>
      <div className="mx-auto mb-5 max-w-md rounded-3xl bg-white/90 p-6 shadow-inner">
        {wordResults ? (
          <p className="font-display text-2xl font-extrabold leading-relaxed">
            {wordResults.map((r, i) => (
              <span key={i} className={r.hit ? "text-mint-500" : "text-slate-300"}>
                {r.word}{" "}
              </span>
            ))}
          </p>
        ) : (
          <p className="font-display text-2xl font-extrabold text-slate-700">{target}</p>
        )}
      </div>

      {passed === null && (
        <>
          <motion.button
            onClick={listen}
            disabled={listening}
            whileTap={{ scale: 0.9 }}
            animate={listening ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.8, repeat: listening ? Infinity : 0 }}
            className={`btn-squish mx-auto flex h-24 w-24 items-center justify-center rounded-full text-5xl shadow-xl ${
              listening ? "bg-berry-400" : "bg-gradient-to-br from-sky-300 to-sky-500"
            }`}
            aria-label="Mulai bicara"
          >
            🎤
          </motion.button>
          <p className="mt-3 text-sm font-bold text-slate-500">
            {listening ? "🔴 Mendengarkan..." : t("listen_first")}
          </p>
          {errMsg && <p className="mt-2 font-bold text-tangerine-500">{errMsg}</p>}
        </>
      )}

      {passed !== null && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <p className="mb-4 font-display text-xl font-extrabold">
            {passed ? (
              <span className="text-mint-500">{t("correct")} 🎉</span>
            ) : (
              <span className="text-tangerine-500">{t("wrong")}</span>
            )}
          </p>
          <div className="flex justify-center gap-3">
            {!passed && (
              <button
                onClick={listen}
                className="btn-squish rounded-2xl bg-sky-100 px-5 py-3 font-display font-extrabold text-sky-600"
              >
                🎤 {t("try_again")}
              </button>
            )}
            <button
              onClick={next}
              className="btn-squish rounded-2xl bg-gradient-to-r from-mint-400 to-sky-400 px-5 py-3 font-display font-extrabold text-white shadow"
            >
              {t("next")} →
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
