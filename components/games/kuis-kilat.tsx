"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";
import { useI18n } from "@/lib/i18n";

interface Item {
  soal_id: string;
  soal_en: string;
  opsi_id: string[];
  opsi_en: string[];
  benar: number;
}

/** Game 9: Kuis Kilat — jawab sebelum waktu habis; cepat = bonus poin. */
export function KuisKilat({
  config,
  onFinish,
}: {
  config: { waktu_per_soal?: number; items?: Item[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const { lang, pick } = useI18n();
  const items = config.items?.length
    ? config.items
    : [{ soal_id: "1 + 1 = ?", soal_en: "1 + 1 = ?", opsi_id: ["1", "2", "3", "4"], opsi_en: ["1", "2", "3", "4"], benar: 1 }];
  const duration = (config.waktu_per_soal ?? 10) * 1000;

  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const item = items[idx];
  const maxScore = items.length * 2; // 1 benar + 1 bonus cepat

  useEffect(() => {
    setTimeLeft(duration);
    setPicked(null);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const left = duration - (Date.now() - start);
      if (left <= 0) {
        clearInterval(timerRef.current!);
        setTimeLeft(0);
        setPicked(-1); // waktu habis
        sfx.wrong();
        setTimeout(() => advance(0), 1100);
      } else setTimeLeft(left);
    }, 100);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const advance = (gained: number) => {
    setScore((s) => {
      const ns = s + gained;
      if (idx + 1 >= items.length) setTimeout(() => onFinish(ns, maxScore), 0);
      return ns;
    });
    if (idx + 1 < items.length) setIdx(idx + 1);
  };

  const answer = (i: number) => {
    if (picked !== null) return;
    clearInterval(timerRef.current!);
    setPicked(i);
    const benar = i === item.benar;
    if (benar) {
      sfx.correct();
      burstConfetti();
      const bonus = timeLeft > duration / 2 ? 1 : 0; // jawab cepat = bonus
      setTimeout(() => advance(1 + bonus), 1100);
    } else {
      sfx.wrong();
      setTimeout(() => advance(0), 1100);
    }
  };

  const pctLeft = (timeLeft / duration) * 100;

  return (
    <div className="text-center">
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="font-display font-bold text-slate-500">
          {idx + 1} / {items.length}
        </p>
        <p className="font-display font-extrabold text-tangerine-500">⚡ {score}</p>
      </div>

      {/* bar countdown */}
      <div className="mb-5 h-3.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${
            pctLeft > 50 ? "bg-mint-400" : pctLeft > 20 ? "bg-sunny-400" : "bg-berry-400"
          }`}
          style={{ width: `${pctLeft}%` }}
        />
      </div>

      <motion.h3
        key={idx}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 font-display text-2xl font-extrabold text-slate-700"
      >
        {pick(item.soal_id, item.soal_en)}
      </motion.h3>

      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        {(lang === "id" ? item.opsi_id : item.opsi_en).map((opt, i) => {
          let cls = "bg-white text-slate-700";
          if (picked !== null && i === item.benar) cls = "bg-mint-400 text-white animate-pop";
          else if (picked === i) cls = "bg-berry-400 text-white animate-shake";
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() => answer(i)}
              disabled={picked !== null}
              className={`btn-squish rounded-2xl px-3 py-4 font-display text-xl font-extrabold shadow-lg ${cls}`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
      {picked === -1 && (
        <p className="mt-4 font-display font-extrabold text-tangerine-500">⏰ Waktu habis!</p>
      )}
    </div>
  );
}
