"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";
import { useI18n } from "@/lib/i18n";

const ROUNDS = 8;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Game 1: Tebak Huruf — dengar suara, pilih huruf yang benar. */
export function TebakHuruf({
  config,
  onFinish,
}: {
  config: { huruf?: string[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const { t } = useI18n();
  const pool = useMemo(
    () => (config.huruf?.length ? config.huruf : ["a", "b", "c", "d", "e"]),
    [config]
  );
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const newRound = () => {
    const tgt = pool[Math.floor(Math.random() * pool.length)];
    const wrong = shuffle(pool.filter((h) => h !== tgt)).slice(0, 3);
    setTarget(tgt);
    setOptions(shuffle([tgt, ...wrong]));
    setPicked(null);
    setTimeout(() => speak(tgt, "id"), 400);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(newRound, []);

  const answer = (h: string) => {
    if (picked) return;
    setPicked(h);
    const benar = h === target;
    if (benar) {
      sfx.correct();
      burstConfetti();
      setCorrect((c) => c + 1);
    } else sfx.wrong();
    setTimeout(() => {
      if (round + 1 >= ROUNDS) onFinish(correct + (benar ? 1 : 0), ROUNDS);
      else {
        setRound(round + 1);
        newRound();
      }
    }, 1200);
  };

  return (
    <div className="text-center">
      <p className="mb-2 font-display font-bold text-slate-500">
        {round + 1} / {ROUNDS}
      </p>
      <motion.button
        onClick={() => speak(target, "id")}
        whileTap={{ scale: 0.9 }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="btn-squish mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-sunny-300 to-tangerine-400 text-6xl shadow-xl"
        aria-label={t("listen")}
      >
        🔊
      </motion.button>
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        {options.map((h) => {
          let cls = "bg-white text-slate-700";
          if (picked && h === target) cls = "bg-mint-400 text-white animate-pop";
          else if (picked === h) cls = "bg-berry-400 text-white animate-shake";
          return (
            <motion.button
              key={h}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => answer(h)}
              className={`btn-squish rounded-3xl py-6 font-display text-5xl font-extrabold uppercase shadow-lg ${cls}`}
            >
              {h}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
