"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";

interface Card {
  key: number;
  face: string;
  pairId: number;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Game 5: Memory Card — temukan kartu pasangan. */
export function MemoryGame({
  config,
  onFinish,
}: {
  config: { pasangan?: [string, string][] };
  onFinish: (correct: number, total: number) => void;
}) {
  const cards = useMemo<Card[]>(() => {
    const pairs = (config.pasangan?.length
      ? config.pasangan
      : ([["🐱", "🐱"], ["🐶", "🐶"], ["🐰", "🐰"], ["🦊", "🦊"]] as [string, string][])
    ).slice(0, 6);
    return shuffle(
      pairs.flatMap(([a, b], pairId) => [
        { key: pairId * 2, face: a, pairId },
        { key: pairId * 2 + 1, face: b, pairId },
      ])
    );
  }, [config]);

  const totalPairs = cards.length / 2;
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  const flip = (c: Card) => {
    if (lock || open.includes(c.key) || found.has(c.pairId)) return;
    sfx.flip();
    const next = [...open, c.key];
    setOpen(next);
    if (next.length === 2) {
      setLock(true);
      setMoves((m) => m + 1);
      const [a, b] = next.map((k) => cards.find((x) => x.key === k)!);
      if (a.pairId === b.pairId) {
        setTimeout(() => {
          sfx.correct();
          const nf = new Set(found).add(a.pairId);
          setFound(nf);
          setOpen([]);
          setLock(false);
          if (nf.size === totalPairs) {
            burstConfetti();
            // skor: makin sedikit langkah makin bagus
            const score = Math.max(totalPairs * 2 - (moves + 1), totalPairs);
            setTimeout(() => onFinish(Math.min(score, totalPairs * 2), totalPairs * 2), 900);
          }
        }, 500);
      } else {
        setTimeout(() => {
          sfx.wrong();
          setOpen([]);
          setLock(false);
        }, 900);
      }
    }
  };

  return (
    <div className="text-center">
      <p className="mb-3 font-display font-bold text-slate-500">🃏 {moves}x</p>
      <div className="mx-auto grid max-w-sm grid-cols-3 gap-3 sm:grid-cols-4">
        {cards.map((c) => {
          const isOpen = open.includes(c.key) || found.has(c.pairId);
          return (
            <motion.button
              key={c.key}
              whileTap={{ scale: 0.9 }}
              onClick={() => flip(c)}
              className="relative aspect-square [perspective:600px]"
            >
              <motion.div
                className="absolute inset-0 [transform-style:preserve-3d]"
                animate={{ rotateY: isOpen ? 180 : 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-grape-400 to-sky-500 text-3xl shadow-lg [backface-visibility:hidden]">
                  ❓
                </div>
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-2xl text-4xl shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    found.has(c.pairId) ? "bg-mint-100 ring-2 ring-mint-400" : "bg-white"
                  }`}
                >
                  {c.face}
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
