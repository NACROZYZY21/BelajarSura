"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Game 8: Urutkan Angka — ketuk angka sesuai urutan (kecil→besar atau sebaliknya). */
export function UrutkanAngka({
  config,
  onFinish,
}: {
  config: { jumlah?: number; min?: number; max?: number; arah?: "naik" | "turun" | "campur"; ronde?: number };
  onFinish: (correct: number, total: number) => void;
}) {
  const jumlah = Math.min(config.jumlah ?? 5, 8);
  const min = config.min ?? 1;
  const max = config.max ?? 20;
  const totalRonde = config.ronde ?? 5;

  const [ronde, setRonde] = useState(0);
  const [asc, setAsc] = useState(true);
  const [pool, setPool] = useState<number[]>([]);
  const [placedNums, setPlacedNums] = useState<number[]>([]);
  const [mistake, setMistake] = useState(false);
  const [perfect, setPerfect] = useState(0);
  const [wrongNum, setWrongNum] = useState<number | null>(null);

  const newRound = () => {
    const nums = new Set<number>();
    while (nums.size < jumlah) nums.add(min + Math.floor(Math.random() * (max - min + 1)));
    const dir = config.arah === "naik" ? true : config.arah === "turun" ? false : Math.random() < 0.5;
    setAsc(dir);
    setPool(shuffle([...nums]));
    setPlacedNums([]);
    setMistake(false);
    setWrongNum(null);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(newRound, [ronde]);

  const expected = () => {
    const remaining = pool.filter((n) => !placedNums.includes(n));
    return asc ? Math.min(...remaining) : Math.max(...remaining);
  };

  const tap = (n: number) => {
    if (placedNums.includes(n)) return;
    if (n === expected()) {
      sfx.click();
      const next = [...placedNums, n];
      setPlacedNums(next);
      if (next.length === pool.length) {
        sfx.correct();
        burstConfetti();
        const perfectRound = !mistake;
        if (perfectRound) setPerfect((p) => p + 1);
        setTimeout(() => {
          if (ronde + 1 >= totalRonde)
            onFinish(perfect + (perfectRound ? 1 : 0), totalRonde);
          else setRonde(ronde + 1);
        }, 1200);
      }
    } else {
      sfx.wrong();
      setMistake(true);
      setWrongNum(n);
      setTimeout(() => setWrongNum(null), 500);
    }
  };

  return (
    <div className="text-center">
      <p className="mb-1 font-display font-bold text-slate-500">
        {ronde + 1} / {totalRonde}
      </p>
      <p className="mb-4 font-display text-lg font-extrabold text-grape-500">
        {asc ? "⬆️ Kecil → Besar" : "⬇️ Besar → Kecil"}
      </p>

      {/* slot urutan */}
      <div className="mx-auto mb-6 flex max-w-md flex-wrap items-center justify-center gap-2 rounded-3xl bg-white/80 p-3 shadow-inner">
        {pool.map((_, i) => (
          <div
            key={i}
            className={`flex h-13 w-13 items-center justify-center rounded-2xl p-3 font-display text-2xl font-extrabold ${
              placedNums[i] !== undefined
                ? "animate-pop bg-mint-400 text-white"
                : "border-2 border-dashed border-slate-300 text-transparent"
            }`}
          >
            {placedNums[i] ?? "0"}
          </div>
        ))}
      </div>

      {/* angka acak */}
      <div className="mx-auto flex max-w-md flex-wrap justify-center gap-3">
        <AnimatePresence>
          {pool
            .filter((n) => !placedNums.includes(n))
            .map((n) => (
              <motion.button
                key={n}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.85 }}
                onClick={() => tap(n)}
                className={`btn-squish rounded-2xl px-5 py-4 font-display text-3xl font-extrabold shadow-lg ${
                  wrongNum === n
                    ? "animate-shake bg-berry-400 text-white"
                    : "bg-gradient-to-br from-grape-400 to-sky-500 text-white"
                }`}
              >
                {n}
              </motion.button>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
