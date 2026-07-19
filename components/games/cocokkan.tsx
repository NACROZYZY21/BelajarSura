"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";
import { useI18n } from "@/lib/i18n";

interface Pair {
  emoji: string;
  kata_id: string;
  kata_en: string;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Game 3: Cocokkan Gambar & Kata — ketuk gambar lalu katanya. */
export function Cocokkan({
  config,
  onFinish,
}: {
  config: { pasangan?: Pair[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const { lang } = useI18n();
  const pairs = useMemo(
    () => (config.pasangan?.length ? config.pasangan : []).slice(0, 6),
    [config]
  );
  const emojis = useMemo(() => shuffle(pairs.map((p) => p.emoji)), [pairs]);
  const words = useMemo(
    () => shuffle(pairs.map((p) => (lang === "id" ? p.kata_id : p.kata_en))),
    [pairs, lang]
  );
  const [selEmoji, setSelEmoji] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);

  const wordOf = (emoji: string) => {
    const p = pairs.find((x) => x.emoji === emoji)!;
    return lang === "id" ? p.kata_id : p.kata_en;
  };

  const tapWord = (w: string) => {
    if (!selEmoji || matched.has(w)) return;
    if (wordOf(selEmoji) === w) {
      sfx.correct();
      const next = new Set(matched).add(w).add(selEmoji);
      setMatched(next);
      setSelEmoji(null);
      if (next.size === pairs.length * 2) {
        burstConfetti();
        setTimeout(
          () => onFinish(Math.max(pairs.length - misses, 0), pairs.length),
          900
        );
      }
    } else {
      sfx.wrong();
      setMisses((m) => m + 1);
      setWrongPick(w);
      setSelEmoji(null);
      setTimeout(() => setWrongPick(null), 500);
    }
  };

  return (
    <div className="mx-auto grid max-w-md grid-cols-2 gap-6">
      <div className="flex flex-col gap-3">
        {emojis.map((e) => (
          <motion.button
            key={e}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (!matched.has(e)) {
                sfx.click();
                setSelEmoji(e);
              }
            }}
            className={`btn-squish rounded-3xl py-4 text-5xl shadow-lg ${
              matched.has(e)
                ? "bg-mint-100 opacity-60"
                : selEmoji === e
                  ? "bg-sunny-300 ring-4 ring-sunny-500"
                  : "bg-white"
            }`}
          >
            {e}
          </motion.button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {words.map((w) => (
          <motion.button
            key={w}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => tapWord(w)}
            className={`btn-squish rounded-3xl py-5 font-display text-xl font-extrabold shadow-lg ${
              matched.has(w)
                ? "bg-mint-400 text-white opacity-70"
                : wrongPick === w
                  ? "animate-shake bg-berry-400 text-white"
                  : "bg-white text-slate-700"
            }`}
          >
            {w}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
