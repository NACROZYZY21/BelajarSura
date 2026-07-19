"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";
import { speak } from "@/lib/tts";

interface KataItem {
  kata: string;
  suku: string[];
  emoji: string;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Game 2: Susun Suku Kata — ketuk suku kata untuk menyusun kata. */
export function SusunSukuKata({
  config,
  onFinish,
}: {
  config: { kata?: KataItem[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const words = useMemo(
    () =>
      shuffle(
        config.kata?.length
          ? config.kata
          : [{ kata: "buku", suku: ["bu", "ku"], emoji: "📚" }]
      ),
    [config]
  );
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [pieces, setPieces] = useState<{ id: number; text: string }[]>([]);
  const [correct, setCorrect] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);

  const current = words[idx];

  useEffect(() => {
    setPlaced([]);
    setPieces(shuffle(current.suku.map((s, i) => ({ id: i, text: s }))));
  }, [current]);

  const tapPiece = (p: { id: number; text: string }) => {
    const expected = current.suku[placed.length];
    if (p.text === expected) {
      sfx.click();
      const newPlaced = [...placed, p.text];
      setPlaced(newPlaced);
      setPieces((ps) => ps.filter((x) => x.id !== p.id));
      if (newPlaced.length === current.suku.length) {
        sfx.correct();
        burstConfetti();
        speak(current.kata, "id");
        setCorrect((c) => c + 1);
        setTimeout(() => {
          if (idx + 1 >= words.length) onFinish(correct + 1, words.length);
          else setIdx(idx + 1);
        }, 1400);
      }
    } else {
      sfx.wrong();
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 500);
    }
  };

  return (
    <div className="text-center">
      <p className="mb-2 font-display font-bold text-slate-500">
        {idx + 1} / {words.length}
      </p>
      <motion.div
        key={current.kata}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="mb-4 text-7xl"
      >
        {current.emoji}
      </motion.div>

      {/* slot jawaban */}
      <div
        className={`mx-auto mb-6 flex min-h-16 max-w-sm items-center justify-center gap-2 rounded-3xl bg-white/80 p-3 shadow-inner ${wrongFlash ? "animate-shake" : ""}`}
      >
        {current.suku.map((s, i) => (
          <div
            key={i}
            className={`flex h-12 min-w-14 items-center justify-center rounded-2xl px-2 font-display text-2xl font-extrabold ${
              placed[i]
                ? "animate-pop bg-mint-400 text-white"
                : "border-2 border-dashed border-slate-300 text-transparent"
            }`}
          >
            {placed[i] ?? s}
          </div>
        ))}
      </div>

      {/* kepingan suku kata */}
      <div className="mx-auto flex max-w-sm flex-wrap justify-center gap-3">
        <AnimatePresence>
          {pieces.map((p) => (
            <motion.button
              key={p.id}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ y: -5, rotate: -3 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => tapPiece(p)}
              className="btn-squish rounded-2xl bg-gradient-to-br from-sky-300 to-sky-500 px-5 py-3 font-display text-2xl font-extrabold text-white shadow-lg"
            >
              {p.text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
