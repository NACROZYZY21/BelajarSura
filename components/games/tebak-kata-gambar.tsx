"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";
import { useI18n } from "@/lib/i18n";

interface Item {
  gambar_url?: string;
  emoji?: string;
  jawaban_id: string;
  jawaban_en: string;
}

const ABC = "abcdefghijklmnopqrstuvwxyz";
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Game 7: Tebak Kata dari Gambar — susun ejaan kata dari kepingan huruf. */
export function TebakKataGambar({
  config,
  onFinish,
}: {
  config: { items?: Item[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const { lang } = useI18n();
  const items = config.items?.length
    ? config.items
    : [{ emoji: "🍎", jawaban_id: "apel", jawaban_en: "apple" }];
  const [idx, setIdx] = useState(0);
  const [tiles, setTiles] = useState<{ id: number; ch: string }[]>([]);
  const [placed, setPlaced] = useState<{ id: number; ch: string }[]>([]);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);

  const item = items[idx];
  const answer = (lang === "id" ? item.jawaban_id : item.jawaban_en).toLowerCase().replace(/\s/g, "");

  useEffect(() => {
    // kepingan = huruf jawaban + 2 huruf pengecoh
    const letters = answer.split("");
    const distractors: string[] = [];
    while (distractors.length < 2) {
      const c = ABC[Math.floor(Math.random() * ABC.length)];
      if (!letters.includes(c)) distractors.push(c);
    }
    setTiles(shuffle([...letters, ...distractors]).map((ch, i) => ({ id: i, ch })));
    setPlaced([]);
    setFlash(null);
  }, [answer]);

  const tap = (tile: { id: number; ch: string }) => {
    if (flash === "ok") return;
    sfx.click();
    const next = [...placed, tile];
    setPlaced(next);
    setTiles((ts) => ts.filter((x) => x.id !== tile.id));
    if (next.length === answer.length) {
      const word = next.map((x) => x.ch).join("");
      if (word === answer) {
        sfx.correct();
        burstConfetti();
        setFlash("ok");
        setScore((s) => s + 1);
        setTimeout(() => {
          if (idx + 1 >= items.length) onFinish(score + 1, items.length);
          else setIdx(idx + 1);
        }, 1300);
      } else {
        sfx.wrong();
        setFlash("no");
        setTimeout(() => {
          // kembalikan semua kepingan
          setTiles((ts) => shuffle([...ts, ...next]));
          setPlaced([]);
          setFlash(null);
        }, 700);
      }
    }
  };

  const undo = () => {
    if (!placed.length || flash) return;
    sfx.flip();
    const last = placed[placed.length - 1];
    setPlaced(placed.slice(0, -1));
    setTiles((ts) => [...ts, last]);
  };

  return (
    <div className="text-center">
      <p className="mb-2 font-display font-bold text-slate-500">
        {idx + 1} / {items.length}
      </p>
      <motion.div
        key={idx}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="mb-5"
      >
        {item.gambar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.gambar_url}
            alt="tebak kata"
            className="mx-auto max-h-44 rounded-2xl shadow-md"
          />
        ) : (
          <span className="text-8xl">{item.emoji ?? "❓"}</span>
        )}
      </motion.div>

      {/* slot ejaan */}
      <div
        className={`mx-auto mb-6 flex min-h-14 max-w-md flex-wrap items-center justify-center gap-1.5 rounded-3xl bg-white/80 p-3 shadow-inner ${
          flash === "no" ? "animate-shake" : ""
        }`}
      >
        {Array.from({ length: answer.length }).map((_, i) => (
          <button
            key={i}
            onClick={undo}
            className={`flex h-11 w-9 items-center justify-center rounded-xl font-display text-2xl font-extrabold uppercase ${
              placed[i]
                ? flash === "ok"
                  ? "animate-pop bg-mint-400 text-white"
                  : "bg-sky-400 text-white"
                : "border-2 border-dashed border-slate-300"
            }`}
          >
            {placed[i]?.ch ?? ""}
          </button>
        ))}
      </div>

      {/* kepingan huruf */}
      <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2">
        <AnimatePresence>
          {tiles.map((tile) => (
            <motion.button
              key={tile.id}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ y: -4, rotate: -4 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => tap(tile)}
              className="btn-squish h-12 w-11 rounded-xl bg-gradient-to-br from-sunny-300 to-tangerine-400 font-display text-2xl font-extrabold uppercase text-white shadow-lg"
            >
              {tile.ch}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
