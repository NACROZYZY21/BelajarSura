"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";

const ROUNDS = 6;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Game 4: Hitung Benda — hitung objek lucu, pilih angkanya. */
export function HitungBenda({
  config,
  onFinish,
}: {
  config: { max?: number; emoji?: string[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const max = Math.min(config.max ?? 10, 12);
  const emojiPool = config.emoji?.length ? config.emoji : ["🍎", "⭐", "🎈"];

  const [round, setRound] = useState(0);
  const [count, setCount] = useState(3);
  const [emoji, setEmoji] = useState("🍎");
  const [options, setOptions] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);

  const newRound = () => {
    const n = 1 + Math.floor(Math.random() * max);
    const em = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    const opts = new Set<number>([n]);
    while (opts.size < 4) {
      const alt = Math.max(1, n + Math.floor(Math.random() * 7) - 3);
      if (alt <= max + 2) opts.add(alt);
    }
    setCount(n);
    setEmoji(em);
    setOptions(shuffle([...opts]));
    setPicked(null);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(newRound, []);

  const answer = (n: number) => {
    if (picked !== null) return;
    setPicked(n);
    const benar = n === count;
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
      <p className="mb-3 font-display font-bold text-slate-500">
        {round + 1} / {ROUNDS}
      </p>
      <div className="mx-auto mb-6 flex min-h-36 max-w-sm flex-wrap items-center justify-center gap-2 rounded-3xl bg-white/85 p-5 shadow-lg">
        {Array.from({ length: count }).map((_, i) => (
          <motion.span
            key={`${round}-${i}`}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.08, type: "spring", bounce: 0.6 }}
            className="text-4xl"
          >
            {emoji}
          </motion.span>
        ))}
      </div>
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        {options.map((n) => {
          let cls = "bg-white text-slate-700";
          if (picked !== null && n === count) cls = "bg-mint-400 text-white animate-pop";
          else if (picked === n) cls = "bg-berry-400 text-white animate-shake";
          return (
            <motion.button
              key={n}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => answer(n)}
              className={`btn-squish rounded-3xl py-5 font-display text-4xl font-extrabold shadow-lg ${cls}`}
            >
              {n}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
